import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_AI_MODEL, type AiModelId } from '../logic/aiParser'
import { useApiKey } from '../state/apiKey'
import { runCoachTurn, type CoachMessage } from '../coach/agent'
import { STAGES, type Stage } from '../coach/playbook'
import { SOURCES } from '../coach/playbook'
import type { ScoredPlay } from '../coach/retrieval'
import SmartPasteAI from './money/SmartPasteAI'
import { Button, Card, IconArrowRight, IconInfo, inputClass, SectionTitle } from '../components/ui'

/**
 * The dating coach. He picks the stage he's at, describes the situation or
 * pastes what she wrote, and gets back a read, one line to send, and a note
 * on what to watch for — all built from his own playbook material.
 */

interface Turn extends CoachMessage {
  /** Plays the coach worked from, attached to assistant turns for inspection. */
  plays?: ScoredPlay[]
}

const PLACEHOLDER: Record<Stage, string> = {
  'top-of-funnel': "I'm getting almost no matches and I don't really go anywhere. Where do I start?",
  profile: 'Here are my current prompts — what should I swap?',
  opener: 'Matched with someone whose bio says she teaches 3rd grade and does trail runs. What do I open with?',
  texting: 'Paste the thread so far and I\'ll tell you where it went flat.',
  intrigue: "We've traded ~8 texts and it's pleasant but nothing's happening.",
  close: "Good exchange going. She just said she's free Thursday or Saturday.",
  revive: 'She stopped replying 5 days ago. Last message was mine.',
  ending: 'Two dates, no chemistry. How do I end it without being a jerk?',
}

/** Splits an assistant reply into prose and copyable line blocks. */
function segments(text: string): Array<{ type: 'text' | 'line'; value: string }> {
  const out: Array<{ type: 'text' | 'line'; value: string }> = []
  const re = /```[a-z]*\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    out.push({ type: 'line', value: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out.filter((s) => s.value.trim().length > 0)
}

function CopyableLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl bg-accent-wash border border-hairline p-3 my-2">
      <p className="text-sm text-ink whitespace-pre-wrap">{value}</p>
      <button
        className="mt-2 text-xs font-semibold text-accent-ink min-h-9"
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }}
      >
        {copied ? 'Copied' : 'Copy this line'}
      </button>
    </div>
  )
}

function WorkedFrom({ plays }: { plays: ScoredPlay[] }) {
  const [open, setOpen] = useState(false)
  if (plays.length === 0) return null
  return (
    <div className="mt-2">
      <button className="text-[11px] text-muted min-h-8" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Worked from'} {plays.length} play{plays.length === 1 ? '' : 's'}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {plays.map(({ play }) => (
            <li key={play.id} className="text-[11px] text-ink-2">
              <span className="font-medium">{play.title}</span> — {SOURCES[play.source]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Coach() {
  const apiKey = useApiKey()
  const settings = useLiveQuery(() => db.settings.get('main'))
  const model = (settings?.aiModel ?? DEFAULT_AI_MODEL) as AiModelId

  const [stage, setStage] = useState<Stage>('opener')
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, streaming])

  async function send() {
    const content = input.trim()
    if (!content || !apiKey || streaming) return

    const next: Turn[] = [...turns, { role: 'user', content }]
    setTurns([...next, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    setError(null)

    try {
      const result = await runCoachTurn({
        apiKey,
        model,
        stage,
        messages: next.map(({ role, content }) => ({ role, content })),
        onDelta: (chunk) =>
          setTurns((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + chunk }
            return copy
          }),
      })
      setTurns((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: result.text, plays: result.plays }
        return copy
      })
    } catch (e) {
      setTurns(next)
      setError(e instanceof Error ? e.message : 'Something went wrong reaching the coach.')
    } finally {
      setStreaming(false)
    }
  }

  if (!apiKey) {
    return (
      <>
        <Card>
          <SectionTitle hint="Coaching built from your own playbook — the Mark Sing texting and dating docs. It reads the situation, hands you one line to send, and tells you when a line you wrote is going to cost you.">
            Dating coach
          </SectionTitle>
          <p className="text-sm text-ink-2 flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0"><IconInfo /></span>
            Add your Anthropic key below to start. Same key as Smart-Paste — it goes straight from this device
            to Anthropic, and nothing you type here is stored or sent anywhere else.
          </p>
        </Card>
        <SmartPasteAI />
      </>
    )
  }

  return (
    <>
      <Card>
        <SectionTitle hint="Pick where you are, then describe it or paste what she wrote.">
          Dating coach
        </SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              aria-pressed={stage === s.id}
              className={`min-h-9 px-3 rounded-full text-xs font-medium border ${
                stage === s.id
                  ? 'bg-accent-wash border-hairline text-accent-ink'
                  : 'border-hairline text-ink-2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">{STAGES.find((s) => s.id === stage)?.hint}</p>
      </Card>

      {turns.length > 0 && (
        <div className="space-y-3">
          {turns.map((turn, i) =>
            turn.role === 'user' ? (
              <div key={i} className="ml-8 rounded-2xl bg-accent-wash px-3 py-2">
                <p className="text-sm text-ink whitespace-pre-wrap">{turn.content}</p>
              </div>
            ) : (
              <Card key={i} className="mr-4">
                {turn.content ? (
                  <>
                    {segments(turn.content).map((seg, j) =>
                      seg.type === 'line' ? (
                        <CopyableLine key={j} value={seg.value} />
                      ) : (
                        <p key={j} className="text-sm text-ink whitespace-pre-wrap">
                          {seg.value.trim()}
                        </p>
                      ),
                    )}
                    {turn.plays && <WorkedFrom plays={turn.plays} />}
                  </>
                ) : (
                  <p className="text-sm text-muted">Reading the situation…</p>
                )}
              </Card>
            ),
          )}
          <div ref={endRef} />
        </div>
      )}

      <Card>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          rows={4}
          placeholder={PLACEHOLDER[stage]}
          className={`${inputClass} py-2 resize-y`}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">
            {turns.length > 0 ? `${turns.filter((t) => t.role === 'user').length} in this thread` : 'Nothing is saved'}
          </span>
          <div className="flex gap-2">
            {turns.length > 0 && (
              <Button variant="outline" onClick={() => { setTurns([]); setError(null) }} disabled={streaming}>
                New thread
              </Button>
            )}
            <Button onClick={send} disabled={!input.trim() || streaming}>
              {streaming ? 'Thinking…' : <span className="inline-flex items-center gap-1.5">Ask <IconArrowRight /></span>}
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-critical-ink">{error}</p>}
      </Card>
    </>
  )
}

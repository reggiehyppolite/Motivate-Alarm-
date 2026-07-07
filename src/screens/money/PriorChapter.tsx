import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { archiveChapter, parseChapter } from '../../db/chapter'
import { summarizeChapter } from '../../logic/chapter'
import { fmtShort, todayISO } from '../../logic/dates'
import { fmtMoney } from '../../logic/money'
import { Button, Card, Field, IconCheck, IconShield, SectionTitle, TextInput } from '../../components/ui'

function download(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function PriorChapter() {
  const archives = useLiveQuery(() => db.archive.orderBy('archivedAt').reverse().toArray())
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)

  return (
    <Card>
      <SectionTitle hint="A fresh start that archives instead of deleting. Your history moves into a locked vault — the audit trail survives, the dashboard starts clean.">
        Prior Chapter vault
      </SectionTitle>

      {(archives?.length ?? 0) > 0 && (
        <ul className="mb-4 space-y-3">
          {archives!.map((entry) => {
            const s = summarizeChapter(parseChapter(entry))
            return (
              <li key={entry.id} className="border border-hairline rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink truncate">{entry.label}</p>
                  <span className="text-[11px] text-muted shrink-0">
                    {new Date(entry.archivedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-ink-2 mt-1">
                  {s.txnCount} transactions · {s.incomeCount} income entries · {s.impulseCount} impulses
                  {s.moneyKept > 0 && <> · {fmtMoney(s.moneyKept)} kept by skipping</>}
                  {s.firstDate && s.lastDate && (
                    <> · {fmtShort(s.firstDate)} – {fmtShort(s.lastDate)}</>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      download(
                        `forward-focus-chapter-${entry.archivedAt.slice(0, 10)}.json`,
                        entry.payload,
                      )
                    }
                  >
                    Export JSON
                  </Button>
                  {confirmDelete === entry.id ? (
                    <Button
                      variant="danger-outline"
                      className="flex-1"
                      onClick={async () => {
                        await db.archive.delete(entry.id!)
                        setConfirmDelete(null)
                        setNote('Chapter deleted. (Exports you downloaded are unaffected.)')
                      }}
                    >
                      Really delete?
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(entry.id!)}>
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!open ? (
        <Button variant="quiet" onClick={() => { setLabel(`Prior Chapter — ${todayISO()}`); setOpen(true) }}>
          Start a fresh chapter
        </Button>
      ) : (
        <div className="space-y-3 border-t border-hairline pt-3">
          <div className="text-sm text-ink-2 space-y-2">
            <p className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-accent-ink"><IconShield /></span>
              <span>
                <strong className="text-ink">Moves to the vault:</strong> transactions, income history,
                impulse log, and means-test months. Nothing is deleted — you can view and export it anytime.
              </span>
            </p>
            <p className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-good-ink"><IconCheck /></span>
              <span>
                <strong className="text-ink">Stays active:</strong> your bills, paycheck setup, cash on hand,
                buffer, and settings — present-day reality carries forward.
              </span>
            </p>
          </div>
          <Field label="Name this chapter">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            I understand my history moves to the vault and the dashboard starts clean.
          </label>
          <div className="flex gap-2">
            <Button
              disabled={!understood}
              onClick={async () => {
                await archiveChapter(label)
                setOpen(false)
                setUnderstood(false)
                setNote('Fresh chapter started. The old one is safe in the vault above.')
              }}
            >
              Archive & start fresh
            </Button>
            <Button variant="outline" onClick={() => { setOpen(false); setUnderstood(false) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {note && (
        <p className="mt-3 text-sm text-good-ink flex items-center gap-1.5">
          <IconCheck /> {note}
        </p>
      )}
    </Card>
  )
}

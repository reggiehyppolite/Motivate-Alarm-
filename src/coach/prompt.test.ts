import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, renderPlays, stageLabel } from './prompt'
import { retrievePlays } from './retrieval'
import { PRINCIPLES, playById } from './playbook'
import { retrievalTextFor } from './agent'

describe('stageLabel', () => {
  it('names a known stage', () => {
    expect(stageLabel('close')).toBe('Asking her out')
  })

  it('falls back when there is no stage', () => {
    expect(stageLabel(undefined)).toBe('general')
  })
})

describe('renderPlays', () => {
  it('includes the source doc so advice stays traceable', () => {
    const out = renderPlays(retrievePlays('she stopped replying', 'revive'))
    expect(out).toContain('MESSAGE TO SEND WHEN A GIRL FALLS OFF')
  })

  it('carries the caution through when a play has one', () => {
    const play = playById('rocket')!
    expect(play.caution).toBeDefined()
    expect(renderPlays([{ play, score: 9, contentScore: 5, matched: [] }])).toContain('When it backfires')
  })

  it('tells the model to fall back when nothing matched', () => {
    expect(renderPlays([])).toContain('principles')
  })
})

describe('buildSystemPrompt', () => {
  const plays = retrievePlays('I want to ask her out for drinks', 'close')

  it('carries every principle', () => {
    const prompt = buildSystemPrompt({ stage: 'close', situation: 'ask her out', plays })
    for (const p of PRINCIPLES) expect(prompt).toContain(p)
  })

  it('injects the retrieved play body verbatim', () => {
    const prompt = buildSystemPrompt({ stage: 'close', situation: 'ask her out', plays })
    expect(prompt).toContain('Being pen pals is fun')
  })

  it('requires the play to be named and the line to be copyable', () => {
    const prompt = buildSystemPrompt({ stage: 'close', situation: 'ask her out', plays })
    expect(prompt).toContain('Name the play you used')
    expect(prompt).toContain('code block')
  })

  it('keeps the guardrail about reading a no as a maybe', () => {
    const prompt = buildSystemPrompt({ stage: 'close', situation: 'ask her out', plays })
    expect(prompt).toContain('reading a no as a maybe')
  })
})

describe('retrievalTextFor', () => {
  it('uses the last three user turns and ignores assistant turns', () => {
    const text = retrievalTextFor([
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'coach reply' },
      { role: 'user', content: 'two' },
      { role: 'user', content: 'three' },
      { role: 'user', content: 'four' },
    ])
    expect(text).toBe('two\nthree\nfour')
    expect(text).not.toContain('coach reply')
  })

  it('keeps earlier context in play for retrieval', () => {
    const messages = [
      { role: 'user' as const, content: 'she stopped replying after our date' },
      { role: 'assistant' as const, content: '...' },
      { role: 'user' as const, content: 'still nothing' },
    ]
    const ids = retrievePlays(retrievalTextFor(messages), 'texting').map((s) => s.play.id)
    expect(ids).toContain('she-fell-off')
  })
})

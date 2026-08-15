import { describe, expect, it } from 'vitest'
import { normalize, retrievePlays, scorePlay, STAGE_WEIGHT, TAG_WEIGHT } from './retrieval'
import { PLAYS, playById, playsForStage } from './playbook'

const ids = (list: ReturnType<typeof retrievePlays>) => list.map((s) => s.play.id)

describe('normalize', () => {
  it('strips punctuation and pads for whole-phrase matching', () => {
    expect(normalize("She hasn't replied!")).toBe(' she hasn t replied ')
  })
})

describe('scorePlay', () => {
  it('scores a tag hit', () => {
    const play = playById('she-fell-off')!
    const { score, matched } = scorePlay(play, 'she stopped replying to me')
    expect(matched).toContain('stopped replying')
    expect(score).toBeGreaterThanOrEqual(TAG_WEIGHT)
  })

  it('adds the stage prior only for the matching stage', () => {
    const play = playById('hangout-template')!
    const withStage = scorePlay(play, 'no keywords here', 'close').score
    const withoutStage = scorePlay(play, 'no keywords here', 'opener').score
    expect(withStage - withoutStage).toBe(STAGE_WEIGHT)
  })

  it('does not match a tag inside a larger word', () => {
    const play = playById('hangout-template')!
    // "date" must not fire on "candidate"
    expect(scorePlay(play, 'I am a candidate for the job').matched).not.toContain('date')
  })

  it('scores nothing for an unrelated situation', () => {
    const play = playById('break-it-off')!
    expect(scorePlay(play, 'where should I go rock climbing').score).toBe(0)
  })
})

describe('retrievePlays', () => {
  it('pulls the revival play when she goes quiet', () => {
    expect(ids(retrievePlays('she stopped replying three days ago', 'texting'))).toContain('she-fell-off')
  })

  it('pulls the hangout template when he wants to ask her out', () => {
    expect(ids(retrievePlays('I think I should ask her out for drinks', 'close'))[0]).toBe('hangout-template')
  })

  it('lets a strong keyword match beat the stage prior', () => {
    // On the opener tab, but describing a dead thread.
    const top = ids(retrievePlays('she ghosted me and stopped replying, thread is dead', 'opener'))
    expect(top).toContain('she-fell-off')
  })

  it('falls back to the stage plays when nothing matches', () => {
    const out = retrievePlays('zzzz', 'profile')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => s.play.stage === 'profile')).toBe(true)
    expect(out.every((s) => s.score === 0)).toBe(true)
  })

  it('returns nothing when there is no match and no stage', () => {
    expect(retrievePlays('zzzz')).toEqual([])
  })

  it('respects the limit', () => {
    expect(retrievePlays('she stopped replying, should I ask her out for drinks', 'close', 2)).toHaveLength(2)
  })

  it('is deterministic for the same input', () => {
    const a = ids(retrievePlays('first message for a hinge match', 'opener'))
    const b = ids(retrievePlays('first message for a hinge match', 'opener'))
    expect(a).toEqual(b)
  })
})

describe('playbook integrity', () => {
  it('has unique ids', () => {
    expect(new Set(PLAYS.map((p) => p.id)).size).toBe(PLAYS.length)
  })

  it('gives every play at least one tag and a body', () => {
    for (const p of PLAYS) {
      expect(p.tags.length, `${p.id} has no tags`).toBeGreaterThan(0)
      expect(p.body.trim().length, `${p.id} has no body`).toBeGreaterThan(0)
    }
  })

  it('covers every stage the UI offers', () => {
    for (const stage of ['top-of-funnel', 'profile', 'opener', 'texting', 'intrigue', 'close', 'revive', 'ending'] as const) {
      expect(playsForStage(stage).length, `${stage} has no plays`).toBeGreaterThan(0)
    }
  })
})

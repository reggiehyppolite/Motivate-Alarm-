import { describe, expect, it } from 'vitest'
import { nextMove, type NextMoveInput } from './nextMove'

const base: NextMoveInput = {
  hasCash: true,
  hasPaycheck: true,
  shortfall: null,
  pendingTxnCount: 0,
  missingMeansMonths: [],
  expiredImpulses: [],
}

describe('nextMove priority', () => {
  it('setup beats everything', () => {
    const r = nextMove({ ...base, hasCash: false, shortfall: { name: 'Rent', date: '2026-07-15', amount: 1200, balanceAfter: -700 } })
    expect(r.kind).toBe('setup')
  })

  it('shortfall beats confirms and means months', () => {
    const r = nextMove({
      ...base,
      shortfall: { name: 'Rent', date: '2026-07-15', amount: 1200, balanceAfter: -700 },
      pendingTxnCount: 3,
      missingMeansMonths: ['June 2026'],
    })
    expect(r.kind).toBe('shortfall')
    expect(r.title).toContain('Rent')
    expect(r.detail).toContain('$700')
  })

  it('confirms beat means months; means months beat impulses', () => {
    expect(nextMove({ ...base, pendingTxnCount: 2, missingMeansMonths: ['June 2026'] }).kind).toBe('confirm')
    expect(
      nextMove({ ...base, missingMeansMonths: ['June 2026'], expiredImpulses: [{ description: 'Keyboard', amount: 150 }] }).kind,
    ).toBe('means-month')
  })

  it('expired impulse surfaces for decision', () => {
    const r = nextMove({ ...base, expiredImpulses: [{ description: 'Keyboard', amount: 150 }] })
    expect(r.kind).toBe('impulse')
    expect(r.title).toContain('Keyboard')
  })

  it('all clear is an explicit win state', () => {
    expect(nextMove(base).kind).toBe('clear')
  })
})

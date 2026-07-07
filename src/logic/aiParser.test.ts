import { describe, expect, it } from 'vitest'
import { validateAiTransactions } from './aiParser'

describe('validateAiTransactions', () => {
  it('accepts well-formed model output and normalizes amounts', () => {
    const out = validateAiTransactions({
      transactions: [
        {
          description: 'Starbucks',
          amount: -6.451, // sign and precision normalized deterministically
          direction: 'debit',
          date: '2026-07-01',
          source_line: '07/01 STARBUCKS #1234 6.45 1,234.56',
        },
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ amount: 6.45, direction: 'debit', date: '2026-07-01' })
    expect(out[0].snippet).toContain('STARBUCKS')
  })

  it('rejects hallucinated or malformed entries', () => {
    const out = validateAiTransactions({
      transactions: [
        { description: 'No amount', amount: 'twelve', direction: 'debit', date: null, source_line: 'x' },
        { description: 'Zero', amount: 0, direction: 'debit', date: null, source_line: 'x' },
        { description: 'Bad direction', amount: 5, direction: 'sideways', date: null, source_line: 'x' },
        { description: '', amount: 5, direction: 'debit', date: null, source_line: 'x' },
        { description: 'Absurd', amount: 5e12, direction: 'debit', date: null, source_line: 'x' },
      ],
    })
    expect(out).toHaveLength(0)
  })

  it('nulls out invented or impossible dates instead of trusting them', () => {
    const out = validateAiTransactions({
      transactions: [
        { description: 'Bad date', amount: 5, direction: 'debit', date: '2026-02-30', source_line: 'x' },
        { description: 'Weird format', amount: 5, direction: 'debit', date: '07/01/2026', source_line: 'x' },
        { description: 'Good date', amount: 5, direction: 'credit', date: '2026-02-28', source_line: 'x' },
      ],
    })
    expect(out.map((t) => t.date)).toEqual([null, null, '2026-02-28'])
  })

  it('returns empty for junk shapes', () => {
    expect(validateAiTransactions(null)).toEqual([])
    expect(validateAiTransactions('nope')).toEqual([])
    expect(validateAiTransactions({ transactions: 'nope' })).toEqual([])
    expect(validateAiTransactions({})).toEqual([])
  })
})

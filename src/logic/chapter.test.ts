import { describe, expect, it } from 'vitest'
import { summarizeChapter, type ChapterPayload } from './chapter'

function payload(overrides: Partial<ChapterPayload> = {}): ChapterPayload {
  return {
    v: 1,
    archivedAt: '2026-07-07T12:00:00Z',
    cashAtArchive: 500,
    transactions: [],
    incomeEvents: [],
    impulses: [],
    meansMonths: [],
    ...overrides,
  }
}

describe('summarizeChapter', () => {
  it('counts records, sums money kept from skipped impulses only, and finds the date range', () => {
    const s = summarizeChapter(
      payload({
        transactions: [
          { date: '2026-03-05', amount: 10, description: 'a', direction: 'debit', origin: 'manual', status: 'confirmed' },
          { date: '2026-06-01', amount: 20, description: 'b', direction: 'debit', origin: 'manual', status: 'confirmed' },
        ],
        incomeEvents: [
          { date: '2026-01-15', grossAmount: 2000, netAmount: 1500, source: 'Paycheck', kind: 'base' },
        ],
        impulses: [
          { description: 'kept', amount: 49.99, freq: 'once', createdAt: '', decision: 'skipped' },
          { description: 'bought', amount: 100, freq: 'once', createdAt: '', decision: 'bought' },
        ],
        meansMonths: [{ key: '2026-01', gross: 2000 }],
      }),
    )
    expect(s.txnCount).toBe(2)
    expect(s.incomeCount).toBe(1)
    expect(s.impulseCount).toBe(2)
    expect(s.meansMonthCount).toBe(1)
    expect(s.moneyKept).toBe(49.99)
    expect(s.firstDate).toBe('2026-01-15')
    expect(s.lastDate).toBe('2026-06-01')
  })

  it('handles an empty chapter', () => {
    const s = summarizeChapter(payload())
    expect(s.txnCount).toBe(0)
    expect(s.moneyKept).toBe(0)
    expect(s.firstDate).toBeNull()
    expect(s.lastDate).toBeNull()
  })
})

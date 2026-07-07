import { describe, expect, it } from 'vitest'
import { parseBankText } from './parser'

describe('parseBankText', () => {
  it('parses "date description amount balance" rows, taking the txn amount not the balance', () => {
    const rows = parseBankText(
      `07/01 STARBUCKS #1234 DENVER CO 6.45 1,234.56\n07/02 KING SOOPERS 0042 87.12 1,147.44`,
      { defaultYear: 2026 },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ amount: 6.45, direction: 'debit', date: '2026-07-01' })
    expect(rows[0].description).toContain('STARBUCKS')
    expect(rows[1]).toMatchObject({ amount: 87.12, date: '2026-07-02' })
  })

  it('detects credits from keywords, minus signs, and CR suffix', () => {
    const rows = parseBankText(
      `07/03 PAYROLL DIRECT DEP ACME LLC $1,800.00\n07/05 AMAZON REFUND 23.99\n07/06 VENDING -3.50\nJul 8 INTEREST PAID 0.42 CR`,
      { defaultYear: 2026 },
    )
    expect(rows.map((r) => r.direction)).toEqual(['credit', 'credit', 'credit', 'credit'])
    expect(rows[0].amount).toBe(1800)
    expect(rows[3].date).toBe('2026-07-08')
  })

  it('handles $ signs, word dates with year, and keeps the snippet', () => {
    const rows = parseBankText(`Mar 3, 2026  COMCAST CABLE  $89.99`)
    expect(rows[0]).toMatchObject({ amount: 89.99, date: '2026-03-03', direction: 'debit' })
    expect(rows[0].snippet).toContain('COMCAST')
  })

  it('skips lines without a parseable amount and blank lines', () => {
    const rows = parseBankText(`Pending transactions\n\n07/04 TARGET 45.00\nEnd of statement`)
    expect(rows).toHaveLength(1)
    expect(rows[0].description).toContain('TARGET')
  })

  it('never invents a date when none is present', () => {
    const rows = parseBankText(`SPOTIFY PREMIUM 11.99`)
    expect(rows[0].date).toBeNull()
    expect(rows[0].amount).toBe(11.99)
  })
})

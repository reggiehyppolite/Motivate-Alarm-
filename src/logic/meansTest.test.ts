import { describe, expect, it } from 'vitest'
import { CO_MEDIAN_1_PERSON, lookbackMonths, meansTest } from './meansTest'

describe('lookbackMonths', () => {
  it('returns the 6 full months before the filing month', () => {
    expect(lookbackMonths('2026-07-07').map((m) => m.key)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    ])
  })

  it('crosses the year boundary', () => {
    expect(lookbackMonths('2026-03-15').map((m) => m.key)).toEqual([
      '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    ])
  })

  it('filing on the 1st still excludes the filing month', () => {
    const months = lookbackMonths('2026-01-01')
    expect(months[0].key).toBe('2025-07')
    expect(months[5].key).toBe('2025-12')
    expect(months[5].label).toBe('December 2025')
  })
})

describe('meansTest', () => {
  it('under median: CMI ×12 ≤ median', () => {
    const r = meansTest([5000, 5000, 5000, 5000, 5000, 5000], CO_MEDIAN_1_PERSON)
    expect(r.complete).toBe(true)
    expect(r.cmi).toBe(5000)
    expect(r.annualized).toBe(60000)
    expect(r.under).toBe(true)
    expect(r.margin).toBe(27940)
  })

  it('over median flips the verdict', () => {
    const r = meansTest([8000, 8000, 8000, 8000, 8000, 8000], CO_MEDIAN_1_PERSON)
    expect(r.annualized).toBe(96000)
    expect(r.under).toBe(false)
    expect(r.margin).toBe(-8060)
  })

  it('exactly at median counts as under (form says "less than or equal")', () => {
    const monthly = CO_MEDIAN_1_PERSON / 12
    const r = meansTest(Array(6).fill(monthly), CO_MEDIAN_1_PERSON)
    expect(r.under).toBe(true)
  })

  it('incomplete months divide by 6 regardless (form logic) and flag incomplete', () => {
    const r = meansTest([5000, 5000, 5000, null, null, null], CO_MEDIAN_1_PERSON)
    expect(r.complete).toBe(false)
    expect(r.monthsEntered).toBe(3)
    expect(r.cmi).toBe(2500)
  })
})

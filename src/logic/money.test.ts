import { describe, expect, it } from 'vitest'
import {
  annualize,
  billOccurrences,
  fmtMoney,
  nextPaydays,
  runway,
  safeToSpend,
  type Bill,
  type Paycheck,
} from './money'

const biweekly: Paycheck = { amount: 1800, frequency: 'biweekly', nextDate: '2026-07-10' }

function bill(partial: Partial<Bill> & Pick<Bill, 'name' | 'amount'>): Bill {
  return { recurrence: 'monthly', dueDay: 1, autopay: false, active: true, ...partial }
}

describe('nextPaydays', () => {
  it('rolls a stale biweekly nextDate forward', () => {
    const p: Paycheck = { amount: 1000, frequency: 'biweekly', nextDate: '2026-06-12' }
    expect(nextPaydays(p, '2026-07-07', 2)).toEqual(['2026-07-10', '2026-07-24'])
  })

  it('weekly steps by 7 days', () => {
    const p: Paycheck = { amount: 500, frequency: 'weekly', nextDate: '2026-07-08' }
    expect(nextPaydays(p, '2026-07-07', 3)).toEqual(['2026-07-08', '2026-07-15', '2026-07-22'])
  })

  it('monthly clamps to month end', () => {
    const p: Paycheck = { amount: 3000, frequency: 'monthly', nextDate: '2026-01-31' }
    expect(nextPaydays(p, '2026-02-01', 2)).toEqual(['2026-02-28', '2026-03-31'])
  })

  it('semimonthly emits both anchor days per month', () => {
    const p: Paycheck = { amount: 1500, frequency: 'semimonthly', nextDate: '2026-07-15' }
    expect(nextPaydays(p, '2026-07-16', 3)).toEqual(['2026-07-30', '2026-08-15', '2026-08-30'])
  })

  it('includes today when payday is today and from=today', () => {
    expect(nextPaydays(biweekly, '2026-07-10', 1)).toEqual(['2026-07-10'])
  })
})

describe('billOccurrences', () => {
  it('expands monthly bills, inclusive window, clamped day', () => {
    const bills = [bill({ name: 'Rent', amount: 1200, dueDay: 1 }), bill({ name: 'Card', amount: 55, dueDay: 31 })]
    const occ = billOccurrences(bills, '2026-02-01', '2026-03-01')
    expect(occ.map((o) => [o.name, o.date])).toEqual([
      ['Rent', '2026-02-01'],
      ['Card', '2026-02-28'],
      ['Rent', '2026-03-01'],
    ])
  })

  it('weekly bills repeat from anchor; once bills appear once; inactive skipped', () => {
    const bills = [
      bill({ name: 'Gym', amount: 15, recurrence: 'weekly', dueDay: undefined, dueDate: '2026-07-02' }),
      bill({ name: 'DMV', amount: 90, recurrence: 'once', dueDay: undefined, dueDate: '2026-07-12' }),
      bill({ name: 'Old', amount: 999, active: false }),
    ]
    const occ = billOccurrences(bills, '2026-07-07', '2026-07-20')
    expect(occ.map((o) => [o.name, o.date])).toEqual([
      ['Gym', '2026-07-09'],
      ['DMV', '2026-07-12'],
      ['Gym', '2026-07-16'],
    ])
  })
})

describe('safeToSpend', () => {
  const bills = [
    bill({ name: 'Rent', amount: 1200, dueDay: 1 }),
    bill({ name: 'Internet', amount: 80, dueDay: 9, autopay: true }),
    bill({ name: 'Insurance', amount: 140, dueDay: 24 }),
  ]

  it('protects bills through payday (inclusive), buffer, and savings', () => {
    const r = safeToSpend({
      cash: 900,
      bills,
      paycheck: biweekly, // next payday 2026-07-10
      bufferFloor: 200,
      savingsPerPeriod: 50,
      today: '2026-07-07',
    })
    // window 07-07..07-10: Internet (9th) = 80; bill ON payday would count too
    expect(r.nextPayday).toBe('2026-07-10')
    expect(r.billsDue).toBe(80)
    expect(r.safe).toBe(900 - 80 - 200 - 50)
  })

  it('counts a bill landing exactly on payday', () => {
    const onPayday = [bill({ name: 'Loan', amount: 300, dueDay: 10 })]
    const r = safeToSpend({
      cash: 500,
      bills: onPayday,
      paycheck: biweekly,
      bufferFloor: 0,
      savingsPerPeriod: 0,
      today: '2026-07-07',
    })
    expect(r.billsDue).toBe(300)
  })

  it('goes negative honestly', () => {
    const r = safeToSpend({
      cash: 100,
      bills,
      paycheck: biweekly,
      bufferFloor: 200,
      savingsPerPeriod: 0,
      today: '2026-07-07',
    })
    expect(r.safe).toBe(100 - 80 - 200)
    expect(r.safe).toBeLessThan(0)
  })

  it('falls back to a 14-day window with no paycheck configured', () => {
    const r = safeToSpend({
      cash: 2000,
      bills,
      paycheck: null,
      bufferFloor: 0,
      savingsPerPeriod: 0,
      today: '2026-07-07',
    })
    expect(r.nextPayday).toBeNull()
    expect(r.windowEnd).toBe('2026-07-21')
    expect(r.billsDue).toBe(80) // Internet on the 9th only
  })
})

describe('runway', () => {
  it('simulates balances, marks shortfalls, and lands paychecks', () => {
    const bills = [
      bill({ name: 'Internet', amount: 80, dueDay: 9, autopay: true }),
      bill({ name: 'Rent', amount: 1200, dueDay: 15 }),
    ]
    const r = runway({ cash: 300, bills, paycheck: biweekly, today: '2026-07-07' })
    // events: Internet 7/9 (300-80=220 ok), payday 7/10 (+1800=2020),
    // Rent 7/15 (820 ok), payday 7/24
    expect(r.items.map((x) => [x.name, x.date, x.covered])).toEqual([
      ['Internet', '2026-07-09', true],
      ['Paycheck', '2026-07-10', true],
      ['Rent', '2026-07-15', true],
      ['Paycheck', '2026-07-24', true],
    ])
    expect(r.firstShortfall).toBeNull()
    expect(r.billsBeforePayday).toBe(1)
    expect(r.coveredBeforePayday).toBe(1)
  })

  it('flags the first uncovered bill; same-day bill hits before the paycheck', () => {
    const bills = [bill({ name: 'Rent', amount: 1200, dueDay: 10 })]
    const r = runway({ cash: 500, bills, paycheck: biweekly, today: '2026-07-07' })
    const rent = r.items.find((x) => x.name === 'Rent')!
    expect(rent.covered).toBe(false)
    expect(rent.balanceAfter).toBe(-700)
    expect(r.firstShortfall?.name).toBe('Rent')
    // paycheck lands after the same-day bill in the simulation
    expect(r.items.map((x) => x.kind)).toEqual(['bill', 'payday', 'payday'])
  })
})

describe('annualize', () => {
  it('handles all presets', () => {
    expect(annualize(7.5, 'once')).toBe(7.5)
    expect(annualize(6, 'daily')).toBe(2190)
    expect(annualize(25, 'weekly')).toBe(1300)
    expect(annualize(15.99, 'monthly')).toBe(191.88)
  })
})

describe('fmtMoney', () => {
  it('formats whole dollars, cents, and negatives', () => {
    expect(fmtMoney(1234)).toBe('$1,234')
    expect(fmtMoney(1234.5)).toBe('$1,234.50')
    expect(fmtMoney(-42, { cents: true })).toBe('−$42.00')
  })
})

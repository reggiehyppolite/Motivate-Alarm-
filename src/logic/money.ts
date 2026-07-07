import { addDays, cmp, daysInMonth, parseISO, toISO, type ISODate } from './dates'

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface Paycheck {
  /** take-home (net) amount per check — what actually lands */
  amount: number
  /** gross per check, used to prefill means-test months */
  gross?: number
  frequency: PayFrequency
  nextDate: ISODate
}

export type BillRecurrence = 'monthly' | 'weekly' | 'once'

export interface Bill {
  id?: number
  name: string
  amount: number
  recurrence: BillRecurrence
  /** day of month, for monthly bills */
  dueDay?: number
  /** anchor/one-time date, for weekly and once bills */
  dueDate?: ISODate
  autopay: boolean
  active: boolean
}

export interface BillOccurrence {
  billId: number | undefined
  name: string
  amount: number
  date: ISODate
  autopay: boolean
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function semimonthlyDays(anchorDay: number, year: number, month1: number): number[] {
  const dim = daysInMonth(year, month1)
  const other = anchorDay <= 15 ? anchorDay + 15 : anchorDay - 15
  const d1 = Math.min(anchorDay, dim)
  const d2 = Math.min(other, dim)
  return d1 === d2 ? [d1] : [Math.min(d1, d2), Math.max(d1, d2)]
}

/** Future paydays on/after `from`, never before the configured nextDate. */
export function nextPaydays(p: Paycheck, from: ISODate, count: number): ISODate[] {
  const out: ISODate[] = []
  const floor = cmp(from, p.nextDate) > 0 ? from : p.nextDate
  if (p.frequency === 'weekly' || p.frequency === 'biweekly') {
    const step = p.frequency === 'weekly' ? 7 : 14
    let d = p.nextDate
    while (cmp(d, floor) < 0) d = addDays(d, step)
    while (out.length < count) {
      out.push(d)
      d = addDays(d, step)
    }
    return out
  }
  const anchor = parseISO(p.nextDate)
  const anchorDay = anchor.getDate()
  let y = anchor.getFullYear()
  let m0 = anchor.getMonth() // 0-based
  let guard = 0
  while (out.length < count && guard++ < 240) {
    const days =
      p.frequency === 'monthly'
        ? [Math.min(anchorDay, daysInMonth(y, m0 + 1))]
        : semimonthlyDays(anchorDay, y, m0 + 1)
    for (const day of days) {
      const d = toISO(new Date(y, m0, day))
      if (cmp(d, floor) >= 0 && out.length < count) out.push(d)
    }
    m0++
    if (m0 > 11) {
      m0 = 0
      y++
    }
  }
  return out
}

/** Expand active bills into dated occurrences within [from, to] inclusive. */
export function billOccurrences(bills: Bill[], from: ISODate, to: ISODate): BillOccurrence[] {
  const out: BillOccurrence[] = []
  for (const b of bills) {
    if (!b.active) continue
    if (b.recurrence === 'once') {
      if (b.dueDate && cmp(b.dueDate, from) >= 0 && cmp(b.dueDate, to) <= 0) {
        out.push({ billId: b.id, name: b.name, amount: b.amount, date: b.dueDate, autopay: b.autopay })
      }
    } else if (b.recurrence === 'weekly') {
      if (!b.dueDate) continue
      let d = b.dueDate
      while (cmp(d, from) < 0) d = addDays(d, 7)
      while (cmp(d, to) <= 0) {
        out.push({ billId: b.id, name: b.name, amount: b.amount, date: d, autopay: b.autopay })
        d = addDays(d, 7)
      }
    } else {
      if (!b.dueDay) continue
      const start = parseISO(from)
      let y = start.getFullYear()
      let m0 = start.getMonth()
      let guard = 0
      while (guard++ < 60) {
        const day = Math.min(b.dueDay, daysInMonth(y, m0 + 1))
        const d = toISO(new Date(y, m0, day))
        if (cmp(d, to) > 0) break
        if (cmp(d, from) >= 0) {
          out.push({ billId: b.id, name: b.name, amount: b.amount, date: d, autopay: b.autopay })
        }
        m0++
        if (m0 > 11) {
          m0 = 0
          y++
        }
      }
    }
  }
  out.sort((a, b2) => cmp(a.date, b2.date))
  return out
}

export interface SafeToSpendInput {
  cash: number
  bills: Bill[]
  paycheck: Paycheck | null
  bufferFloor: number
  savingsPerPeriod: number
  today: ISODate
}

export interface SafeToSpendResult {
  safe: number
  cash: number
  billsDue: number
  buffer: number
  savings: number
  /** end of the protected window: next payday, or today+14 with no paycheck set */
  windowEnd: ISODate
  nextPayday: ISODate | null
  dueBills: BillOccurrence[]
}

/**
 * Safe-to-Spend = cash − bills due through the next payday (inclusive: a bill
 * that lands on payday is protected, since the check may clear after it) −
 * buffer floor − planned savings for the period.
 */
export function safeToSpend(i: SafeToSpendInput): SafeToSpendResult {
  const nextPayday = i.paycheck ? nextPaydays(i.paycheck, addDays(i.today, 1), 1)[0] ?? null : null
  const windowEnd = nextPayday ?? addDays(i.today, 14)
  const dueBills = billOccurrences(i.bills, i.today, windowEnd)
  const billsDue = round2(dueBills.reduce((s, o) => s + o.amount, 0))
  const safe = round2(i.cash - billsDue - i.bufferFloor - i.savingsPerPeriod)
  return {
    safe,
    cash: round2(i.cash),
    billsDue,
    buffer: i.bufferFloor,
    savings: i.savingsPerPeriod,
    windowEnd,
    nextPayday,
    dueBills,
  }
}

export interface RunwayItem {
  date: ISODate
  kind: 'bill' | 'payday'
  name: string
  /** positive for payday, positive bill amount (subtracted in simulation) */
  amount: number
  autopay: boolean
  /** for bills: cash (with paychecks landed so far) covers this bill */
  covered: boolean
  balanceAfter: number
}

export interface RunwayResult {
  items: RunwayItem[]
  end: ISODate
  firstShortfall: RunwayItem | null
  /** bills covered before the next paycheck lands */
  billsBeforePayday: number
  coveredBeforePayday: number
}

/**
 * Simulate cash against upcoming bills + paydays, out to the second payday
 * (or 30 days with no paycheck). Bills on a payday hit before the check lands
 * — conservative on purpose.
 */
export function runway(i: {
  cash: number
  bills: Bill[]
  paycheck: Paycheck | null
  today: ISODate
}): RunwayResult {
  const paydays = i.paycheck ? nextPaydays(i.paycheck, addDays(i.today, 1), 2) : []
  const end = paydays[1] ?? addDays(i.today, 30)
  const occ = billOccurrences(i.bills, i.today, end)
  const events: Array<Omit<RunwayItem, 'covered' | 'balanceAfter'>> = occ.map((o) => ({
    date: o.date,
    kind: 'bill' as const,
    name: o.name,
    amount: o.amount,
    autopay: o.autopay,
  }))
  for (const d of paydays) {
    if (cmp(d, end) <= 0 && i.paycheck) {
      events.push({ date: d, kind: 'payday', name: 'Paycheck', amount: i.paycheck.amount, autopay: true })
    }
  }
  // bills before paydays on the same date (money may not land first)
  events.sort((a, b) => cmp(a.date, b.date) || (a.kind === b.kind ? 0 : a.kind === 'bill' ? -1 : 1))

  let balance = i.cash
  let firstShortfall: RunwayItem | null = null
  let billsBeforePayday = 0
  let coveredBeforePayday = 0
  let paydaySeen = false
  const items: RunwayItem[] = events.map((e) => {
    balance = round2(e.kind === 'bill' ? balance - e.amount : balance + e.amount)
    const covered = e.kind === 'payday' ? true : balance >= 0
    const item: RunwayItem = { ...e, covered, balanceAfter: balance }
    if (e.kind === 'bill') {
      if (!covered && !firstShortfall) firstShortfall = item
      if (!paydaySeen) {
        billsBeforePayday++
        if (covered) coveredBeforePayday++
      }
    } else {
      paydaySeen = true
    }
    return item
  })
  return { items, end, firstShortfall, billsBeforePayday, coveredBeforePayday }
}

export type ImpulseFrequency = 'once' | 'daily' | 'weekly' | 'monthly'

export function annualize(amount: number, freq: ImpulseFrequency): number {
  switch (freq) {
    case 'once':
      return round2(amount)
    case 'daily':
      return round2(amount * 365)
    case 'weekly':
      return round2(amount * 52)
    case 'monthly':
      return round2(amount * 12)
  }
}

export function fmtMoney(n: number, opts: { cents?: boolean } = {}): string {
  const abs = Math.abs(n)
  const showCents = opts.cents ?? abs % 1 !== 0
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  })
  return `${n < 0 ? '−' : ''}$${s}`
}

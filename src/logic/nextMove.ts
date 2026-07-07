import { fmtShort, type ISODate } from './dates'
import { fmtMoney } from './money'

/**
 * The One Next Move rule: the home screen surfaces exactly one recommended
 * action. Priority order (highest first):
 *   1. setup        — no cash/paycheck configured yet
 *   2. shortfall    — an upcoming bill isn't covered by cash on hand
 *   3. confirm      — pasted transactions waiting in the confirm queue
 *   4. means-month  — a lookback month is missing its income entry
 *   5. impulse      — a 24-hour wait expired and needs a decision
 *   6. clear        — explicit win state
 */

export type TabId = 'home' | 'impulse' | 'means' | 'money'

export interface NextMove {
  kind: 'setup' | 'shortfall' | 'confirm' | 'means-month' | 'impulse' | 'clear'
  title: string
  detail: string
  tab: TabId
}

export interface NextMoveInput {
  hasCash: boolean
  hasPaycheck: boolean
  shortfall: { name: string; date: ISODate; amount: number; balanceAfter: number } | null
  pendingTxnCount: number
  missingMeansMonths: string[] // labels, oldest first
  expiredImpulses: Array<{ description: string; amount: number }>
}

export function nextMove(i: NextMoveInput): NextMove {
  if (!i.hasCash || !i.hasPaycheck) {
    return {
      kind: 'setup',
      title: 'Set up your money basics',
      detail: !i.hasCash
        ? 'Enter your cash on hand so the dashboard can do the math for you.'
        : 'Add your base paycheck so Safe-to-Spend knows your next payday.',
      tab: 'money',
    }
  }
  if (i.shortfall) {
    const short = fmtMoney(Math.abs(i.shortfall.balanceAfter), { cents: true })
    return {
      kind: 'shortfall',
      title: `Cover ${i.shortfall.name} (${fmtShort(i.shortfall.date)})`,
      detail: `Cash runs ${short} short when this bill hits. Move money in, trim spending, or reschedule it now — future-you already thanked you.`,
      tab: 'money',
    }
  }
  if (i.pendingTxnCount > 0) {
    return {
      kind: 'confirm',
      title: `Confirm ${i.pendingTxnCount} pasted transaction${i.pendingTxnCount === 1 ? '' : 's'}`,
      detail: 'Quick review — source, amount, date. Nothing counts until you confirm it.',
      tab: 'money',
    }
  }
  if (i.missingMeansMonths.length > 0) {
    return {
      kind: 'means-month',
      title: `Log ${i.missingMeansMonths[0]} income`,
      detail: 'One number keeps your means-test screening current. Two minutes, tops.',
      tab: 'means',
    }
  }
  if (i.expiredImpulses.length > 0) {
    const imp = i.expiredImpulses[0]
    return {
      kind: 'impulse',
      title: `Decide on “${imp.description}”`,
      detail: `The 24-hour wait is up on this ${fmtMoney(imp.amount, { cents: true })} purchase. Still want it? Either answer is fine — just decide.`,
      tab: 'impulse',
    }
  }
  return {
    kind: 'clear',
    title: 'You’re clear today',
    detail: 'Bills are handled, nothing is waiting on you. That’s the whole assignment.',
    tab: 'home',
  }
}

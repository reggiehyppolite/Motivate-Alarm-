import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_SETTINGS } from '../db/schema'
import { todayISO } from '../logic/dates'
import { runway, safeToSpend } from '../logic/money'
import { lookbackMonths } from '../logic/meansTest'
import { nextMove } from '../logic/nextMove'

/** One derived snapshot of everything the dashboard needs. */
export function useDashboard() {
  return useLiveQuery(async () => {
    const today = todayISO()
    const [settingsRow, cashRow, bills, pendingTxns, waitingImpulses, meansMonths, skipped] =
      await Promise.all([
        db.settings.get('main'),
        db.cash.get('main'),
        db.bills.toArray(),
        db.transactions.where('status').equals('pending').toArray(),
        db.impulses.where('decision').equals('waiting').toArray(),
        db.meansMonths.toArray(),
        db.impulses.where('decision').equals('skipped').toArray(),
      ])
    const settings = settingsRow ?? DEFAULT_SETTINGS
    const cash = cashRow?.amount ?? null
    const activeBills = bills.filter((b) => b.active)

    const sts = safeToSpend({
      cash: cash ?? 0,
      bills: activeBills,
      paycheck: settings.paycheck,
      bufferFloor: settings.bufferFloor,
      savingsPerPeriod: settings.savingsPerPeriod,
      today,
    })
    const rw = runway({ cash: cash ?? 0, bills: activeBills, paycheck: settings.paycheck, today })

    const filingDate = settings.meansTest.filingDate || today
    const monthKeys = new Set(meansMonths.map((m) => m.key))
    const missingMeansMonths = lookbackMonths(filingDate)
      .filter((m) => !monthKeys.has(m.key))
      .map((m) => m.label)

    const now = Date.now()
    const expiredImpulses = waitingImpulses.filter(
      (i) => i.waitUntil && new Date(i.waitUntil).getTime() <= now,
    )

    const move = nextMove({
      hasCash: cashRow != null,
      hasPaycheck: settings.paycheck != null,
      shortfall: rw.firstShortfall
        ? {
            name: rw.firstShortfall.name,
            date: rw.firstShortfall.date,
            amount: rw.firstShortfall.amount,
            balanceAfter: rw.firstShortfall.balanceAfter,
          }
        : null,
      pendingTxnCount: pendingTxns.length,
      missingMeansMonths,
      expiredImpulses,
    })

    const moneyKept = skipped.reduce((s, i) => s + i.amount, 0)

    return {
      today,
      settings,
      cash,
      hasCash: cashRow != null,
      bills: activeBills,
      pendingTxns,
      waitingImpulses,
      expiredImpulses,
      sts,
      rw,
      move,
      moneyKept,
      missingMeansMonths,
    }
  })
}

export type Dashboard = NonNullable<ReturnType<typeof useDashboard>>

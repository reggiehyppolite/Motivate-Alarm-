import type { IncomeEvent, Impulse, MeansMonth, Txn } from '../db/schema'

/**
 * "Prior Chapter" soft reset, per the research: a fresh start must archive,
 * never delete. Bankruptcy and rebuild contexts benefit from retained records
 * (the official forms rely on the debtor's own records), so the payload keeps
 * everything and the active dashboard simply starts clean.
 */

export interface ChapterPayload {
  v: 1
  archivedAt: string
  cashAtArchive: number | null
  transactions: Txn[]
  incomeEvents: IncomeEvent[]
  impulses: Impulse[]
  meansMonths: MeansMonth[]
}

export interface ChapterSummary {
  txnCount: number
  incomeCount: number
  impulseCount: number
  meansMonthCount: number
  moneyKept: number
  firstDate: string | null
  lastDate: string | null
}

export function summarizeChapter(p: ChapterPayload): ChapterSummary {
  const dates = [
    ...p.transactions.map((t) => t.date),
    ...p.incomeEvents.map((e) => e.date),
  ]
    .filter(Boolean)
    .sort()
  const moneyKept =
    Math.round(
      p.impulses.filter((i) => i.decision === 'skipped').reduce((s, i) => s + i.amount, 0) * 100,
    ) / 100
  return {
    txnCount: p.transactions.length,
    incomeCount: p.incomeEvents.length,
    impulseCount: p.impulses.length,
    meansMonthCount: p.meansMonths.length,
    moneyKept,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  }
}

import { db } from './index'
import type { ArchiveEntry } from './schema'
import type { ChapterPayload } from '../logic/chapter'

/**
 * Archive the current chapter into the vault, then clear the active history
 * tables. Deliberately KEEPS: settings, bills, cash on hand — those describe
 * present reality, not the past. Deliberately CLEARS (after archiving):
 * transactions, income events, impulses, means-test months.
 */
export async function archiveChapter(label: string): Promise<number> {
  return db.transaction('rw', db.tables, async () => {
    const [transactions, incomeEvents, impulses, meansMonths, cash] = await Promise.all([
      db.transactions.toArray(),
      db.incomeEvents.toArray(),
      db.impulses.toArray(),
      db.meansMonths.toArray(),
      db.cash.get('main'),
    ])
    const payload: ChapterPayload = {
      v: 1,
      archivedAt: new Date().toISOString(),
      cashAtArchive: cash?.amount ?? null,
      transactions,
      incomeEvents,
      impulses,
      meansMonths,
    }
    const id = await db.archive.add({
      archivedAt: payload.archivedAt,
      label: label.trim() || 'Prior Chapter',
      payload: JSON.stringify(payload),
    })
    await Promise.all([
      db.transactions.clear(),
      db.incomeEvents.clear(),
      db.impulses.clear(),
      db.meansMonths.clear(),
    ])
    return id as number
  })
}

export function parseChapter(entry: ArchiveEntry): ChapterPayload {
  return JSON.parse(entry.payload) as ChapterPayload
}

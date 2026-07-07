import Dexie, { type Table } from 'dexie'
import type {
  ArchiveEntry,
  CashSnapshot,
  IncomeEvent,
  Impulse,
  MeansMonth,
  Settings,
  Txn,
} from './schema'
import type { Bill } from '../logic/money'
import { DEFAULT_SETTINGS } from './schema'

class ForwardFocusDB extends Dexie {
  settings!: Table<Settings, string>
  bills!: Table<Bill, number>
  incomeEvents!: Table<IncomeEvent, number>
  transactions!: Table<Txn, number>
  impulses!: Table<Impulse, number>
  cash!: Table<CashSnapshot, string>
  meansMonths!: Table<MeansMonth, string>
  archive!: Table<ArchiveEntry, number>

  constructor() {
    super('forward-focus')
    this.version(1).stores({
      settings: 'id',
      bills: '++id, active',
      incomeEvents: '++id, date, kind',
      transactions: '++id, date, status',
      impulses: '++id, decision, createdAt',
      cash: 'id',
      meansMonths: 'key',
      archive: '++id, archivedAt',
    })
  }
}

export const db = new ForwardFocusDB()

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'main' })
}

/** Everything, for encrypted export. */
export async function dumpAll() {
  const [settings, bills, incomeEvents, transactions, impulses, cash, meansMonths, archive] =
    await Promise.all([
      db.settings.toArray(),
      db.bills.toArray(),
      db.incomeEvents.toArray(),
      db.transactions.toArray(),
      db.impulses.toArray(),
      db.cash.toArray(),
      db.meansMonths.toArray(),
      db.archive.toArray(),
    ])
  return { v: 1, exportedAt: new Date().toISOString(), settings, bills, incomeEvents, transactions, impulses, cash, meansMonths, archive }
}

export async function restoreAll(data: Awaited<ReturnType<typeof dumpAll>>): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.settings.bulkPut(data.settings ?? [])
    await db.bills.bulkPut(data.bills ?? [])
    await db.incomeEvents.bulkPut(data.incomeEvents ?? [])
    await db.transactions.bulkPut(data.transactions ?? [])
    await db.impulses.bulkPut(data.impulses ?? [])
    await db.cash.bulkPut(data.cash ?? [])
    await db.meansMonths.bulkPut(data.meansMonths ?? [])
    await db.archive.bulkPut(data.archive ?? [])
  })
}

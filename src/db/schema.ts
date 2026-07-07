import type { ISODate } from '../logic/dates'
import type { Bill, ImpulseFrequency, Paycheck } from '../logic/money'

export type { Bill, Paycheck }

export interface Settings {
  id: 'main'
  bufferFloor: number
  savingsPerPeriod: number
  paycheck: Paycheck | null
  meansTest: {
    state: string
    householdSize: number
    medianAnnual: number
    filingDate: ISODate
  }
  theme: 'system' | 'light' | 'dark'
  /** model for LLM Smart-Paste; absent = default */
  aiModel?: string
}

export interface IncomeEvent {
  id?: number
  date: ISODate
  /** gross (pre-tax) — what Form 122A-1 counts */
  grossAmount: number
  /** what actually landed in the account */
  netAmount: number
  source: string
  kind: 'base' | 'variable'
}

export interface Txn {
  id?: number
  date: ISODate
  amount: number
  description: string
  direction: 'debit' | 'credit'
  origin: 'manual' | 'paste'
  status: 'pending' | 'confirmed'
  snippet?: string
}

export interface Impulse {
  id?: number
  description: string
  amount: number
  freq: ImpulseFrequency
  createdAt: string // ISO datetime
  decision: 'waiting' | 'bought' | 'skipped'
  waitUntil?: string // ISO datetime
  decidedAt?: string
}

export interface CashSnapshot {
  id: 'main'
  amount: number
  updatedAt: string
}

/** Manually confirmed gross income for a means-test lookback month. */
export interface MeansMonth {
  key: string // 'YYYY-MM'
  gross: number
}

/** Reserved for the v2 “Soft Reset / Prior Chapter” vault. */
export interface ArchiveEntry {
  id?: number
  archivedAt: string
  label: string
  payload: string
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  bufferFloor: 200,
  savingsPerPeriod: 0,
  paycheck: null,
  meansTest: {
    state: 'CO',
    householdSize: 1,
    medianAnnual: 87_940,
    filingDate: '',
  },
  theme: 'system',
}

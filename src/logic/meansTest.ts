import { monthLabel, parseISO, type ISODate } from './dates'

/**
 * Chapter 7 means-test screening math, per Official Form 122A-1:
 * current monthly income (CMI) = average gross income from all sources over
 * the 6 FULL calendar months before the filing month; annualized (×12) and
 * compared to the state median for the household size.
 *
 * This is a SCREENING ESTIMATE ONLY — not legal advice. Above-median cases
 * move to Form 122A-2 (disposable income); other factors can still matter.
 */

/** Colorado, 1-person household — U.S. Trustee table for cases filed
 *  Apr 1 – Jul 14, 2026 (same figure published for on/after Jul 15, 2026).
 *  Always verify at justice.gov/ust before relying on it. */
export const CO_MEDIAN_1_PERSON = 87_940

export interface LookbackMonth {
  year: number
  month1: number // 1-based
  key: string // 'YYYY-MM'
  label: string // 'January 2026'
}

/** The 6 full calendar months before the month containing the filing date. */
export function lookbackMonths(filingDate: ISODate): LookbackMonth[] {
  const d = parseISO(filingDate)
  let y = d.getFullYear()
  let m1 = d.getMonth() + 1
  const out: LookbackMonth[] = []
  for (let i = 0; i < 6; i++) {
    m1--
    if (m1 < 1) {
      m1 = 12
      y--
    }
    out.unshift({
      year: y,
      month1: m1,
      key: `${y}-${String(m1).padStart(2, '0')}`,
      label: monthLabel(y, m1),
    })
  }
  return out
}

export interface MeansTestResult {
  /** all six months have an entered value */
  complete: boolean
  monthsEntered: number
  total: number
  /** current monthly income: 6-month total ÷ 6 */
  cmi: number
  annualized: number
  under: boolean
  /** median − annualized (positive = under median by this much) */
  margin: number
}

export function meansTest(grossByMonth: Array<number | null>, medianAnnual: number): MeansTestResult {
  const entered = grossByMonth.filter((v): v is number => v !== null)
  const total = Math.round(entered.reduce((s, v) => s + v, 0) * 100) / 100
  const cmi = Math.round((total / 6) * 100) / 100
  const annualized = Math.round(cmi * 12 * 100) / 100
  return {
    complete: entered.length === 6,
    monthsEntered: entered.length,
    total,
    cmi,
    annualized,
    under: annualized <= medianAnnual,
    margin: Math.round((medianAnnual - annualized) * 100) / 100,
  }
}

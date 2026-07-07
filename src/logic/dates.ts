// All dates are local-calendar ISO strings (YYYY-MM-DD). Never use Date.parse
// on these — it treats bare dates as UTC and shifts them across midnight.
export type ISODate = string

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysInMonth(year: number, month1: number): number {
  // month1 is 1-based
  return new Date(year, month1, 0).getDate()
}

/** ISO strings compare correctly as strings. */
export function cmp(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function fmtShort(s: ISODate): string {
  const d = parseISO(s)
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

export function monthLabel(year: number, month1: number): string {
  return `${MONTHS_LONG[month1 - 1]} ${year}`
}

export function monthLabelShort(year: number, month1: number): string {
  return `${MONTHS_SHORT[month1 - 1]} ${year}`
}

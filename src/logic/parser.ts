import { toISO, type ISODate } from './dates'

/**
 * Deterministic bank-text parser. No LLM, no network: regex heuristics that
 * propose transactions for a human confirm queue. Nothing it produces is
 * committed without review. Designed so an LLM-backed parser can slot in
 * behind the same ParsedTxn interface later.
 */

export interface ParsedTxn {
  description: string
  amount: number
  direction: 'debit' | 'credit'
  date: ISODate | null
  /** the original line, kept so the user can see exactly where it came from */
  snippet: string
}

const AMOUNT_RE = /\(?\$?\s?-?\d{1,3}(?:,\d{3})*\.\d{2}\)?(?:\s?(?:CR|DR))?/gi
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/
const SLASH_DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}
const WORD_DATE_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i

const CREDIT_WORDS = /\b(deposit|payroll|direct\s?dep|dd|refund|reversal|cashback|credit|interest\s+paid|zelle\s+from|venmo\s+from|payment\s+received|transfer\s+in)\b/i

function parseAmountToken(tok: string): { value: number; creditHint: boolean } {
  const creditHint = /\bCR\b/i.test(tok) || (tok.includes('(') && tok.includes(')'))
  const neg = tok.includes('-')
  const num = parseFloat(tok.replace(/[^0-9.]/g, ''))
  return { value: Math.round(num * 100) / 100, creditHint: creditHint || neg }
}

function extractDate(line: string, defaultYear: number): { date: ISODate | null; matched: string | null } {
  const iso = line.match(ISO_DATE_RE)
  if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, matched: iso[0] }
  const slash = line.match(SLASH_DATE_RE)
  if (slash) {
    const m = Number(slash[1])
    const d = Number(slash[2])
    let y = slash[3] ? Number(slash[3]) : defaultYear
    if (y < 100) y += 2000
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { date: toISO(new Date(y, m - 1, d)), matched: slash[0] }
    }
  }
  const word = line.match(WORD_DATE_RE)
  if (word) {
    const m = MONTH_NAMES[word[1].toLowerCase().slice(0, 3)]
    const d = Number(word[2])
    const y = word[3] ? Number(word[3]) : defaultYear
    if (d >= 1 && d <= 31) return { date: toISO(new Date(y, m - 1, d)), matched: word[0] }
  }
  return { date: null, matched: null }
}

export function parseBankText(text: string, opts: { defaultYear?: number } = {}): ParsedTxn[] {
  const defaultYear = opts.defaultYear ?? new Date().getFullYear()
  const out: ParsedTxn[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const amountTokens = [...line.matchAll(AMOUNT_RE)].map((m) => m[0])
    if (amountTokens.length === 0) continue
    // Bank rows often end with a running balance ("date desc amount balance").
    // With 2+ amounts, take the second-to-last as the transaction amount.
    const chosen = amountTokens.length >= 2 ? amountTokens[amountTokens.length - 2] : amountTokens[0]
    const { value, creditHint } = parseAmountToken(chosen)
    if (!Number.isFinite(value) || value === 0) continue

    const { date, matched: dateToken } = extractDate(line, defaultYear)

    let description = line
    for (const tok of amountTokens) description = description.replace(tok, ' ')
    if (dateToken) description = description.replace(dateToken, ' ')
    description = description.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—•*|]+|[\s\-–—•*|]+$/g, '').trim()
    if (!description) description = 'Unlabeled transaction'

    const direction: 'debit' | 'credit' = creditHint || CREDIT_WORDS.test(line) ? 'credit' : 'debit'
    out.push({ description, amount: value, direction, date, snippet: line })
  }
  return out
}

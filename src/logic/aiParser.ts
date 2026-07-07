import Anthropic from '@anthropic-ai/sdk'
import type { ParsedTxn } from './parser'
import { round2 } from './money'

/**
 * LLM-assisted Smart-Paste. Per the product's research rules, the model is an
 * assistive parser, never the final authority: its output is validated
 * deterministically here, and every proposal still lands in the human confirm
 * queue with its source line attached. Nothing commits silently.
 *
 * The call goes directly from the browser to the Anthropic API using the
 * user's own key (this app has no backend).
 */

export const AI_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — most capable (default)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — cheapest/fastest' },
] as const

export type AiModelId = (typeof AI_MODELS)[number]['id']
export const DEFAULT_AI_MODEL: AiModelId = 'claude-opus-4-8'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['transactions'],
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['description', 'amount', 'direction', 'date', 'source_line'],
        properties: {
          description: { type: 'string', description: 'Merchant/source, cleaned up (no dates or amounts)' },
          amount: { type: 'number', description: 'Positive transaction amount in dollars. Never the running balance.' },
          direction: { type: 'string', enum: ['debit', 'credit'] },
          date: {
            anyOf: [{ type: 'string', description: 'YYYY-MM-DD' }, { type: 'null' }],
            description: 'Transaction date if present in the text, else null. Never invent one.',
          },
          source_line: { type: 'string', description: 'The exact input line this came from, verbatim' },
        },
      },
    },
  },
} as const

const SYSTEM_PROMPT = `You extract financial transactions from text a user pasted from their banking app or statement.

Rules:
- One entry per real transaction. Skip headers, footers, balances, and marketing text.
- "amount" is the transaction amount, always positive. Bank rows often end with a running balance — that is NOT the amount.
- "direction" is "credit" for money in (deposits, payroll, refunds, interest, transfers in) and "debit" for money out.
- "date" must come from the text (resolve to YYYY-MM-DD, assume year ${new Date().getFullYear()} if missing). If no date is present for a line, use null — never guess.
- "source_line" must be the verbatim input line, so the user can verify against the original.
- If the text contains no transactions, return an empty array.`

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Deterministic checks on model output — the gate before the confirm queue. */
export function validateAiTransactions(raw: unknown): ParsedTxn[] {
  if (typeof raw !== 'object' || raw === null) return []
  const list = (raw as { transactions?: unknown }).transactions
  if (!Array.isArray(list)) return []
  const out: ParsedTxn[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const t = item as Record<string, unknown>
    const amount = typeof t.amount === 'number' ? round2(Math.abs(t.amount)) : NaN
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000_000) continue
    const direction = t.direction === 'credit' ? 'credit' : t.direction === 'debit' ? 'debit' : null
    if (!direction) continue
    const description = typeof t.description === 'string' ? t.description.trim() : ''
    if (!description) continue
    let date: string | null = null
    if (typeof t.date === 'string' && ISO_DATE_RE.test(t.date)) {
      const [y, m, d] = t.date.split('-').map(Number)
      const probe = new Date(y, m - 1, d)
      if (probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d) {
        date = t.date
      }
    }
    const snippet = typeof t.source_line === 'string' && t.source_line.trim() ? t.source_line.trim() : description
    out.push({ description, amount, direction, date, snippet })
  }
  return out
}

export async function parseBankTextWithAI(
  text: string,
  opts: { apiKey: string; model: AiModelId },
): Promise<ParsedTxn[]> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })
  const response = await client.messages.create({
    model: opts.model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    messages: [{ role: 'user', content: text }],
  })
  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to process this text.')
  }
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new Error('The model returned output that could not be parsed. Try again or use basic parsing.')
  }
  return validateAiTransactions(parsed)
}

import { useState } from 'react'
import { db } from '../db'
import type { Impulse as ImpulseRow } from '../db/schema'
import { Button, Card, Field, IconCheck, IconClock, MoneyInput, parseMoney, SectionTitle, StatusChip, TextInput } from '../components/ui'
import { useDashboard } from '../hooks/useDashboard'
import { todayISO } from '../logic/dates'
import { annualize, fmtMoney, round2, type ImpulseFrequency } from '../logic/money'

const FREQS: Array<{ id: ImpulseFrequency; label: string }> = [
  { id: 'once', label: 'One-time' },
  { id: 'daily', label: 'Daily habit' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

async function adjustCash(delta: number) {
  const row = await db.cash.get('main')
  if (row) {
    await db.cash.put({ id: 'main', amount: round2(row.amount + delta), updatedAt: new Date().toISOString() })
  }
}

export default function Impulse() {
  const d = useDashboard()
  const [amountStr, setAmountStr] = useState('')
  const [desc, setDesc] = useState('')
  const [freq, setFreq] = useState<ImpulseFrequency>('once')
  const [done, setDone] = useState<string | null>(null)

  if (!d) return null
  const amount = parseMoney(amountStr)
  const yearly = annualize(amount, freq)
  const safeAfter = round2(d.sts.safe - amount)
  const savings = d.settings.savingsPerPeriod

  async function record(decision: ImpulseRow['decision']) {
    const now = new Date()
    await db.impulses.add({
      description: desc.trim() || 'Unnamed purchase',
      amount,
      freq,
      createdAt: now.toISOString(),
      decision,
      waitUntil: decision === 'waiting' ? new Date(now.getTime() + 24 * 3600_000).toISOString() : undefined,
      decidedAt: decision === 'waiting' ? undefined : now.toISOString(),
    })
    if (decision === 'bought') {
      await db.transactions.add({
        date: todayISO(),
        amount,
        description: desc.trim() || 'Impulse purchase',
        direction: 'debit',
        origin: 'manual',
        status: 'confirmed',
      })
      await adjustCash(-amount)
    }
    setDone(
      decision === 'waiting'
        ? 'On the clock. It’ll resurface on your home screen in 24 hours — future-you gets the vote.'
        : decision === 'bought'
          ? 'Logged and counted. Cash on hand updated — no guilt, just accurate numbers.'
          : `Skipped. That’s ${fmtMoney(amount, { cents: true })} that stays yours.`,
    )
    setAmountStr('')
    setDesc('')
    setFreq('once')
    setTimeout(() => setDone(null), 4000)
  }

  async function decideWaiting(row: ImpulseRow, decision: 'bought' | 'skipped') {
    await db.impulses.update(row.id!, { decision, decidedAt: new Date().toISOString() })
    if (decision === 'bought') {
      await db.transactions.add({
        date: todayISO(),
        amount: row.amount,
        description: row.description,
        direction: 'debit',
        origin: 'manual',
        status: 'confirmed',
      })
      await adjustCash(-row.amount)
    }
  }

  return (
    <>
      <Card>
        <SectionTitle hint="Before the impulse wins, see what it actually costs. No moralizing — just the math.">
          About to buy something?
        </SectionTitle>
        <div className="space-y-3">
          <Field label="How much?">
            <MoneyInput value={amountStr} onChange={setAmountStr} />
          </Field>
          <Field label="What is it?">
            <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mechanical keyboard, DoorDash…" />
          </Field>
          <div>
            <span className="block text-xs font-medium text-ink-2 mb-1">How often would this repeat?</span>
            <div className="flex gap-2 flex-wrap">
              {FREQS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFreq(f.id)}
                  aria-pressed={freq === f.id}
                  className={`min-h-10 px-3.5 rounded-full text-sm font-medium border ${
                    freq === f.id ? 'border-accent bg-accent-wash text-accent-ink' : 'border-hairline text-ink-2'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {amount > 0 && (
          <div className="mt-4 rounded-xl border border-hairline p-3 space-y-2">
            <p className="text-sm text-ink">
              {freq === 'once' ? (
                <>One-time hit of <strong>{fmtMoney(amount, { cents: true })}</strong>.</>
              ) : (
                <>
                  Kept up, this runs <strong>{fmtMoney(yearly)}</strong> a year.
                </>
              )}
            </p>
            <p className="text-sm text-ink-2">
              Safe-to-spend goes {fmtMoney(d.sts.safe)} → <strong className={safeAfter < 0 ? 'text-serious-ink' : 'text-ink'}>{fmtMoney(safeAfter)}</strong>
              {safeAfter < 0 && ' — that dips into protected money.'}
            </p>
            {savings > 0 && amount >= savings && (
              <p className="text-sm text-ink-2">
                That’s {(amount / savings).toFixed(1)}× one savings-goal contribution.
              </p>
            )}
          </div>
        )}

        {amount > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="quiet" onClick={() => record('waiting')}>
              Wait 24h
            </Button>
            <Button variant="outline" onClick={() => record('bought')}>
              Buy it
            </Button>
            <Button variant="outline" onClick={() => record('skipped')}>
              Skip it
            </Button>
          </div>
        )}
        {done && (
          <p className="mt-3 text-sm text-good-ink flex items-center gap-1.5">
            <IconCheck /> {done}
          </p>
        )}
      </Card>

      {d.waitingImpulses.length > 0 && (
        <Card>
          <SectionTitle>Waiting room</SectionTitle>
          <ul className="space-y-3">
            {d.waitingImpulses.map((row) => {
              const expired = row.waitUntil ? new Date(row.waitUntil).getTime() <= Date.now() : true
              const hoursLeft = row.waitUntil
                ? Math.max(0, Math.ceil((new Date(row.waitUntil).getTime() - Date.now()) / 3600_000))
                : 0
              return (
                <li key={row.id} className="border border-hairline rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{row.description}</p>
                      <p className="text-xs text-ink-2 tabular-nums">{fmtMoney(row.amount, { cents: true })}</p>
                    </div>
                    {expired ? (
                      <StatusChip tone="accent" icon={<IconCheck />}>
                        Time’s up — your call
                      </StatusChip>
                    ) : (
                      <StatusChip tone="neutral" icon={<IconClock />}>
                        {hoursLeft}h left
                      </StatusChip>
                    )}
                  </div>
                  {expired && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => decideWaiting(row, 'bought')}>
                        Still want it
                      </Button>
                      <Button variant="quiet" className="flex-1" onClick={() => decideWaiting(row, 'skipped')}>
                        Let it go
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {d.moneyKept > 0 && (
        <Card>
          <p className="text-xs font-medium text-ink-2">Money kept by skipping impulses</p>
          <p className="text-3xl font-semibold text-ink mt-1">{fmtMoney(d.moneyKept)}</p>
          <p className="text-xs text-ink-2 mt-1">Every skip lands here. It adds up faster than shame ever did.</p>
        </Card>
      )}
    </>
  )
}

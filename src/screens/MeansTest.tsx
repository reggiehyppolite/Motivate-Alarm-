import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveSettings } from '../db'
import { DEFAULT_SETTINGS } from '../db/schema'
import { Button, Card, Field, IconAlert, IconCheck, IconInfo, MoneyInput, parseMoney, SectionTitle, StatusChip, TextInput } from '../components/ui'
import { todayISO } from '../logic/dates'
import { fmtMoney } from '../logic/money'
import { lookbackMonths, meansTest } from '../logic/meansTest'

function MonthRow({
  label,
  monthKey,
  saved,
  suggestion,
}: {
  label: string
  monthKey: string
  saved: number | null
  suggestion: number | null
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  async function save(amount: number) {
    await db.meansMonths.put({ key: monthKey, gross: amount })
    setEditing(false)
    setVal('')
  }

  return (
    <li className="flex items-center gap-2 py-2 border-b border-hairline last:border-b-0">
      <span className="text-sm text-ink w-32 shrink-0">{label}</span>
      {editing || saved === null ? (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1">
            <MoneyInput value={val} onChange={setVal} placeholder="gross income" />
          </div>
          <Button variant="quiet" onClick={() => save(parseMoney(val))} disabled={val === ''}>
            Save
          </Button>
          {saved === null && suggestion !== null && val === '' && (
            <Button variant="outline" onClick={() => save(suggestion)}>
              Use {fmtMoney(suggestion)}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between flex-1">
          <span className="text-sm tabular-nums font-medium text-ink">{fmtMoney(saved, { cents: true })}</span>
          <button className="text-xs text-accent-ink font-semibold min-h-9 px-2" onClick={() => { setVal(String(saved)); setEditing(true) }}>
            Edit
          </button>
        </div>
      )}
    </li>
  )
}

export default function MeansTest() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const meansMonths = useLiveQuery(() => db.meansMonths.toArray())
  const incomeEvents = useLiveQuery(() => db.incomeEvents.toArray())
  const [showMedianEdit, setShowMedianEdit] = useState(false)
  const [medianStr, setMedianStr] = useState('')

  const mt = settings?.meansTest ?? DEFAULT_SETTINGS.meansTest
  const filingDate = mt.filingDate || todayISO()
  const months = useMemo(() => lookbackMonths(filingDate), [filingDate])

  if (!settings && meansMonths === undefined) return null

  const savedByKey = new Map((meansMonths ?? []).map((m) => [m.key, m.gross]))
  const suggestionByKey = new Map<string, number>()
  for (const m of months) {
    const sum = (incomeEvents ?? [])
      .filter((e) => e.date.startsWith(m.key))
      .reduce((s, e) => s + e.grossAmount, 0)
    if (sum > 0) suggestionByKey.set(m.key, Math.round(sum * 100) / 100)
  }

  const grossByMonth = months.map((m) => savedByKey.get(m.key) ?? null)
  const result = meansTest(grossByMonth, mt.medianAnnual)
  const meterPct = Math.min(100, (result.annualized / mt.medianAnnual) * 100)

  return (
    <>
      <div className="rounded-xl bg-accent-wash border border-edge px-3 py-2.5 flex items-start gap-2">
        <span className="text-accent-ink mt-0.5"><IconInfo /></span>
        <p className="text-xs text-ink-2">
          <strong className="text-ink">Screening estimate — not legal advice.</strong> This follows Official Form 122A-1
          logic (6-month average gross income, annualized, vs. your state median). The median comparison is one screen in
          a larger analysis; talk to a bankruptcy attorney before relying on it.
        </p>
      </div>

      <Card>
        <SectionTitle hint="The lookback window is the 6 full calendar months before the month you file.">
          Planned filing date
        </SectionTitle>
        <TextInput
          type="date"
          value={filingDate}
          onChange={(e) => e.target.value && saveSettings({ meansTest: { ...mt, filingDate: e.target.value } })}
        />
        <p className="text-xs text-ink-2 mt-2">
          Window: <strong className="text-ink">{months[0].label} – {months[5].label}</strong>
        </p>
      </Card>

      <Card>
        <SectionTitle hint="Gross (pre-tax) income from all sources, per month. Log paychecks in Money and they’ll show up here as suggestions.">
          Monthly gross income
        </SectionTitle>
        <ul>
          {months.map((m) => (
            <MonthRow
              key={m.key}
              label={m.label}
              monthKey={m.key}
              saved={savedByKey.get(m.key) ?? null}
              suggestion={suggestionByKey.get(m.key) ?? null}
            />
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">{result.monthsEntered} of 6 months entered</p>
      </Card>

      <Card>
        <SectionTitle>Where you stand</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-ink-2">6-month total</span>
          <span className="text-right tabular-nums text-ink">{fmtMoney(result.total, { cents: true })}</span>
          <span className="text-ink-2">Current monthly income</span>
          <span className="text-right tabular-nums text-ink">{fmtMoney(result.cmi, { cents: true })}</span>
          <span className="text-ink-2">Annualized (×12)</span>
          <span className="text-right tabular-nums font-semibold text-ink">{fmtMoney(result.annualized, { cents: true })}</span>
          <span className="text-ink-2">{mt.state} median ({mt.householdSize}-person)</span>
          <span className="text-right tabular-nums text-ink">{fmtMoney(mt.medianAnnual)}</span>
        </div>

        {/* Meter: fill vs median. Color reinforces the labeled verdict below, never replaces it. */}
        <div className="mt-3" role="img" aria-label={`Annualized income is ${Math.round(meterPct)}% of the state median`}>
          <div className="h-3 rounded-full bg-meter-track overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${meterPct}%`,
                background: result.under ? 'var(--accent)' : 'var(--serious)',
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-1">
            <span>$0</span>
            <span>median {fmtMoney(mt.medianAnnual)}</span>
          </div>
        </div>

        <div className="mt-3">
          {!result.complete ? (
            <p className="text-sm text-ink-2 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0"><IconInfo /></span>
              Partial picture — the form divides by 6 regardless, so the verdict firms up once all months are in.
            </p>
          ) : result.under ? (
            <div className="space-y-1">
              <StatusChip tone="good" icon={<IconCheck />}>Under the median</StatusChip>
              <p className="text-sm text-ink-2">
                Annualized income {fmtMoney(result.annualized)} is {fmtMoney(result.margin)} under the median. On Form
                122A-1 that means <strong className="text-ink">no presumption of abuse arises</strong> from the income screen.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <StatusChip tone="serious" icon={<IconAlert />}>Over the median</StatusChip>
              <p className="text-sm text-ink-2">
                Annualized income {fmtMoney(result.annualized)} is {fmtMoney(Math.abs(result.margin))} over the median.
                That doesn’t end the road — it means the <strong className="text-ink">Form 122A-2 disposable-income analysis</strong> applies. An attorney should run those numbers.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Colorado 1-person figure from the U.S. Trustee table for cases filed Apr 1 – Jul 14, 2026. Tables update — always verify before filing.">
          Median setting
        </SectionTitle>
        {showMedianEdit ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <MoneyInput value={medianStr} onChange={setMedianStr} placeholder={String(mt.medianAnnual)} />
            </div>
            <Button
              variant="quiet"
              onClick={() => {
                const v = parseMoney(medianStr)
                if (v > 0) saveSettings({ meansTest: { ...mt, medianAnnual: v } })
                setShowMedianEdit(false)
              }}
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink tabular-nums">{fmtMoney(mt.medianAnnual)} · {mt.state}, {mt.householdSize}-person household</span>
            <Button variant="outline" onClick={() => { setMedianStr(String(mt.medianAnnual)); setShowMedianEdit(true) }}>
              Edit
            </Button>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Field label="Household size" className="w-36">
            <TextInput
              type="number"
              min={1}
              value={mt.householdSize}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1)
                saveSettings({ meansTest: { ...mt, householdSize: n } })
              }}
            />
          </Field>
          <p className="text-xs text-ink-2 flex-1">
            Changed household size or state? Look up the median at{' '}
            <a className="underline text-accent-ink" href="https://www.justice.gov/ust/means-testing" target="_blank" rel="noreferrer">
              justice.gov/ust/means-testing
            </a>{' '}
            and enter it above.
          </p>
        </div>
      </Card>
    </>
  )
}

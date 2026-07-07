import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, dumpAll, getSettings, restoreAll, saveSettings } from '../db'
import { DEFAULT_SETTINGS, type Txn } from '../db/schema'
import { decryptBackup, encryptBackup } from '../crypto/backup'
import {
  Button, Card, Field, IconCheck, IconShield, MoneyInput, parseMoney, SectionTitle, StatusChip, TextInput, inputClass,
} from '../components/ui'
import { fmtShort, todayISO } from '../logic/dates'
import { fmtMoney, round2, type Bill, type PayFrequency } from '../logic/money'
import { parseBankText } from '../logic/parser'

async function adjustCash(delta: number) {
  const row = await db.cash.get('main')
  if (row) await db.cash.put({ id: 'main', amount: round2(row.amount + delta), updatedAt: new Date().toISOString() })
}

/* ---------- Cash on hand ---------- */
function CashSection() {
  const cash = useLiveQuery(() => db.cash.get('main'))
  const [val, setVal] = useState('')
  const [editing, setEditing] = useState(false)
  const showForm = editing || cash == null

  return (
    <Card>
      <SectionTitle hint="Total spendable cash across checking accounts. Update it whenever reality changes — this anchors every number in the app.">
        Cash on hand
      </SectionTitle>
      {!showForm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold text-ink tabular-nums">{fmtMoney(cash!.amount, { cents: true })}</p>
            <p className="text-[11px] text-muted">updated {new Date(cash!.updatedAt).toLocaleDateString()}</p>
          </div>
          <Button variant="outline" onClick={() => { setVal(String(cash!.amount)); setEditing(true) }}>Update</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1"><MoneyInput value={val} onChange={setVal} /></div>
          <Button
            onClick={async () => {
              await db.cash.put({ id: 'main', amount: parseMoney(val), updatedAt: new Date().toISOString() })
              setEditing(false); setVal('')
            }}
            disabled={val === ''}
          >
            Save
          </Button>
        </div>
      )}
    </Card>
  )
}

/* ---------- Paycheck ---------- */
const FREQ_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  semimonthly: 'Twice a month',
  monthly: 'Monthly',
}

function PaycheckSection() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const [editing, setEditing] = useState(false)
  const [net, setNet] = useState('')
  const [gross, setGross] = useState('')
  const [freq, setFreq] = useState<PayFrequency>('biweekly')
  const [next, setNext] = useState(todayISO())

  const pc = settings?.paycheck ?? null
  const showForm = editing || pc == null

  return (
    <Card>
      <SectionTitle hint="Your regular base paycheck. Variable/gig income doesn’t go here — log it below when it lands.">
        Base paycheck
      </SectionTitle>
      {!showForm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink font-medium">
              {fmtMoney(pc!.amount)} take-home · {FREQ_LABELS[pc!.frequency]}
            </p>
            <p className="text-xs text-ink-2">next payday {fmtShort(pc!.nextDate)}{pc!.gross ? ` · ${fmtMoney(pc!.gross)} gross` : ''}</p>
          </div>
          <Button variant="outline" onClick={() => {
            setNet(String(pc!.amount)); setGross(pc!.gross ? String(pc!.gross) : ''); setFreq(pc!.frequency); setNext(pc!.nextDate); setEditing(true)
          }}>Edit</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Take-home per check"><MoneyInput value={net} onChange={setNet} /></Field>
            <Field label="Gross per check (optional)"><MoneyInput value={gross} onChange={setGross} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="How often">
              <select className={inputClass} value={freq} onChange={(e) => setFreq(e.target.value as PayFrequency)}>
                {(Object.keys(FREQ_LABELS) as PayFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </Field>
            <Field label="Next payday">
              <TextInput type="date" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
          </div>
          <Button
            disabled={net === '' || !next}
            onClick={async () => {
              await saveSettings({
                paycheck: { amount: parseMoney(net), gross: gross ? parseMoney(gross) : undefined, frequency: freq, nextDate: next },
              })
              setEditing(false)
            }}
          >
            Save paycheck
          </Button>
        </div>
      )}
    </Card>
  )
}

/* ---------- Income logging ---------- */
function IncomeSection() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const recent = useLiveQuery(() => db.incomeEvents.orderBy('date').reverse().limit(5).toArray())
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'base' | 'variable'>('base')
  const [date, setDate] = useState(todayISO())
  const [source, setSource] = useState('')
  const [netStr, setNetStr] = useState('')
  const [grossStr, setGrossStr] = useState('')
  const [addToCash, setAddToCash] = useState(true)

  function openForm(k: 'base' | 'variable') {
    const pc = settings?.paycheck
    setKind(k)
    setDate(todayISO())
    if (k === 'base' && pc) {
      setSource('Paycheck')
      setNetStr(String(pc.amount))
      setGrossStr(pc.gross ? String(pc.gross) : String(pc.amount))
    } else {
      setSource('')
      setNetStr('')
      setGrossStr('')
    }
    setOpen(true)
  }

  return (
    <Card>
      <SectionTitle hint="Log money as it actually lands. Gross amounts feed the means-test screen; net updates cash on hand.">
        Log income
      </SectionTitle>
      {!open ? (
        <div className="flex gap-2">
          <Button variant="quiet" className="flex-1" onClick={() => openForm('base')}>Paycheck landed</Button>
          <Button variant="outline" className="flex-1" onClick={() => openForm('variable')}>Extra income</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Source"><TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paycheck, side gig…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Net (landed)"><MoneyInput value={netStr} onChange={setNetStr} /></Field>
            <Field label="Gross (pre-tax)"><MoneyInput value={grossStr} onChange={setGrossStr} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={addToCash} onChange={(e) => setAddToCash(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Add net amount to cash on hand
          </label>
          <div className="flex gap-2">
            <Button
              disabled={netStr === ''}
              onClick={async () => {
                const net = parseMoney(netStr)
                await db.incomeEvents.add({
                  date,
                  netAmount: net,
                  grossAmount: grossStr ? parseMoney(grossStr) : net,
                  source: source.trim() || (kind === 'base' ? 'Paycheck' : 'Extra income'),
                  kind,
                })
                if (addToCash) await adjustCash(net)
                setOpen(false)
              }}
            >
              Log it
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {(recent?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1">
          {recent!.map((e) => (
            <li key={e.id} className="flex justify-between text-xs text-ink-2">
              <span>{fmtShort(e.date)} · {e.source}</span>
              <span className="tabular-nums">+{fmtMoney(e.netAmount, { cents: true })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------- Bills ---------- */
function BillsSection() {
  const bills = useLiveQuery(() => db.bills.toArray())
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [recurrence, setRecurrence] = useState<Bill['recurrence']>('monthly')
  const [dueDay, setDueDay] = useState('1')
  const [dueDate, setDueDate] = useState(todayISO())
  const [autopay, setAutopay] = useState(false)

  const active = (bills ?? []).filter((b) => b.active)

  return (
    <Card>
      <SectionTitle hint="Rent, utilities, subscriptions, debt minimums — anything that must get paid. Autopay bills count as protected.">
        Bills
      </SectionTitle>
      {active.length > 0 && (
        <ul className="mb-3 divide-y divide-hairline">
          {active.map((b) => (
            <li key={b.id} className="py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{b.name}</p>
                <p className="text-xs text-ink-2 tabular-nums">
                  {fmtMoney(b.amount, { cents: true })} ·{' '}
                  {b.recurrence === 'monthly' ? `monthly on the ${b.dueDay}` : b.recurrence === 'weekly' ? 'weekly' : `once, ${b.dueDate && fmtShort(b.dueDate)}`}
                </p>
              </div>
              <button
                onClick={() => db.bills.update(b.id!, { autopay: !b.autopay })}
                aria-pressed={b.autopay}
                className={`min-h-9 px-2.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1 ${
                  b.autopay ? 'border-accent bg-accent-wash text-accent-ink' : 'border-hairline text-muted'
                }`}
              >
                <IconShield size={12} /> {b.autopay ? 'Autopay' : 'Manual'}
              </button>
              <button className="text-xs text-critical-ink font-medium min-h-9 px-1.5" onClick={() => db.bills.update(b.id!, { active: false })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {!open ? (
        <Button variant="quiet" onClick={() => setOpen(true)}>Add a bill</Button>
      ) : (
        <div className="space-y-3 border-t border-hairline pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent" /></Field>
            <Field label="Amount"><MoneyInput value={amountStr} onChange={setAmountStr} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Repeats">
              <select className={inputClass} value={recurrence} onChange={(e) => setRecurrence(e.target.value as Bill['recurrence'])}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="once">One-time</option>
              </select>
            </Field>
            {recurrence === 'monthly' ? (
              <Field label="Day of month">
                <TextInput type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              </Field>
            ) : (
              <Field label={recurrence === 'weekly' ? 'Next due date' : 'Due date'}>
                <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            On autopay (pays itself)
          </label>
          <div className="flex gap-2">
            <Button
              disabled={!name.trim() || amountStr === ''}
              onClick={async () => {
                await db.bills.add({
                  name: name.trim(),
                  amount: parseMoney(amountStr),
                  recurrence,
                  dueDay: recurrence === 'monthly' ? Math.min(31, Math.max(1, Number(dueDay) || 1)) : undefined,
                  dueDate: recurrence !== 'monthly' ? dueDate : undefined,
                  autopay,
                  active: true,
                })
                setName(''); setAmountStr(''); setAutopay(false); setOpen(false)
              }}
            >
              Add bill
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ---------- Paste inbox + confirm queue ---------- */
function PendingRow({ t }: { t: Txn }) {
  const [amountStr, setAmountStr] = useState(String(t.amount))
  const [date, setDate] = useState(t.date || todayISO())
  const [desc, setDesc] = useState(t.description)
  const [dir, setDir] = useState(t.direction)

  return (
    <li className="border border-hairline rounded-xl p-3 space-y-2">
      <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Description" />
      <div className="grid grid-cols-3 gap-2">
        <MoneyInput value={amountStr} onChange={setAmountStr} />
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <select className={inputClass} value={dir} onChange={(e) => setDir(e.target.value as Txn['direction'])} aria-label="Direction">
          <option value="debit">Spent</option>
          <option value="credit">Received</option>
        </select>
      </div>
      {t.snippet && <p className="text-[11px] text-muted truncate">from: “{t.snippet}”</p>}
      <div className="flex gap-2">
        <Button
          variant="quiet"
          className="flex-1"
          onClick={async () => {
            const amount = parseMoney(amountStr)
            await db.transactions.update(t.id!, { amount, date, description: desc.trim(), direction: dir, status: 'confirmed' })
            await adjustCash(dir === 'debit' ? -amount : amount)
          }}
        >
          Confirm
        </Button>
        <Button variant="danger-outline" className="flex-1" onClick={() => db.transactions.delete(t.id!)}>
          Reject
        </Button>
      </div>
    </li>
  )
}

function PasteSection() {
  const pending = useLiveQuery(() => db.transactions.where('status').equals('pending').toArray())
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | null>(null)

  return (
    <Card>
      <SectionTitle hint="Paste transaction lines from your banking app. Deterministic parsing on-device — nothing counts until you confirm it, and nothing is sent anywhere.">
        Paste inbox
      </SectionTitle>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={'07/01 STARBUCKS 6.45\n07/02 PAYROLL DEPOSIT 1,800.00'}
        className="w-full rounded-xl border border-hairline bg-surface p-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          disabled={!text.trim()}
          onClick={async () => {
            const parsed = parseBankText(text)
            if (parsed.length === 0) {
              setNote('No amounts found in that text — try pasting the transaction rows themselves.')
              return
            }
            await db.transactions.bulkAdd(
              parsed.map((p) => ({
                date: p.date ?? todayISO(),
                amount: p.amount,
                description: p.description,
                direction: p.direction,
                origin: 'paste' as const,
                status: 'pending' as const,
                snippet: p.snippet,
              })),
            )
            setText('')
            setNote(`${parsed.length} proposed — review below.`)
          }}
        >
          Parse
        </Button>
        {note && <span className="text-xs text-ink-2">{note}</span>}
      </div>
      {(pending?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-2">
          {pending!.map((t) => (
            <PendingRow key={t.id} t={t} />
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------- Settings ---------- */
function SettingsSection() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const [buffer, setBuffer] = useState<string | null>(null)
  const [savings, setSavings] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [ioNote, setIoNote] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  const s = settings ?? DEFAULT_SETTINGS

  return (
    <Card>
      <SectionTitle hint="Protected money and app preferences.">Settings</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Buffer floor (never spend below)">
          <MoneyInput value={buffer ?? String(s.bufferFloor)} onChange={setBuffer} />
        </Field>
        <Field label="Savings per paycheck">
          <MoneyInput value={savings ?? String(s.savingsPerPeriod)} onChange={setSavings} />
        </Field>
      </div>
      {(buffer !== null || savings !== null) && (
        <Button
          className="mt-2"
          onClick={async () => {
            await saveSettings({
              bufferFloor: buffer !== null ? parseMoney(buffer) : s.bufferFloor,
              savingsPerPeriod: savings !== null ? parseMoney(savings) : s.savingsPerPeriod,
            })
            setBuffer(null); setSavings(null)
          }}
        >
          Save protected amounts
        </Button>
      )}

      <div className="mt-4">
        <Field label="Theme">
          <select className={inputClass} value={s.theme} onChange={(e) => saveSettings({ theme: e.target.value as typeof s.theme })}>
            <option value="system">Match device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 border-t border-hairline pt-3 space-y-2">
        <p className="text-xs font-semibold text-ink">Encrypted backup</p>
        <p className="text-xs text-ink-2">
          Your data lives only in this browser. Back it up to an encrypted file (AES-256, passphrase never stored) —
          especially before clearing browser data or switching devices.
        </p>
        <TextInput
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Backup passphrase"
          autoComplete="new-password"
        />
        <div className="flex gap-2 items-center">
          <Button
            variant="quiet"
            disabled={passphrase.length < 6}
            onClick={async () => {
              const data = await dumpAll()
              const json = await encryptBackup(data, passphrase)
              const blob = new Blob([json], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `forward-focus-backup-${todayISO()}.json`
              a.click()
              URL.revokeObjectURL(a.href)
              setIoNote('Backup downloaded.')
            }}
          >
            Export
          </Button>
          <label className="flex-1">
            <span className="sr-only">Choose backup file to import</span>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="text-xs text-ink-2 w-full"
            />
          </label>
          <Button
            variant="outline"
            disabled={!importFile || passphrase.length < 6}
            onClick={async () => {
              try {
                const json = await importFile!.text()
                const data = (await decryptBackup(json, passphrase)) as Awaited<ReturnType<typeof dumpAll>>
                await restoreAll(data)
                await getSettings()
                setIoNote('Backup restored.')
              } catch {
                setIoNote('Couldn’t decrypt that file — check the passphrase.')
              }
            }}
          >
            Import
          </Button>
        </div>
        {ioNote && (
          <p className="text-xs text-good-ink flex items-center gap-1"><IconCheck size={12} /> {ioNote}</p>
        )}
        {passphrase.length > 0 && passphrase.length < 6 && (
          <p className="text-xs text-ink-2">Use at least 6 characters.</p>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted">
        Forward Focus is a planning tool, not financial or legal advice. All data stays on this device.
      </p>
    </Card>
  )
}

export default function Money() {
  const pendingCount = useLiveQuery(() => db.transactions.where('status').equals('pending').count())
  return (
    <>
      {(pendingCount ?? 0) > 0 && (
        <div className="rounded-xl bg-accent-wash border border-edge px-3 py-2">
          <StatusChip tone="accent" icon={<IconCheck />}>
            {pendingCount} transaction{pendingCount === 1 ? '' : 's'} waiting for your confirmation below
          </StatusChip>
        </div>
      )}
      <CashSection />
      <PaycheckSection />
      <IncomeSection />
      <BillsSection />
      <PasteSection />
      <SettingsSection />
    </>
  )
}

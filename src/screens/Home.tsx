import { Card, IconAlert, IconArrowRight, IconCheck, IconClock, IconShield, StatusChip, Button } from '../components/ui'
import { useDashboard } from '../hooks/useDashboard'
import { daysBetween, fmtShort } from '../logic/dates'
import { fmtMoney } from '../logic/money'
import type { TabId } from '../logic/nextMove'

export default function Home({ go }: { go: (tab: TabId) => void }) {
  const d = useDashboard()
  if (!d) return null

  const { sts, rw, move } = d
  const safeNegative = sts.safe < 0
  const untilLabel = sts.nextPayday
    ? `until payday ${fmtShort(sts.nextPayday)}`
    : 'next 14 days (no paycheck set)'

  return (
    <>
      {/* Safe to Spend — the hero figure */}
      <Card>
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-ink-2">Safe to spend {untilLabel}</p>
          {d.hasCash &&
            (safeNegative ? (
              <StatusChip tone="serious" icon={<IconAlert />}>
                Short
              </StatusChip>
            ) : (
              <StatusChip tone="good" icon={<IconCheck />}>
                Covered
              </StatusChip>
            ))}
        </div>
        <p className="text-5xl font-semibold tracking-tight mt-2 text-ink">
          {d.hasCash ? fmtMoney(sts.safe) : '—'}
        </p>
        {d.hasCash ? (
          <div className="mt-3 text-xs text-ink-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Cash on hand</span>
            <span className="text-right tabular-nums">{fmtMoney(sts.cash)}</span>
            <span>Bills before payday</span>
            <span className="text-right tabular-nums">−{fmtMoney(sts.billsDue)}</span>
            <span>Buffer floor</span>
            <span className="text-right tabular-nums">−{fmtMoney(sts.buffer)}</span>
            {sts.savings > 0 && (
              <>
                <span>Savings goal</span>
                <span className="text-right tabular-nums">−{fmtMoney(sts.savings)}</span>
              </>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-2">
            Enter your cash on hand and this becomes one honest number — no mental math required.
          </p>
        )}
        {safeNegative && d.hasCash && (
          <p className="mt-3 text-sm text-ink">
            Bills are ahead of cash by {fmtMoney(Math.abs(sts.safe))}. Not a crisis — the next move below is the fix.
          </p>
        )}
      </Card>

      {/* One Next Move */}
      <Card className="border-l-4 border-l-accent">
        <p className="text-xs font-semibold text-accent-ink uppercase tracking-wide">One next move</p>
        <h2 className="text-base font-semibold text-ink mt-1">{move.title}</h2>
        <p className="text-sm text-ink-2 mt-1">{move.detail}</p>
        {move.kind !== 'clear' && (
          <Button variant="quiet" className="mt-3 inline-flex items-center gap-2" onClick={() => go(move.tab)}>
            Do it now <IconArrowRight />
          </Button>
        )}
      </Card>

      {/* Bills Runway */}
      <Card>
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-sm font-semibold text-ink">Bills runway</h2>
          <span className="text-[11px] text-muted">through {fmtShort(rw.end)}</span>
        </div>
        {rw.items.length === 0 ? (
          <p className="text-sm text-ink-2">
            No upcoming bills on file. Add your bills in the Money tab and this becomes your radar.
          </p>
        ) : (
          <>
            <p className="text-xs text-ink-2 mb-3">
              {rw.firstShortfall
                ? `${rw.firstShortfall.name} on ${fmtShort(rw.firstShortfall.date)} isn’t covered yet.`
                : d.settings.paycheck
                  ? `Cash covers everything until payday${rw.billsBeforePayday > 0 ? ` (${rw.coveredBeforePayday}/${rw.billsBeforePayday} bills)` : ''}.`
                  : 'Add your paycheck in Money to project coverage.'}
            </p>
            <ol className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Upcoming bills and paydays">
              {rw.items.map((item, idx) => {
                const isPayday = item.kind === 'payday'
                return (
                  <li
                    key={idx}
                    className={`shrink-0 w-32 rounded-xl border p-2.5 ${
                      isPayday ? 'border-accent bg-accent-wash' : 'border-hairline'
                    }`}
                  >
                    <p className="text-[11px] text-muted">
                      {fmtShort(item.date)}
                      {daysBetween(d.today, item.date) === 0 && ' · today'}
                    </p>
                    <p className="text-sm font-medium text-ink truncate mt-0.5">{item.name}</p>
                    <p className="text-sm tabular-nums text-ink-2">
                      {isPayday ? '+' : '−'}
                      {fmtMoney(item.amount)}
                    </p>
                    <div className="mt-1.5">
                      {isPayday ? (
                        <StatusChip tone="accent" icon={<IconCheck />}>
                          Income
                        </StatusChip>
                      ) : !item.covered ? (
                        <StatusChip tone="serious" icon={<IconAlert />}>
                          Not covered
                        </StatusChip>
                      ) : item.autopay ? (
                        <StatusChip tone="good" icon={<IconShield />}>
                          Autopay
                        </StatusChip>
                      ) : (
                        <StatusChip tone="neutral" icon={<IconClock />}>
                          Pay manually
                        </StatusChip>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </Card>

      {d.moneyKept > 0 && (
        <p className="text-center text-xs text-ink-2">
          Impulses skipped so far have kept <span className="font-semibold text-good-ink">{fmtMoney(d.moneyKept)}</span> in your pocket.
        </p>
      )}
    </>
  )
}

import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-surface border border-edge shadow-sm p-4 ${className}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {hint && <p className="text-xs text-ink-2 mt-0.5">{hint}</p>}
    </div>
  )
}

type ButtonVariant = 'primary' | 'quiet' | 'outline' | 'danger-outline'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white font-semibold active:opacity-80',
  quiet: 'bg-accent-wash text-accent-ink font-semibold active:opacity-70',
  outline: 'border border-hairline text-ink font-medium active:bg-accent-wash',
  'danger-outline': 'border border-hairline text-critical-ink font-medium active:opacity-70',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 px-4 rounded-xl text-sm transition-opacity disabled:opacity-40 ${buttonStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-ink-2 mb-1">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-xl border border-hairline bg-surface px-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0.00',
  autoFocus,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  id?: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-base">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          if (/^[\d,]*\.?\d{0,2}$/.test(v)) onChange(v)
        }}
        className={`${inputClass} pl-7`}
      />
    </div>
  )
}

export function parseMoney(v: string): number {
  const n = parseFloat(v.replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/** Status chip: icon + word, color is reinforcement only. */
export function StatusChip({
  tone,
  icon,
  children,
}: {
  tone: 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'accent'
  icon: ReactNode
  children: ReactNode
}) {
  const toneClass = {
    good: 'text-good-ink',
    warning: 'text-warning-ink',
    serious: 'text-serious-ink',
    critical: 'text-critical-ink',
    neutral: 'text-ink-2',
    accent: 'text-accent-ink',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${toneClass}`}>
      {icon}
      {children}
    </span>
  )
}

/* ----- Inline icons (16px default, stroke-based) ----- */

function svg(path: ReactNode, size = 16, viewBox = '0 0 24 24') {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export const IconCheck = ({ size = 16 }: { size?: number }) => svg(<path d="M4 12.5l5 5L20 6.5" />, size)
export const IconAlert = ({ size = 16 }: { size?: number }) =>
  svg(
    <>
      <path d="M12 3L2.5 20h19L12 3z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.5" r="0.4" fill="currentColor" />
    </>,
    size,
  )
export const IconClock = ({ size = 16 }: { size?: number }) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>,
    size,
  )
export const IconShield = ({ size = 16 }: { size?: number }) =>
  svg(<path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6L12 3z" />, size)
export const IconArrowRight = ({ size = 16 }: { size?: number }) =>
  svg(
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>,
    size,
  )
export const IconInfo = ({ size = 16 }: { size?: number }) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.4" fill="currentColor" />
    </>,
    size,
  )

/* Tab bar icons (24px) */
export const IconHome = ({ size = 24 }: { size?: number }) =>
  svg(
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>,
    size,
  )
export const IconPause = ({ size = 24 }: { size?: number }) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9v6M14.5 9v6" />
    </>,
    size,
  )
export const IconScale = ({ size = 24 }: { size?: number }) =>
  svg(
    <>
      <path d="M12 4.5v15M8 19.5h8" />
      <path d="M12 5.5L5.5 7M12 5.5L18.5 7" />
      <path d="M5.5 7L3 13a2.8 2.8 0 005.2 0L5.5 7zM18.5 7L16 13a2.8 2.8 0 005.2 0L18.5 7z" />
    </>,
    size,
  )
export const IconWallet = ({ size = 24 }: { size?: number }) =>
  svg(
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="0.5" fill="currentColor" />
    </>,
    size,
  )

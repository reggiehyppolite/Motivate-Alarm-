import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { TabId } from './logic/nextMove'
import { IconChat, IconHome, IconPause, IconScale, IconWallet } from './components/ui'
import Home from './screens/Home'
import Impulse from './screens/Impulse'
import MeansTest from './screens/MeansTest'
import Money from './screens/Money'
import Coach from './screens/Coach'

/** Coach is its own tab, not a next-move destination — TabId stays the money router. */
type AppTab = TabId | 'coach'

const TABS: Array<{ id: AppTab; label: string; icon: (p: { size?: number }) => React.ReactNode }> = [
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'impulse', label: 'Impulse', icon: IconPause },
  { id: 'means', label: 'Means test', icon: IconScale },
  { id: 'money', label: 'Money', icon: IconWallet },
  { id: 'coach', label: 'Coach', icon: IconChat },
]

export default function App() {
  const [tab, setTab] = useState<AppTab>('home')
  const settings = useLiveQuery(() => db.settings.get('main'))

  useEffect(() => {
    const theme = settings?.theme ?? 'system'
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [settings?.theme])

  return (
    <div className="mx-auto max-w-lg min-h-dvh flex flex-col">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-2 flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-ink tracking-tight">Forward Focus</h1>
        <span className="text-[11px] text-muted">local-only · nothing leaves this device</span>
      </header>

      <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+88px)] space-y-4">
        {tab === 'home' && <Home go={setTab} />}
        {tab === 'impulse' && <Impulse />}
        {tab === 'means' && <MeansTest />}
        {tab === 'money' && <Money />}
        {tab === 'coach' && <Coach />}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-hairline"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-lg grid grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 min-h-14 text-[11px] font-medium ${
                  active ? 'text-accent-ink' : 'text-muted'
                }`}
              >
                <t.icon size={22} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

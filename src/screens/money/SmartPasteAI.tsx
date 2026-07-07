import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveSettings } from '../../db'
import { AI_MODELS, DEFAULT_AI_MODEL } from '../../logic/aiParser'
import {
  clearStoredKey,
  hasStoredKey,
  setApiKey,
  storeKeyEncrypted,
  unlockStoredKey,
  useApiKey,
} from '../../state/apiKey'
import { Button, Card, Field, IconCheck, IconShield, inputClass, SectionTitle, StatusChip, TextInput } from '../../components/ui'

export default function SmartPasteAI() {
  const apiKey = useApiKey()
  const settings = useLiveQuery(() => db.settings.get('main'))
  const [keyInput, setKeyInput] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [remember, setRemember] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const stored = hasStoredKey()

  const model = settings?.aiModel ?? DEFAULT_AI_MODEL

  return (
    <Card>
      <SectionTitle hint="Optional: Claude reads messy bank text and proposes transactions. Your key goes straight from this device to Anthropic — this app has no server. Every proposal still needs your confirmation.">
        AI Smart-Paste
      </SectionTitle>

      {apiKey ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <StatusChip tone="good" icon={<IconCheck />}>AI parsing ready</StatusChip>
            <Button
              variant="danger-outline"
              onClick={() => {
                setApiKey(null)
                clearStoredKey()
                setNote('Key forgotten — removed from memory and this device.')
              }}
            >
              Forget key
            </Button>
          </div>
          <Field label="Model">
            <select className={inputClass} value={model} onChange={(e) => saveSettings({ aiModel: e.target.value })}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Field>
          {!stored && (
            <div className="space-y-2">
              <p className="text-xs text-ink-2">
                The key lives in memory only and is gone when you close the app. To keep it on this device,
                encrypt it with a passphrase:
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <TextInput
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Passphrase (min 6 chars)"
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={passphrase.length < 6}
                  onClick={async () => {
                    await storeKeyEncrypted(apiKey, passphrase)
                    setPassphrase('')
                    setNote('Key stored encrypted on this device.')
                  }}
                >
                  Remember
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : stored ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-2 flex items-center gap-1.5">
            <IconShield /> An encrypted key is saved on this device. Unlock it for this session:
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase"
                autoComplete="current-password"
              />
            </div>
            <Button
              disabled={!passphrase}
              onClick={async () => {
                const ok = await unlockStoredKey(passphrase)
                setPassphrase('')
                setNote(ok ? 'Unlocked — AI parsing is ready.' : 'Wrong passphrase — try again.')
              }}
            >
              Unlock
            </Button>
          </div>
          <button
            className="text-xs text-critical-ink font-medium min-h-9"
            onClick={() => {
              clearStoredKey()
              setNote('Stored key removed from this device.')
            }}
          >
            Remove the stored key instead
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="Anthropic API key">
            <TextInput
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Remember on this device (encrypted with a passphrase)
          </label>
          {remember && (
            <TextInput
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase (min 6 chars)"
              autoComplete="new-password"
            />
          )}
          <Button
            disabled={!keyInput.trim().startsWith('sk-ant-') || (remember && passphrase.length < 6)}
            onClick={async () => {
              const key = keyInput.trim()
              setApiKey(key)
              if (remember) {
                await storeKeyEncrypted(key, passphrase)
                setNote('Key active and stored encrypted on this device.')
              } else {
                setNote('Key active for this session (memory only).')
              }
              setKeyInput('')
              setPassphrase('')
            }}
          >
            {remember ? 'Save & activate' : 'Use for this session'}
          </Button>
          <p className="text-[11px] text-muted">
            Get a key at console.anthropic.com. Parsing a paste costs a fraction of a cent on Haiku; a bit more on Opus.
          </p>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-ink-2">{note}</p>}
    </Card>
  )
}

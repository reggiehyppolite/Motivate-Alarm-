import { useSyncExternalStore } from 'react'
import { decryptBackup, encryptBackup } from '../crypto/backup'

/**
 * API-key handling per the research's privacy rules: the key lives in memory
 * by default and disappears when the tab closes. Persistence is opt-in and
 * always encrypted with a user passphrase (AES-256-GCM); the plaintext key is
 * never written to storage.
 */

const STORAGE_KEY = 'ff-anthropic-key-enc'

let currentKey: string | null = null
const listeners = new Set<() => void>()

export function getApiKey(): string | null {
  return currentKey
}

export function setApiKey(key: string | null): void {
  currentKey = key && key.trim() ? key.trim() : null
  listeners.forEach((fn) => fn())
}

export function useApiKey(): string | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => currentKey,
  )
}

export function hasStoredKey(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export async function storeKeyEncrypted(key: string, passphrase: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, await encryptBackup({ k: key }, passphrase))
}

export async function unlockStoredKey(passphrase: string): Promise<boolean> {
  const blob = localStorage.getItem(STORAGE_KEY)
  if (!blob) return false
  try {
    const data = (await decryptBackup(blob, passphrase)) as { k?: string }
    if (typeof data.k === 'string' && data.k) {
      setApiKey(data.k)
      return true
    }
    return false
  } catch {
    return false
  }
}

export function clearStoredKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

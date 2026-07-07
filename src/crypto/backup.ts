/**
 * Encrypted backup: PBKDF2-SHA256 (310k iterations) → AES-256-GCM.
 * Output is a self-describing JSON envelope; the passphrase never leaves
 * the device and is never stored.
 */

const ITERATIONS = 310_000

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedEnvelope {
  v: 1
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string
  iv: string
  ct: string
}

export async function encryptBackup(data: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext)
  const envelope: EncryptedEnvelope = {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
  }
  return JSON.stringify(envelope)
}

export async function decryptBackup(envelopeJson: string, passphrase: string): Promise<unknown> {
  const env = JSON.parse(envelopeJson) as EncryptedEnvelope
  if (env.v !== 1 || env.kdf !== 'PBKDF2-SHA256') throw new Error('Unrecognized backup format')
  const key = await deriveKey(passphrase, fromB64(env.salt))
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(env.iv) as BufferSource },
    key,
    fromB64(env.ct) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(pt))
}

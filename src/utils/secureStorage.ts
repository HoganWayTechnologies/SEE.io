const REFRESH_STORAGE_KEY = 'seeio.refresh.secure'
const FALLBACK_SESSION_KEY = 'seeio.refresh.fallback'
const SESSION_KEY_STORAGE = 'seeio.refresh.session-key'

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null

const hasCrypto = () => typeof window !== 'undefined' && !!window.crypto?.subtle

const readFromStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const local = window.localStorage.getItem(key)
    if (local !== null && local !== undefined) return local
  } catch {
    // ignore and fall back
  }
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeToStorage = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // ignore localStorage write errors
  }
  try {
    if (value === null) {
      window.sessionStorage.removeItem(key)
    } else {
      window.sessionStorage.setItem(key, value)
    }
  } catch {
    // ignore sessionStorage write errors
  }
}

const bufferToBase64 = (buffer: ArrayBuffer) => {
  if (typeof window === 'undefined') return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

const base64ToBuffer = (value: string) => {
  if (typeof window === 'undefined') return new ArrayBuffer(0)
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const getSessionKey = async (): Promise<CryptoKey | null> => {
  if (!hasCrypto() || !textEncoder) return null
  let rawKey = readFromStorage(SESSION_KEY_STORAGE)
  if (!rawKey) {
    const bytes = new Uint8Array(32)
    window.crypto.getRandomValues(bytes)
    rawKey = bufferToBase64(bytes.buffer)
    writeToStorage(SESSION_KEY_STORAGE, rawKey)
  }
  const keyBuffer = base64ToBuffer(rawKey)
  return window.crypto.subtle.importKey('raw', keyBuffer, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export const saveRefreshTokenSecure = async (token: string | null) => {
  if (typeof window === 'undefined') return
  if (!token) {
    writeToStorage(REFRESH_STORAGE_KEY, null)
    writeToStorage(FALLBACK_SESSION_KEY, null)
    return
  }
  const key = await getSessionKey()
  if (!key || !textEncoder || !hasCrypto()) {
    writeToStorage(FALLBACK_SESSION_KEY, token)
    return
  }
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = textEncoder.encode(token)
  const cipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const payload = `${bufferToBase64(iv.buffer)}.${bufferToBase64(cipher)}`
  writeToStorage(REFRESH_STORAGE_KEY, payload)
  // Clear any plaintext fallback if encryption succeeds
  writeToStorage(FALLBACK_SESSION_KEY, null)
}

export const loadRefreshTokenSecure = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null
  const fallback = readFromStorage(FALLBACK_SESSION_KEY)
  if (fallback) return fallback
  const payload = readFromStorage(REFRESH_STORAGE_KEY)
  if (!payload) return null
  const [ivPart, dataPart] = payload.split('.')
  if (!ivPart || !dataPart) return null
  const key = await getSessionKey()
  if (!key || !textDecoder || !hasCrypto()) return null
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(ivPart)) },
      key,
      base64ToBuffer(dataPart)
    )
    return textDecoder.decode(decrypted)
  } catch {
    return null
  }
}

import admin from 'firebase-admin'

export function initAdmin() {
  if (admin.apps && admin.apps.length) return
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required for server-side session management')
  }
  const serviceAccount = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) })
}

export async function verifySessionCookie(sessionCookie: string) {
  initAdmin()
  // verifySessionCookie will throw if invalid
  const decoded = await admin.auth().verifySessionCookie(sessionCookie, true)
  return decoded
}

export async function revokeSessionByUid(uid: string) {
  initAdmin()
  await admin.auth().revokeRefreshTokens(uid)
}

export async function verifySessionCookieFromValue(sessionValue?: string | null) {
  if (!sessionValue) return null
  try {
    const decoded = await verifySessionCookie(sessionValue)
    return decoded
  } catch (e) {
    return null
  }
}

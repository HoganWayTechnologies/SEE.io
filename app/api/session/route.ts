import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { fetchAuthMe } from '../../../lib/api'

// Initialize Firebase Admin if not already
function initAdmin() {
  if (admin.apps && admin.apps.length) return
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required for server-side session management')
  }
  const serviceAccount = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) })
}

export async function POST(req: NextRequest) {
  // Create a secure session cookie from a Firebase ID token sent by the client
  try {
    initAdmin()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const body = await req.json()
  const idToken = body?.idToken
  if (!idToken) return NextResponse.json({ error: 'idToken required' }, { status: 400 })

  try {
    // Verify the ID token first (optional) and then create a session cookie
    const decoded = await admin.auth().verifyIdToken(idToken)
    const expiresIn = 14 * 24 * 60 * 60 * 1000 // 14 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn })

    // Call SocxalAPI /admin/auth/me server-side to get mapped profile
    const profile = await fetchAuthMe(idToken)

    const res = NextResponse.json({ profile })
    // Set cookie
    const maxAge = Math.floor(expiresIn / 1000)
    const cookie = `session=${sessionCookie}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`
    res.headers.set('Set-Cookie', cookie)
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create session' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  // Revoke refresh tokens for the user (if we can) and clear the session cookie
  try {
    initAdmin()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  try {
    const sessionCookie = req.cookies.get('session')?.value
    if (sessionCookie) {
      try {
        const decoded = await admin.auth().verifySessionCookie(sessionCookie, true)
        // Revoke refresh tokens so the session becomes invalid immediately
        await admin.auth().revokeRefreshTokens(decoded.uid)
      } catch (e) {
        // ignore verification/revocation errors and proceed to clear cookie
      }
    }
  } catch (e) {
    // ignore
  }

  const res = NextResponse.json({ ok: true })
  const cookie = `session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
  res.headers.set('Set-Cookie', cookie)
  return res
}

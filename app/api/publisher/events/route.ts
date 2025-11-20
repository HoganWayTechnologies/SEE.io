import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { initAdmin, verifySessionCookieFromValue } from '../../../../lib/session'
import admin from 'firebase-admin'

const API_BASE = (process.env.NEXT_PUBLIC_SEE_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI').replace(/\/$/, '')

export async function POST(req: NextRequest) {
  if (!API_BASE) return NextResponse.json({ error: 'SEE API base not configured' }, { status: 500 })

  const idTokenHeader = req.headers.get('authorization') || ''
  const idToken = idTokenHeader.replace(/^Bearer\s+/i, '')
  if (!idToken) return NextResponse.json({ error: 'Missing Authorization header with ID token' }, { status: 401 })

  try {
    initAdmin()
    // verify the provided ID token
    const decodedId = await admin.auth().verifyIdToken(idToken)

    // verify session cookie if present and ensure uid matches
    const sessionCookie = req.cookies.get('session')?.value || null
    if (sessionCookie) {
      const decodedSession = await verifySessionCookieFromValue(sessionCookie)
      if (!decodedSession || decodedSession.uid !== decodedId.uid) {
        return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
      }
    }

    const body = await req.json()

    // forward to SEE.API publisher endpoint
    const resp = await axios.post(`${API_BASE}/v1/publisher/events`, body, {
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
    })

    return NextResponse.json(resp.data, { status: resp.status })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'publisher create failed' }, { status: 502 })
  }
}

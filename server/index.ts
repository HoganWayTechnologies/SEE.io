import express from 'express'
import axios from 'axios'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import bodyParser from 'body-parser'
import admin from 'firebase-admin'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

console.log('Starting server...')

try {
  app.use(cors({ origin: true, credentials: true }))
  app.use(cookieParser())
  app.use(bodyParser.json())

  const API_BASE = (process.env.NEXT_PUBLIC_SEE_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI').replace(/\/$/, '')

  console.log('API_BASE:', API_BASE)

  // Helper to init admin only when needed
  const initAdmin = () => {
    if (admin.apps && admin.apps.length) return
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required for server-side session management')
    }
    const serviceAccount = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) })
  }

  app.post('/api/session', async (req, res) => {
    const { idToken } = req.body || {}
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' })
    try {
      initAdmin()
      const decoded = await admin.auth().verifyIdToken(idToken)
      const expiresIn = 14 * 24 * 60 * 60 * 1000 // 14 days
      const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn })
      res.cookie('session', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expiresIn,
        sameSite: 'lax',
        path: '/',
      })
      // Optionally forward to SocxalAPI /admin/auth/me to fetch profile
      return res.json({ ok: true, uid: decoded.uid })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'session create failed' })
    }
  })

  app.delete('/api/session', async (req, res) => {
    const session = req.cookies.session || null
    if (!session) return res.status(200).json({ ok: true })
    try {
      initAdmin()
      const decoded = await admin.auth().verifySessionCookie(session, true)
      await admin.auth().revokeRefreshTokens(decoded.uid)
      res.clearCookie('session')
      return res.json({ ok: true })
    } catch (e: any) {
      res.clearCookie('session')
      return res.status(200).json({ ok: true })
    }
  })

  app.get('/api/public-search', async (req, res) => {
    if (!API_BASE) return res.status(500).json({ error: 'SEE API base not configured' })
    try {
      const resp = await axios.get(`${API_BASE}/v1/public/events`, { params: req.query })
      return res.status(resp.status).json(resp.data)
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'public-search failed' })
    }
  })

  app.post('/api/publisher/events', async (req, res) => {
    if (!API_BASE) return res.status(500).json({ error: 'SEE API base not configured' })
    const auth = req.headers.authorization || ''
    const idToken = auth.replace(/^Bearer\s+/i, '')
    if (!idToken) return res.status(401).json({ error: 'Missing Authorization' })
    try {
      initAdmin()
      await admin.auth().verifyIdToken(idToken)
      const resp = await axios.post(`${API_BASE}/v1/publisher/events`, req.body, {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
      })
      return res.status(resp.status).json(resp.data)
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'publisher create failed' })
    }
  })

  app.put('/api/publisher/events/:id', async (req, res) => {
    if (!API_BASE) return res.status(500).json({ error: 'SEE API base not configured' })
    const auth = req.headers.authorization || ''
    const idToken = auth.replace(/^Bearer\s+/i, '')
    if (!idToken) return res.status(401).json({ error: 'Missing Authorization' })
    try {
      initAdmin()
      await admin.auth().verifyIdToken(idToken)
      const { id } = req.params
      const resp = await axios.put(`${API_BASE}/v1/publisher/events/${encodeURIComponent(id)}`, req.body, {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
      })
      return res.status(resp.status).json(resp.data)
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'publisher update failed' })
    }
  })

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
} catch (error) {
  console.error('Server startup error:', error)
  process.exit(1)
}

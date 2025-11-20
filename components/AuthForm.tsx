"use client"
import React, { useState } from 'react'
import { socxalLogin, socxalRegister, exchangeToFirebase } from '../lib/socxal'

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let socxalResp: any
      if (mode === 'login') {
        socxalResp = await socxalLogin(email, password)
      } else {
        socxalResp = await socxalRegister(email, password)
      }

      const accessToken = socxalResp?.accessToken
      if (!accessToken) throw new Error('Socxal did not return access token')

      const exchange = await exchangeToFirebase(accessToken)
      const idToken = exchange?.firebaseToken || exchange?.idToken
      if (!idToken) throw new Error('Exchange to Firebase failed')

      // Send idToken to server to create a secure httpOnly session cookie.
      const resp = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      })

      if (!resp.ok) throw new Error('Failed to create server session')

      const data = await resp.json()
      setUserProfile(data.profile)
    } catch (err: any) {
      setError(err?.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    // Clear server session cookie
    await fetch('/api/session', { method: 'DELETE' })
    setUserProfile(null)
  }

  if (userProfile) {
    return (
      <div className="p-2">
        <div className="text-sm">Signed in as <strong>{userProfile.email || userProfile.uid}</strong></div>
        <button className="mt-2 px-3 py-1 bg-slate-700 text-white rounded" onClick={handleSignOut}>Sign out</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => setMode('login')} className={`px-2 py-1 ${mode==='login' ? 'bg-sky-600 text-white' : 'bg-white'}`}>Login</button>
        <button type="button" onClick={() => setMode('register')} className={`px-2 py-1 ${mode==='register' ? 'bg-sky-600 text-white' : 'bg-white'}`}>Register</button>
      </div>

      <input className="block mb-2 p-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" className="block mb-2 p-2 border rounded" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <div className="flex items-center gap-2">
        <button disabled={loading} className="px-3 py-2 bg-sky-600 text-white rounded">{loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>
    </form>
  )
}

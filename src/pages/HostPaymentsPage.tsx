import React, { useEffect, useMemo, useState } from 'react'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function HostPaymentsPage() {
  const auth = useAuth()
  const [account, setAccount] = useState<any | null>(null)
  const [status, setStatus] = useState<string | null>('Loading payments profile…')
  const [loading, setLoading] = useState(false)

  const hostId = useMemo(() => {
    return auth.profile?.hostId || auth.primaryBusinessId || auth.profile?.businessId || null
  }, [auth.profile, auth.primaryBusinessId])

  const paymentsReady = useMemo(() => {
    if (!account) return false
    return Boolean(
      account.active ||
      account.status === 'active' ||
      account.chargesEnabled ||
      account.charges_enabled ||
      account.payoutsEnabled ||
      account.payouts_enabled
    )
  }, [account])

  const loadAccount = async () => {
    if (!auth.idToken) {
      setStatus('Sign in to manage host payments.')
      return
    }
    if (!hostId) {
      setStatus('No host or business selected.')
      return
    }
    try {
      setLoading(true)
      setStatus('Loading payments profile…')
      const data = await api.fetchOrCreateHostPaymentAccount(hostId, auth.idToken)
      setAccount(data)
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load payments profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.idToken, hostId])

  const handleStripeOnboarding = async () => {
    if (!auth.idToken || !hostId) {
      setStatus('Sign in to continue.')
      return
    }
    try {
      setStatus('Requesting Stripe onboarding link…')
      const link = await api.createHostOnboardingLink(hostId, auth.idToken)
      const url = link.url || link.onboardingLink || link.onboardingUrl
      if (url) {
        window.location.href = url
        return
      }
      setStatus('No onboarding link returned. Please try again.')
    } catch (err: any) {
      setStatus(err?.message || 'Unable to start Stripe onboarding.')
    }
  }

  return (
    <div>
      <SiteNav activePath="/host/payments" />
      <div className="container" style={{ padding: '2.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Host</p>
            <h1 style={{ margin: 0 }}>Payments</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Connect Stripe to sell tickets and get payouts.</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {account && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-body">
                    <p className="card-title" style={{ marginTop: 0 }}>Stripe status</p>
                    <p style={{ margin: 0, color: paymentsReady ? 'var(--primary-blue)' : 'var(--gray-700)' }}>
                      {paymentsReady ? 'Payments ready' : 'Setup required'}
                    </p>
                    <p style={{ color: 'var(--gray-600)', marginTop: '0.35rem' }}>
                      Charges: {account.chargesEnabled || account.charges_enabled ? 'enabled' : 'disabled'} ·
                      Payouts: {account.payoutsEnabled || account.payouts_enabled ? 'enabled' : 'disabled'}
                    </p>
                  </div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-body">
                    <p className="card-title" style={{ marginTop: 0 }}>Account</p>
                    <p style={{ margin: 0, color: 'var(--gray-700)' }}>{account.accountId || account.id || 'Pending'}</p>
                    {account.detailsSubmitted && <p style={{ margin: '0.25rem 0', color: 'var(--gray-600)' }}>Details submitted</p>}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
              <button className="btn btn-primary" onClick={handleStripeOnboarding} disabled={loading}>
                {paymentsReady ? 'Continue Stripe setup' : 'Connect with Stripe'}
              </button>
              <button className="btn btn-secondary" onClick={loadAccount} disabled={loading}>
                Refresh status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

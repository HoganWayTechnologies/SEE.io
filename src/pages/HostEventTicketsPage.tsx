import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api, seeApi, formatEventForDisplay, Event } from '../services/api'
import { useAuth } from '../context/AuthContext'

type TicketForm = {
  name: string
  description: string
  price: string
  capacity: string
  currency: string
  active: boolean
}

const defaultTicketForm: TicketForm = {
  name: '',
  description: '',
  price: '',
  capacity: '',
  currency: 'USD',
  active: true
}

export default function HostEventTicketsPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketingEnabled, setTicketingEnabled] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [status, setStatus] = useState<string | null>('Loading event…')
  const [ticketStatus, setTicketStatus] = useState<string | null>(null)
  const [ticketForm, setTicketForm] = useState<TicketForm>(defaultTicketForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [account, setAccount] = useState<any | null>(null)

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

  const loadEvent = async () => {
    if (!eventId) return
    try {
      setStatus('Loading event…')
      const resp = await seeApi.getEvent(eventId)
      const formatted = formatEventForDisplay(resp)
      setEvent(formatted)
      setTicketingEnabled((formatted.admissionType || '').toLowerCase().includes('ticket'))
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load event.')
    }
  }

  const loadTickets = async () => {
    if (!eventId || !auth.idToken) {
      setTicketStatus('Sign in to manage tickets.')
      return
    }
    setTicketStatus('Loading tickets…')
    try {
      const resp = await api.fetchPublisherTickets(eventId, auth.idToken)
      const list = Array.isArray((resp as any)?.items)
        ? (resp as any).items
        : Array.isArray((resp as any)?.Items)
          ? (resp as any).Items
          : Array.isArray(resp)
            ? resp
            : []
      const mapped = list.map((t: any) => ({
        ...t,
        id: t.id || t.ticketId || t.Id,
        name: t.name || t.Name,
        price: t.price ?? t.Price ?? 0,
        currency: t.currency || t.Currency || 'USD',
        quantityTotal: t.quantityTotal ?? t.QuantityTotal ?? t.quantity ?? 0,
        quantityAvailable: t.quantityAvailable ?? t.QuantityAvailable ?? null,
        status: (t.status || t.Status || 'active').toLowerCase(),
        active: (t.active ?? t.Active ?? true) && (t.status || t.Status || 'active').toLowerCase() === 'active'
      }))
      setTickets(mapped)
      setTicketStatus(mapped.length ? null : 'No ticket types yet.')
    } catch (err: any) {
      setTicketStatus(err?.message || 'Unable to load tickets.')
      setTickets([])
    }
  }

  const loadPayments = async () => {
    if (!auth.idToken || !hostId) return
    try {
      const acct = await api.fetchOrCreateHostPaymentAccount(hostId, auth.idToken)
      setAccount(acct)
    } catch (err) {
      console.warn('payments load failed', err)
    }
  }

  useEffect(() => {
    loadEvent()
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, auth.idToken, hostId])

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, auth.idToken])

  const updateTicketForm = (key: keyof TicketForm, value: string | boolean) => {
    setTicketForm(prev => ({ ...prev, [key]: value } as TicketForm))
  }

  const buildTicketPayload = (form: TicketForm) => {
    const toNumber = (val: string) => {
      const num = Number(val)
      return Number.isFinite(num) ? num : 0
    }
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: toNumber(form.price),
      currency: form.currency || 'USD',
      quantityTotal: Math.max(0, toNumber(form.capacity)),
      status: form.active ? 'active' : 'inactive',
      active: form.active
    }
  }

  const handleCreateTicket = async () => {
    if (!eventId || !auth.idToken) {
      setTicketStatus('Sign in to add tickets.')
      return
    }
    if (!ticketForm.name.trim()) {
      setTicketStatus('Ticket name is required.')
      return
    }
    try {
      setTicketStatus('Creating ticket…')
      await api.createPublisherTicket(eventId, auth.idToken, buildTicketPayload(ticketForm))
      setTicketForm(defaultTicketForm)
      await loadTickets()
      setTicketStatus('Ticket created.')
    } catch (err: any) {
      setTicketStatus(err?.message || 'Unable to create ticket.')
    }
  }

  const handleEditTicket = (ticket: any) => {
    setEditingId(ticket.id)
    setTicketForm({
      name: ticket.name || '',
      description: ticket.description || '',
      price: ticket.price !== undefined ? String(ticket.price) : '',
      capacity: ticket.quantityTotal !== undefined && ticket.quantityTotal !== null ? String(ticket.quantityTotal) : '',
      currency: ticket.currency || 'USD',
      active: ticket.active !== false
    })
  }

  const handleSaveTicket = async () => {
    if (!eventId || !auth.idToken || !editingId) return
    if (!ticketForm.name.trim()) {
      setTicketStatus('Ticket name is required.')
      return
    }
    try {
      setTicketStatus('Updating ticket…')
      await api.updatePublisherTicket(eventId, editingId, auth.idToken, buildTicketPayload(ticketForm))
      setEditingId(null)
      setTicketForm(defaultTicketForm)
      await loadTickets()
      setTicketStatus('Ticket updated.')
    } catch (err: any) {
      setTicketStatus(err?.message || 'Unable to update ticket.')
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!eventId || !auth.idToken) return
    try {
      setTicketStatus('Removing ticket…')
      await api.deletePublisherTicket(eventId, ticketId, auth.idToken)
      await loadTickets()
      setTicketStatus('Ticket removed.')
    } catch (err: any) {
      setTicketStatus(err?.message || 'Unable to remove ticket.')
    }
  }

  const handleToggleTicketing = async (nextEnabled: boolean) => {
    if (!eventId || !auth.idToken) {
      setStatus('Sign in to update ticketing.')
      return
    }
    if (nextEnabled && !paymentsReady) {
      setStatus('Connect Stripe before enabling ticketing.')
      return
    }
    try {
      setStatus(nextEnabled ? 'Enabling ticketing…' : 'Disabling ticketing…')
      const businessId = event?.businessId || (event as any)?.BusinessId || undefined
      await api.updatePublisherEventAuthorized(eventId, { admissionType: nextEnabled ? 'see_ticketed' : 'open' }, auth.idToken, businessId)
      setTicketingEnabled(nextEnabled)
      setStatus(nextEnabled ? 'Ticketing enabled.' : 'Ticketing disabled.')
    } catch (err: any) {
      setStatus(err?.message || 'Unable to update ticketing.')
    }
  }

  return (
    <div>
      <SiteNav activePath="/host/events" />
      <div className="container" style={{ padding: '2.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Host</p>
            <h1 style={{ margin: 0 }}>Ticketing</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>{event?.title || 'Event'} · {event?.date} {event?.time}</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <p className="card-title" style={{ marginTop: 0 }}>Enable SEE ticketing</p>
              <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                {paymentsReady ? 'Stripe connected. Turn on ticketing to start selling.' : 'Connect Stripe payouts before enabling ticketing.'}
              </p>
              {status && <p style={{ color: 'var(--gray-600)', marginTop: '0.35rem' }}>{status}</p>}
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={ticketingEnabled}
                onChange={(e) => handleToggleTicketing(e.target.checked)}
                disabled={!paymentsReady}
              />
              <span className="slider" />
            </label>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p className="card-title" style={{ margin: 0 }}>Ticket types</p>
                {ticketStatus && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{ticketStatus}</p>}
              </div>
              <button className="btn btn-secondary" onClick={loadTickets}>Refresh</button>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              {tickets.map(ticket => (
                <div key={ticket.id} className="card" style={{ margin: 0 }}>
                  <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <p className="card-title" style={{ marginTop: 0 }}>{ticket.name}</p>
                      <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                        {ticket.currency} {ticket.price} · {ticket.quantityAvailable ?? ticket.quantityTotal} remaining
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', color: ticket.active ? 'var(--primary-blue)' : 'var(--gray-600)' }}>
                        {ticket.active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" onClick={() => handleEditTicket(ticket)}>Edit</button>
                      <button className="btn btn-secondary" onClick={() => handleDeleteTicket(ticket.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <p className="card-title" style={{ marginTop: 0 }}>{editingId ? 'Edit ticket' : 'Add ticket'}</p>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={ticketForm.name} onChange={(e) => updateTicketForm('name', e.target.value)} placeholder="General Admission" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price</label>
                  <input className="form-input" type="number" min="0" value={ticketForm.price} onChange={(e) => updateTicketForm('price', e.target.value)} placeholder="20" />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <input className="form-input" value={ticketForm.currency} onChange={(e) => updateTicketForm('currency', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input className="form-input" type="number" min="0" value={ticketForm.capacity} onChange={(e) => updateTicketForm('capacity', e.target.value)} placeholder="100" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={ticketForm.description} onChange={(e) => updateTicketForm('description', e.target.value)} placeholder="Optional blurb for buyers" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="ticket-active"
                  type="checkbox"
                  checked={ticketForm.active}
                  onChange={(e) => updateTicketForm('active', e.target.checked)}
                />
                <label htmlFor="ticket-active" className="form-label" style={{ margin: 0 }}>Active</label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingId ? (
                  <>
                    <button className="btn btn-primary" onClick={handleSaveTicket}>Save changes</button>
                    <button className="btn btn-secondary" onClick={() => { setEditingId(null); setTicketForm(defaultTicketForm) }}>Cancel</button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleCreateTicket}>Add ticket type</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

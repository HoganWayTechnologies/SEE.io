import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import SiteNav from '../components/SiteNav'

type PublisherEvent = {
  id: string
  eventId?: string
  title?: string
  name?: string
  status?: string
  startUtc?: string
  city?: string
  state?: string
  pageVersionId?: string | null
  pageUpdatedAtUtc?: string | null
}

type TicketFormState = {
  name: string
  description: string
  price: string
  currency: string
  quantityTotal: string
  salesStartUtc: string
  salesEndUtc: string
}

const defaultTicketForm: TicketFormState = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  quantityTotal: '',
  salesStartUtc: '',
  salesEndUtc: ''
}

export default function MyEventsPage() {
  const auth = useAuth()
  const [events, setEvents] = useState<PublisherEvent[]>([])
  const [statusMsg, setStatusMsg] = useState<string | null>('Loading events…')
  const [filter, setFilter] = useState('all')
  const [ticketView, setTicketView] = useState<{ [key: string]: any[] }>({})
  const [ticketStatus, setTicketStatus] = useState<{ [key: string]: string | null }>({})
  const [ticketForms, setTicketForms] = useState<{ [key: string]: TicketFormState }>({})
  const [ticketEdits, setTicketEdits] = useState<{ [key: string]: TicketFormState }>({})
  const [editingTickets, setEditingTickets] = useState<{ [key: string]: string | null }>({})
  const [actionStatus, setActionStatus] = useState<{ [key: string]: string | null }>({})
  const attemptedBusinessRefresh = useRef(false)
  const [activeTicketsEvent, setActiveTicketsEvent] = useState<string | null>(null)
  const ensureArray = (value: any): any[] => (Array.isArray(value) ? value : [])
  const businessOptions = useMemo(() => {
    return (auth.businessMemberships || [])
      .map(member => ({
        id: (member.businessId || (member as any).BusinessId || '').toString(),
        name:
          member.businessName ||
          (member as any).BusinessName ||
          member.businessSlug ||
          (member as any).BusinessSlug ||
          'Business'
      }))
      .filter(option => option.id)
  }, [auth.businessMemberships])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    auth.primaryBusinessId || businessOptions[0]?.id || null
  )

  useEffect(() => {
    if (
      auth.businessContextReady &&
      auth.idToken &&
      (!auth.businessMemberships || auth.businessMemberships.length === 0) &&
      !attemptedBusinessRefresh.current
    ) {
      attemptedBusinessRefresh.current = true
      auth.refreshBusinessMemberships().catch(() => {
        attemptedBusinessRefresh.current = false
      })
    }
  }, [auth.businessContextReady, auth.idToken, auth.businessMemberships, auth.refreshBusinessMemberships])

  useEffect(() => {
    if (!selectedBusinessId && businessOptions.length) {
      const defaultBusiness = businessOptions.find(opt => opt.id === auth.primaryBusinessId) || businessOptions[0]
      setSelectedBusinessId(defaultBusiness?.id || null)
    } else if (selectedBusinessId && businessOptions.length) {
      const stillExists = businessOptions.some(opt => opt.id === selectedBusinessId)
      if (!stillExists) {
        const fallback = businessOptions[0]
        setSelectedBusinessId(fallback?.id || null)
      }
    }
  }, [businessOptions, auth.primaryBusinessId, selectedBusinessId])

  const getTicketDraft = (eventId: string): TicketFormState => ticketForms[eventId] || defaultTicketForm
  const setTicketDraft = (eventId: string, field: keyof TicketFormState, value: string) => {
    setTicketForms(prev => ({
      ...prev,
      [eventId]: { ...(prev[eventId] || defaultTicketForm), [field]: value }
    }))
  }
  const resetTicketDraft = (eventId: string) => {
    setTicketForms(prev => ({ ...prev, [eventId]: defaultTicketForm }))
  }
  const getEditKey = (eventId: string, ticketId: string) => `${eventId}:${ticketId}`
  const getEditDraft = (eventId: string, ticketId: string): TicketFormState =>
    ticketEdits[getEditKey(eventId, ticketId)] || defaultTicketForm
  const setEditDraft = (eventId: string, ticketId: string, field: keyof TicketFormState, value: string) => {
    const key = getEditKey(eventId, ticketId)
    setTicketEdits(prev => ({
      ...prev,
      [key]: { ...(prev[key] || defaultTicketForm), [field]: value }
    }))
  }
  const resetEditDraft = (eventId: string, ticketId: string) => {
    const key = getEditKey(eventId, ticketId)
    setTicketEdits(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setEditingTickets(prev => ({ ...prev, [eventId]: null }))
  }
  const convertTicketToForm = (ticket: any): TicketFormState => {
    const toLocalInput = (value?: string | null) => {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const pad = (num: number) => num.toString().padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
    return {
      name: ticket.name || '',
      description: ticket.description || '',
      price: ticket.price !== undefined && ticket.price !== null ? String(ticket.price) : '',
      currency: ticket.currency || 'USD',
      quantityTotal:
        ticket.quantityTotal !== undefined && ticket.quantityTotal !== null
          ? String(ticket.quantityTotal)
          : ticket.quantity !== undefined && ticket.quantity !== null
            ? String(ticket.quantity)
            : '',
      salesStartUtc: toLocalInput(ticket.salesStartUtc || ticket.salesStart || null),
      salesEndUtc: toLocalInput(ticket.salesEndUtc || ticket.salesEnd || null)
    }
  }
  const buildTicketPayload = (form: TicketFormState) => {
    const toIso = (value: string) => {
      if (!value) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      return date.toISOString()
    }
    const toNumber = (val: string) => {
      const num = Number(val)
      return Number.isFinite(num) && num >= 0 ? num : 0
    }
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: toNumber(form.price),
      currency: form.currency || 'USD',
      quantityTotal: toNumber(form.quantityTotal),
      salesStartUtc: toIso(form.salesStartUtc),
      salesEndUtc: toIso(form.salesEndUtc)
    }
  }

  const loadEvents = useCallback(async () => {
    if (!auth.idToken) {
      setEvents([])
      setStatusMsg('Sign in with a publisher account to see your events.')
      return
    }
    if (!selectedBusinessId) {
      setEvents([])
      setStatusMsg('Select a business to view events.')
      return
    }
    try {
      const resp = await api.fetchPublisherEventsAuthorized(auth.idToken, {
        businessId: selectedBusinessId || undefined,
        status: filter !== 'all' ? filter : undefined
      })
      const listRaw =
        (Array.isArray((resp as any)?.items) && (resp as any).items) ||
        (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
        (Array.isArray((resp as any)?.events) && (resp as any).events) ||
        (Array.isArray(resp) ? resp : [])
      const list = listRaw.map((evt: any) => ({
        ...evt,
        id: evt.id || evt.eventId || evt.Id,
        title: evt.title || evt.Title,
        status: evt.status || evt.Status
      }))
      setEvents(list)
      setStatusMsg(list.length ? null : 'No events yet. Create one to get started.')
    } catch (err: any) {
      setEvents([])
      setStatusMsg(err?.message || 'Unable to load events.')
    }
  }, [auth.idToken, selectedBusinessId, filter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filtered = events.filter(evt => {
    if (filter === 'all') return true
    return (evt.status || '').toLowerCase().includes(filter)
  })

  const loadTicketsForEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setTicketStatus(prev => ({ ...prev, [eventId]: 'Loading tickets…' }))
    try {
      const resp = await api.fetchPublisherTickets(eventId, auth.idToken)
      const rawList =
        (Array.isArray((resp as any)?.items) && (resp as any).items) ||
        (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
        ensureArray(resp)
      const ticketList = rawList.map((t: any) => ({
        ...t,
        id: t.id || t.Id,
        name: t.name || t.Name,
        description: t.description || t.Description,
        price: t.price ?? t.Price ?? 0,
        currency: t.currency || t.Currency || 'USD',
        quantityTotal: t.quantityTotal ?? t.QuantityTotal ?? t.quantity ?? 0,
        quantityAvailable: t.quantityAvailable ?? t.QuantityAvailable ?? null,
        salesStartUtc: t.salesStartUtc || t.SalesStartUtc || t.salesStart || null,
        salesEndUtc: t.salesEndUtc || t.SalesEndUtc || t.salesEnd || null
      }))
      setTicketView(prev => ({ ...prev, [eventId]: ticketList }))
      setTicketForms(prev => (prev[eventId] ? prev : { ...prev, [eventId]: defaultTicketForm }))
      setTicketStatus(prev => ({ ...prev, [eventId]: null }))
      setActiveTicketsEvent(eventId)
    } catch (err: any) {
      setTicketView(prev => ({ ...prev, [eventId]: [] }))
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to load tickets' }))
    }
  }

  const publishEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setActionStatus(prev => ({ ...prev, [eventId]: 'Publishing…' }))
    try {
      await api.publishPublisherEvent(eventId, auth.idToken, selectedBusinessId || undefined)
      setActionStatus(prev => ({ ...prev, [eventId]: 'Published' }))
      await loadEvents()
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [eventId]: err?.message || 'Failed to publish' }))
    }
  }

  const cancelEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setActionStatus(prev => ({ ...prev, [eventId]: 'Canceling…' }))
    try {
      await api.cancelPublisherEvent(eventId, auth.idToken, selectedBusinessId || undefined)
      setActionStatus(prev => ({ ...prev, [eventId]: 'Canceled' }))
      await loadEvents()
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [eventId]: err?.message || 'Failed to cancel' }))
    }
  }

  const viewDiscounts = async (eventId: string) => {
    if (!auth.idToken) return
    setTicketStatus(prev => ({ ...prev, [eventId]: 'Loading discounts…' }))
    try {
      const discounts = await api.fetchDiscounts(eventId, auth.idToken)
      setTicketView(prev => ({ ...prev, [`discounts-${eventId}`]: discounts }))
      setTicketStatus(prev => ({ ...prev, [eventId]: null }))
    } catch (err: any) {
      setTicketView(prev => ({ ...prev, [`discounts-${eventId}`]: [] }))
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to load discounts' }))
    }
  }

  const handleCreateTicket = async (eventId: string) => {
    if (!auth.idToken) return
    const draft = getTicketDraft(eventId)
    if (!draft.name.trim()) {
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Ticket name is required.' }))
      return
    }
    try {
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Creating ticket…' }))
      await api.createPublisherTicket(eventId, auth.idToken, buildTicketPayload(draft))
      resetTicketDraft(eventId)
      await loadTicketsForEvent(eventId)
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Ticket created.' }))
    } catch (err: any) {
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to create ticket' }))
    }
  }

  const handleStartEditTicket = (eventId: string, ticket: any) => {
    setEditingTickets(prev => ({ ...prev, [eventId]: ticket.id }))
    setTicketEdits(prev => ({
      ...prev,
      [getEditKey(eventId, ticket.id)]: convertTicketToForm(ticket)
    }))
  }

  const handleSaveTicketEdit = async (eventId: string, ticketId: string) => {
    if (!auth.idToken) return
    const form = getEditDraft(eventId, ticketId)
    if (!form.name.trim()) {
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Ticket name is required.' }))
      return
    }
    try {
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Updating ticket…' }))
      await api.updatePublisherTicket(eventId, ticketId, auth.idToken, buildTicketPayload(form))
      resetEditDraft(eventId, ticketId)
      await loadTicketsForEvent(eventId)
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Ticket updated.' }))
    } catch (err: any) {
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to update ticket' }))
    }
  }

  const handleDeleteTicket = async (eventId: string, ticketId: string) => {
    if (!auth.idToken) return
    try {
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Removing ticket…' }))
      await api.deletePublisherTicket(eventId, ticketId, auth.idToken)
      await loadTicketsForEvent(eventId)
      setTicketStatus(prev => ({ ...prev, [eventId]: 'Ticket removed.' }))
    } catch (err: any) {
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to remove ticket' }))
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher/events"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/publisher/events', label: 'My Events' },
          { to: '/saved', label: 'Saved' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Events</h1>
            <p style={{ color: 'var(--gray-600)' }}>Drafts, pending approval, approved, and expired events you manage.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Business</label>
              <select
                className="form-input"
                value={selectedBusinessId || ''}
                onChange={(e) => setSelectedBusinessId(e.target.value || null)}
                style={{ minWidth: '220px' }}
              >
                {!selectedBusinessId && <option value="" disabled>Select a business</option>}
                {businessOptions.map(option => (
                  <option key={option.id || option.name} value={option.id || ''}>
                    {option.name || option.id || 'Business'}
                  </option>
                ))}
              </select>
            </div>
            <Link to="/publisher" className="btn btn-secondary">Publisher Console</Link>
            <Link to="/publisher/events/new" className="btn btn-primary">Create Event</Link>
          </div>
        </header>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected', 'expired', 'draft'].map(key => (
              <button
                key={key}
                className={`chip ${filter === key ? 'chip-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {statusMsg && <p style={{ color: 'var(--gray-600)' }}>{statusMsg}</p>}
            {!statusMsg && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Title</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>Location</th>
                    <th>Tickets</th>
                    <th>Discounts</th>
                    <th>Actions</th>
                    <th>Builder</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(evt => (
                    <tr key={evt.id || evt.eventId} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>{evt.title || evt.name || 'Untitled'}</td>
                      <td><span className={`badge badge-${(evt.status || 'pending').toLowerCase()}`}>{evt.status || 'pending'}</span></td>
                      <td>{evt.startUtc || 'TBD'}</td>
                      <td>{evt.city || evt.state ? `${evt.city || ''}${evt.state ? ', ' + evt.state : ''}` : '—'}</td>
                      <td style={{ minWidth: '300px' }}>
                        {activeTicketsEvent === (evt.id || evt.eventId || '') ? (
                          <div className="card">
                            <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0 }}>Ticket Manager</h4>
                                <button className="btn btn-secondary" type="button" onClick={() => setActiveTicketsEvent(null)}>Close</button>
                              </div>
                              {ticketStatus[evt.id || evt.eventId || ''] && (
                                <p style={{ color: 'var(--gray-600)', margin: 0 }}>{ticketStatus[evt.id || evt.eventId || '']}</p>
                              )}
                              <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {ensureArray(ticketView[evt.id || evt.eventId || '']).length === 0 && (
                                  <p style={{ color: 'var(--gray-600)', margin: 0 }}>No ticket types yet.</p>
                                )}
                                {ensureArray(ticketView[evt.id || evt.eventId || '']).map((ticket: any) => {
                                  const sold = ticket.quantityTotal != null && ticket.quantityAvailable != null
                                    ? Math.max(ticket.quantityTotal - ticket.quantityAvailable, 0)
                                    : null
                                  return (
                                    <div key={ticket.id} className="card">
                                      <div className="card-body" style={{ display: 'grid', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                          <div>
                                            <strong>{ticket.name || 'Ticket'}</strong>
                                            <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                              {ticket.currency || 'USD'} {ticket.price ?? '--'} · Total {ticket.quantityTotal ?? '--'}
                                              {sold !== null ? ` · Sold ${sold}` : ''}
                                              {ticket.quantityAvailable != null ? ` · Available ${ticket.quantityAvailable}` : ''}
                                            </div>
                                            {(ticket.salesStartUtc || ticket.salesEndUtc) && (
                                              <div style={{ color: 'var(--gray-600)', fontSize: '0.8rem' }}>
                                                Window: {ticket.salesStartUtc || '—'} → {ticket.salesEndUtc || '—'}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <button className="btn btn-secondary" type="button" onClick={() => handleStartEditTicket(evt.id || evt.eventId || '', ticket)}>Edit</button>
                                            <button className="btn btn-secondary" type="button" onClick={() => handleDeleteTicket(evt.id || evt.eventId || '', ticket.id)}>Delete</button>
                                          </div>
                                        </div>
                                        {editingTickets[evt.id || evt.eventId || ''] === ticket.id && (
                                          <div style={{ display: 'grid', gap: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '0.5rem' }}>
                                            <input
                                              className="form-input"
                                              placeholder="Name"
                                              value={getEditDraft(evt.id || evt.eventId || '', ticket.id).name}
                                              onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'name', e.target.value)}
                                            />
                                            <textarea
                                              className="form-input"
                                              rows={2}
                                              placeholder="Description"
                                              value={getEditDraft(evt.id || evt.eventId || '', ticket.id).description}
                                              onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'description', e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <input
                                                className="form-input"
                                                style={{ flex: 1 }}
                                                placeholder="Price"
                                                value={getEditDraft(evt.id || evt.eventId || '', ticket.id).price}
                                                onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'price', e.target.value)}
                                              />
                                              <input
                                                className="form-input"
                                                style={{ width: '120px' }}
                                                placeholder="Currency"
                                                value={getEditDraft(evt.id || evt.eventId || '', ticket.id).currency}
                                                onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'currency', e.target.value)}
                                              />
                                              <input
                                                className="form-input"
                                                style={{ width: '140px' }}
                                                placeholder="Quantity"
                                                value={getEditDraft(evt.id || evt.eventId || '', ticket.id).quantityTotal}
                                                onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'quantityTotal', e.target.value)}
                                              />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <input
                                                className="form-input"
                                                type="datetime-local"
                                                value={getEditDraft(evt.id || evt.eventId || '', ticket.id).salesStartUtc}
                                                onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'salesStartUtc', e.target.value)}
                                              />
                                              <input
                                                className="form-input"
                                                type="datetime-local"
                                                value={getEditDraft(evt.id || evt.eventId || '', ticket.id).salesEndUtc}
                                                onChange={(e) => setEditDraft(evt.id || evt.eventId || '', ticket.id, 'salesEndUtc', e.target.value)}
                                              />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <button className="btn btn-primary" type="button" onClick={() => handleSaveTicketEdit(evt.id || evt.eventId || '', ticket.id)}>Save</button>
                                              <button className="btn btn-secondary" type="button" onClick={() => resetEditDraft(evt.id || evt.eventId || '', ticket.id)}>Cancel</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="card" style={{ border: '1px dashed var(--gray-200)' }}>
                                <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
                                  <h4 style={{ margin: 0 }}>Add ticket type</h4>
                                  <input
                                    className="form-input"
                                    placeholder="Ticket name"
                                    value={getTicketDraft(evt.id || evt.eventId || '').name}
                                    onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'name', e.target.value)}
                                  />
                                  <textarea
                                    className="form-input"
                                    rows={2}
                                    placeholder="Description"
                                    value={getTicketDraft(evt.id || evt.eventId || '').description}
                                    onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'description', e.target.value)}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <input
                                      className="form-input"
                                      placeholder="Price"
                                      value={getTicketDraft(evt.id || evt.eventId || '').price}
                                      onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'price', e.target.value)}
                                    />
                                    <input
                                      className="form-input"
                                      style={{ width: '120px' }}
                                      placeholder="Currency"
                                      value={getTicketDraft(evt.id || evt.eventId || '').currency}
                                      onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'currency', e.target.value)}
                                    />
                                    <input
                                      className="form-input"
                                      style={{ width: '140px' }}
                                      placeholder="Quantity"
                                      value={getTicketDraft(evt.id || evt.eventId || '').quantityTotal}
                                      onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'quantityTotal', e.target.value)}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <input
                                      className="form-input"
                                      type="datetime-local"
                                      value={getTicketDraft(evt.id || evt.eventId || '').salesStartUtc}
                                      onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'salesStartUtc', e.target.value)}
                                    />
                                    <input
                                      className="form-input"
                                      type="datetime-local"
                                      value={getTicketDraft(evt.id || evt.eventId || '').salesEndUtc}
                                      onChange={(e) => setTicketDraft(evt.id || evt.eventId || '', 'salesEndUtc', e.target.value)}
                                    />
                                  </div>
                                  <button className="btn btn-primary" type="button" onClick={() => handleCreateTicket(evt.id || evt.eventId || '')}>
                                    Save ticket type
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => loadTicketsForEvent(evt.id || evt.eventId || '')}>
                            Manage tickets
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <a
                            className="nav-link"
                            href={`/event/${evt.id || evt.eventId || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View page
                          </a>
                          <Link to={`/publisher/events/${evt.id || evt.eventId || ''}/edit`} className="nav-link">Edit details</Link>
                          {!(evt.status || '').toLowerCase().includes('canceled') && !(evt.status || '').toLowerCase().includes('rejected') && (
                            <>
                              <Link to={`/publisher/events/${evt.id || evt.eventId || ''}`} className="nav-link">Manage</Link>
                              <button className="btn btn-secondary" onClick={() => publishEvent(evt.id || evt.eventId || '')}>Publish</button>
                              <button className="btn btn-secondary" onClick={() => cancelEvent(evt.id || evt.eventId || '')}>Cancel</button>
                              <Link to={`/publisher/events/${evt.id || evt.eventId || ''}/page`} className="btn btn-secondary">
                                Page builder
                              </Link>
                            </>
                          )}
                        </div>
                        {actionStatus[evt.id || evt.eventId || ''] && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                            {actionStatus[evt.id || evt.eventId || '']}
                          </div>
                        )}
                      </td>
                      <td>
                        {ticketView[`discounts-${evt.id || evt.eventId || ''}`] ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                            {ticketView[`discounts-${evt.id || evt.eventId || ''}`].length === 0 && 'No discounts'}
                            {ticketView[`discounts-${evt.id || evt.eventId || ''}`].length > 0 && ticketView[`discounts-${evt.id || evt.eventId || ''}`].map((d: any) => d.code || 'Discount').join(', ')}
                            {ticketStatus[evt.id || evt.eventId || ''] && <div style={{ color: 'var(--gray-600)' }}>{ticketStatus[evt.id || evt.eventId || '']}</div>}
                          </div>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => viewDiscounts(evt.id || evt.eventId || '')}>
                            View discounts
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from './AuthContext'

type RealtimeEvent =
  | 'ticketStatusUpdated'
  | 'ticketDelivery'
  | 'rsvpSummaryUpdated'
  | 'sessionRevoked'
  | 'notification'

type Handler = (payload: any) => void

type RealtimeContextValue = {
  connected: boolean
  joinEvent: (eventId: string) => Promise<void>
  leaveEvent: (eventId: string) => Promise<void>
  addListener: (event: RealtimeEvent, handler: Handler) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  joinEvent: async () => {},
  leaveEvent: async () => {},
  addListener: () => () => {}
})

const HUB_PATH = '/ws/updates'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { idToken, sessionId, signOut } = useAuth()
  const [connected, setConnected] = useState(false)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const listenersRef = useRef<Map<RealtimeEvent, Set<Handler>>>(new Map())

  const notify = (event: RealtimeEvent, payload: any) => {
    const set = listenersRef.current.get(event)
    if (!set) return
    set.forEach(handler => {
      try {
        handler(payload)
      } catch (err) {
        console.warn('Realtime handler error', err)
      }
    })
  }

  const addListener = (event: RealtimeEvent, handler: Handler) => {
    const map = listenersRef.current
    if (!map.has(event)) map.set(event, new Set())
    map.get(event)!.add(handler)
    return () => {
      map.get(event)?.delete(handler)
    }
  }

  const hubUrl = useMemo(() => {
    if (typeof import.meta !== 'undefined') {
      const base = (import.meta as any).env?.VITE_SEE_API_URL || ''
      if (base) return `${base.replace(/\/$/, '')}${HUB_PATH}`
    }
    // fallback to relative
    return `${HUB_PATH}`
  }, [])

  useEffect(() => {
    const connect = async () => {
      if (!idToken) {
        if (connectionRef.current) {
          try {
            await connectionRef.current.stop()
          } catch {}
          connectionRef.current = null
        }
        setConnected(false)
        return
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => idToken,
          headers: sessionId ? { 'X-Session-Id': sessionId } : undefined
        })
        .withAutomaticReconnect()
        .build()

      connection.on('ticketStatusUpdated', (payload) => notify('ticketStatusUpdated', payload))
      connection.on('ticketDelivery', (payload) => notify('ticketDelivery', payload))
      connection.on('rsvpSummaryUpdated', (payload) => notify('rsvpSummaryUpdated', payload))
      connection.on('sessionRevoked', (payload) => {
        notify('sessionRevoked', payload)
        signOut()
      })
      connection.on('notification', (payload) => notify('notification', payload))

      connection.onreconnected(() => setConnected(true))
      connection.onclose(() => setConnected(false))

      try {
        await connection.start()
        setConnected(true)
        connectionRef.current = connection
      } catch (err) {
        console.warn('Realtime connection failed', err)
        setConnected(false)
        connectionRef.current = null
      }
    }
    connect()
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {})
        connectionRef.current = null
      }
    }
  }, [idToken, sessionId, hubUrl])

  const joinEvent = async (eventId: string) => {
    if (!connectionRef.current) return
    try {
      await connectionRef.current.invoke('SubscribeEvent', eventId)
    } catch (err) {
      console.warn('SubscribeEvent failed', err)
    }
  }

  const leaveEvent = async (eventId: string) => {
    if (!connectionRef.current) return
    try {
      await connectionRef.current.invoke('UnsubscribeEvent', eventId)
    } catch (err) {
      console.warn('UnsubscribeEvent failed', err)
    }
  }

  return (
    <RealtimeContext.Provider value={{ connected, joinEvent, leaveEvent, addListener }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export const useRealtime = () => useContext(RealtimeContext)

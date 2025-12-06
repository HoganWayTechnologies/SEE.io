import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, EventReport, UserNotification, getUserIdFromProfile } from '../services/api'
import { useAuth } from './AuthContext'
import { useRealtime } from './RealtimeContext'

type NotificationContextValue = {
  notifications: UserNotification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => void
  pushNotification: (note: UserNotification) => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAllRead: () => {},
  pushNotification: () => {}
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { idToken, profile } = useAuth()
  const realtime = useRealtime()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const userId = getUserIdFromProfile(profile)
      if (!idToken || !userId) {
        setNotifications([])
        return
      }
      setLoading(true)
      try {
        const resp = await api.fetchNotifications(userId, idToken)
        // truncate to latest 10
        const items = Array.isArray(resp) ? resp.slice(0, 10) : []
        setNotifications(items)
      } catch (err) {
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [idToken, profile])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true } as any)))
  }

  const pushNotification = (note: UserNotification) => {
    setNotifications(prev => {
      const next = [note, ...prev]
      return next.slice(0, 10)
    })
  }

  useEffect(() => {
    const unsub = realtime.addListener('notification', (payload: any) => {
      pushNotification({
        id: payload.id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        createdAt: payload.createdAt,
        metadata: payload.metadata,
        read: false
      } as any)
    })
    return () => unsub()
  }, [realtime])

  const unreadCount = notifications.filter((n: any) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAllRead, pushNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

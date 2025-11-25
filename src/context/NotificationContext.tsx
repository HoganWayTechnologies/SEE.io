import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, EventReport, UserNotification, getUserIdFromProfile } from '../services/api'
import { useAuth } from './AuthContext'

type NotificationContextValue = {
  notifications: UserNotification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAllRead: () => {}
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { idToken, profile } = useAuth()
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

  const unreadCount = notifications.filter((n: any) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

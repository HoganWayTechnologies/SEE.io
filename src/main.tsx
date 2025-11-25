import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Discover from './pages/Discover'
import EventPage from './pages/EventPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import PreferencesPage from './pages/PreferencesPage'
import PublisherDashboard from './pages/PublisherDashboard'
import ReportsPage from './pages/ReportsPage'
import SavedPage from './pages/SavedPage'
import TicketsPage from './pages/TicketsPage'
import InboxPage from './pages/InboxPage'
import CalendarPage from './pages/CalendarPage'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import MyEventsPage from './pages/MyEventsPage'
import CreateEventPage from './pages/CreateEventPage'
import PageBuilderPage from './pages/PageBuilderPage'
import './styles.css'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <BrowserRouter basename="/">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/event/:id" element={<EventPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/preferences" element={<PreferencesPage />} />
            <Route path="/publisher" element={<PublisherDashboard />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/publisher/create" element={<CreateEventPage />} />
            <Route path="/publisher/events/:eventId/page" element={<PageBuilderPage />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </NotificationProvider>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

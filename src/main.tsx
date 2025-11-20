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
import './styles.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import RequireOnboarding from './components/RequireOnboarding'
import ScrollToTop from './components/ScrollToTop'
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
import CategoryPage from './pages/CategoryPage'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { RealtimeProvider } from './context/RealtimeContext'
import MyEventsPage from './pages/MyEventsPage'
import CreateEventPage from './pages/CreateEventPage'
import PageBuilderPage from './pages/PageBuilderPage'
import BusinessPageBuilder from './pages/BusinessPageBuilder'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import DmcaPage from './pages/DmcaPage'
import BusinessAgreementPage from './pages/BusinessAgreementPage'
import StripeTermsPage from './pages/StripeTermsPage'
import TrademarksPage from './pages/TrademarksPage'
import PlaylistsPage from './pages/PlaylistsPage'
import BusinessProfilePage from './pages/BusinessProfilePage'
import OnboardingRouter from './onboarding/OnboardingRouter'
import './styles.css'

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <BrowserRouter basename="/">
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/playlists" element={<PlaylistsPage />} />
                <Route path="/event/:id" element={<EventPage />} />
                <Route path="/categories/:categoryId" element={<CategoryPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<OnboardingRouter />} />
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
                <Route path="/publisher/business/:businessId/page" element={<BusinessPageBuilder />} />
                <Route path="/publisher/business/page" element={<BusinessPageBuilder />} />
                <Route path="/business/:businessId" element={<BusinessProfilePage />} />
                <Route path="/legal/terms" element={<TermsPage />} />
                <Route path="/legal/privacy" element={<PrivacyPage />} />
                <Route path="/legal/dmca" element={<DmcaPage />} />
                <Route path="/legal/business-agreement" element={<BusinessAgreementPage />} />
                <Route path="/legal/stripe-terms" element={<StripeTermsPage />} />
                <Route path="/legal/trademarks" element={<TrademarksPage />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </NotificationProvider>
      </RealtimeProvider>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

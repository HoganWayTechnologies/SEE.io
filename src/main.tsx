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
import VenuesPage from './pages/VenuesPage'
import VenueDetailPage from './pages/VenueDetailPage'
import HostVenueManagePage from './pages/HostVenueManagePage'
import HostPaymentsPage from './pages/HostPaymentsPage'
import HostEventTicketsPage from './pages/HostEventTicketsPage'
import TicketSuccessPage from './pages/TicketSuccessPage'
import HostScanPage from './pages/HostScanPage'
import HostAnalyticsPage from './pages/HostAnalyticsPage'
import EventAnalyticsPage from './pages/EventAnalyticsPage'
import VenueAnalyticsPage from './pages/VenueAnalyticsPage'
import NotAuthorizedPage from './pages/NotAuthorizedPage'
import { RequireAuth, RequireBusiness, RequireAdmin } from './components/RouteGuards'
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
                <Route path="/events/:eventId/tickets/success" element={<TicketSuccessPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/venues/:id" element={<VenueDetailPage />} />
                <Route path="/categories/:categoryId" element={<CategoryPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<OnboardingRouter />} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/preferences" element={<RequireAuth><PreferencesPage /></RequireAuth>} />
                <Route path="/publisher" element={<RequireBusiness><PublisherDashboard /></RequireBusiness>} />
                <Route path="/reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
                <Route path="/saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
                <Route path="/tickets" element={<RequireAuth><TicketsPage /></RequireAuth>} />
                <Route path="/host/payments" element={<RequireBusiness><HostPaymentsPage /></RequireBusiness>} />
                <Route path="/host/venues/:id/manage" element={<RequireBusiness><HostVenueManagePage /></RequireBusiness>} />
                <Route path="/host/events/:eventId/tickets" element={<RequireBusiness><HostEventTicketsPage /></RequireBusiness>} />
                <Route path="/host/scan" element={<RequireBusiness><HostScanPage /></RequireBusiness>} />
                <Route path="/host/events/:eventId/scan" element={<RequireBusiness><HostScanPage /></RequireBusiness>} />
                <Route path="/host/analytics" element={<RequireBusiness><HostAnalyticsPage /></RequireBusiness>} />
                <Route path="/host/events/:eventId/analytics" element={<RequireBusiness><EventAnalyticsPage /></RequireBusiness>} />
                <Route path="/host/venues/:venueId/analytics" element={<RequireBusiness><VenueAnalyticsPage /></RequireBusiness>} />
                <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
                <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
                <Route path="/my-events" element={<RequireBusiness><MyEventsPage /></RequireBusiness>} />
                <Route path="/publisher/create" element={<RequireBusiness><CreateEventPage /></RequireBusiness>} />
                <Route path="/publisher/events/:eventId/page" element={<RequireBusiness><PageBuilderPage /></RequireBusiness>} />
                <Route path="/publisher/business/:businessId/page" element={<RequireBusiness><BusinessPageBuilder /></RequireBusiness>} />
                <Route path="/publisher/business/page" element={<RequireBusiness><BusinessPageBuilder /></RequireBusiness>} />
                <Route path="/business/:businessId" element={<BusinessProfilePage />} />
                <Route path="/legal/terms" element={<TermsPage />} />
                <Route path="/legal/privacy" element={<PrivacyPage />} />
                <Route path="/legal/dmca" element={<DmcaPage />} />
                <Route path="/legal/business-agreement" element={<BusinessAgreementPage />} />
                <Route path="/legal/stripe-terms" element={<StripeTermsPage />} />
                <Route path="/legal/trademarks" element={<TrademarksPage />} />
                <Route path="/403" element={<NotAuthorizedPage />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </NotificationProvider>
      </RealtimeProvider>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth.js';
import { SessionProvider } from './auth/SessionProvider.js';
import { ThemeProvider } from './components/ThemeProvider.js';
import { MobileTabBar } from './components/nav/MobileTabBar.js';
import { TenantHeader } from './components/nav/TenantHeader.js';
import { StateView } from './components/ui/StateView.js';
import { useTenantShell } from './hooks/useTenantShell.js';
import AuthCallback from './pages/auth/AuthCallback.js';
import Login from './pages/login/Login.js';

const PortfolioViewer = lazy(() => import('./pages/viewer/PortfolioViewer.js'));
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.js'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome.js'));
const GalleryManager = lazy(() => import('./pages/dashboard/content/GalleryManager.js'));
const ThemeEditor = lazy(() => import('./pages/dashboard/settings/ThemeEditor.js'));
const PricingPage = lazy(() => import('./features/pricing/PricingPage.js'));
const CollectionsPage = lazy(() => import('./features/collections/CollectionsPage.js'));
const PortfolioPage = lazy(() => import('./features/portfolio/PortfolioPage.js'));
const DiscoverPage = lazy(() => import('./features/discover/DiscoverPage.js'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage.js'));
const StudioDashboard = lazy(() => import('./features/studio/DashboardPage.js'));
const SearchPage = lazy(() => import('./features/search/SearchPage.js'));
const CommunityPage = lazy(() => import('./features/community/CommunityPage.js'));
const ClientGalleryPage = lazy(() => import('./features/client/ClientGalleryPage.js'));
const UploadPage = lazy(() => import('./features/studio/UploadPage.js'));
const AnalyticsPage = lazy(() => import('./features/studio/AnalyticsPage.js'));
const LightboxPage = lazy(() => import('./features/lightbox/LightboxPage.js'));
const ChatPage = lazy(() => import('./features/chat/ChatPage.js'));
const GalleryBuilderPage = lazy(() => import('./features/studio/GalleryBuilderPage.js'));
const OrdersPage = lazy(() => import('./features/studio/OrdersPage.js'));
const SettingsLayout = lazy(() => import('./features/studio/settings/SettingsLayout.js'));
const ProfileSettings = lazy(() => import('./features/studio/settings/ProfileSettings.js'));
const BrandingSettings = lazy(() => import('./features/studio/settings/BrandingSettings.js'));
const DomainSettings = lazy(() => import('./features/studio/settings/DomainSettings.js'));
const BillingSettings = lazy(() => import('./features/studio/settings/BillingSettings.js'));
const NotificationsSettings = lazy(() => import('./features/studio/settings/NotificationsSettings.js'));

function RouteFallback() {
  return <StateView variant="loading" title="Loading…" fullScreen />;
}

/**
 * AppShell renders the route tree and the correct global nav.
 * It must be a child of BrowserRouter/SessionProvider/ThemeProvider so
 * hooks that depend on those contexts (useTenantShell, useCartStore, etc.)
 * work correctly.
 */
function AppShell() {
  const { isTenantHost } = useTenantShell();

  return (
    <Suspense fallback={<RouteFallback />}>
      {isTenantHost && <TenantHeader />}
      <Routes>
        <Route path="/" element={<PortfolioViewer />} />
        <Route path="/p/*" element={<PortfolioViewer />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/portfolio/:handle" element={<PortfolioPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/studio/dashboard" element={<StudioDashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/client/:shareToken" element={<ClientGalleryPage />} />
        <Route path="/studio/upload" element={<UploadPage />} />
        <Route path="/studio/analytics" element={<AnalyticsPage />} />
        <Route path="/lightbox" element={<LightboxPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/studio/builder" element={<GalleryBuilderPage />} />
        <Route path="/studio/orders" element={<OrdersPage />} />

        {/* Studio settings */}
        <Route path="/studio/settings" element={<Navigate to="/studio/settings/profile" replace />} />
        <Route path="/studio/settings" element={<SettingsLayout />}>
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="branding" element={<BrandingSettings />} />
          <Route path="domain" element={<DomainSettings />} />
          <Route path="billing" element={<BillingSettings />} />
          <Route path="notifications" element={<NotificationsSettings />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="content" element={<GalleryManager />} />
            <Route path="theme" element={<ThemeEditor />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isTenantHost && <MobileTabBar />}
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;

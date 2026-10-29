import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth.js';
import { SessionProvider } from './auth/SessionProvider.js';
import { ThemeProvider } from './components/ThemeProvider.js';
import { MobileTabBar } from './components/nav/MobileTabBar.js';
import { StateView } from './components/ui/StateView.js';
import AuthCallback from './pages/auth/AuthCallback.js';
import ClientLogin from './pages/client-login/ClientLogin.js';
import Login from './pages/login/Login.js';

const PortfolioViewer = lazy(() => import('./pages/viewer/PortfolioViewer.js'));
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
const PostDetailPage = lazy(() => import('./features/community/PostDetailPage.js'));
const OrdersPage = lazy(() => import('./features/studio/OrdersPage.js'));
const ClientGallery = lazy(() => import('./pages/viewer/ClientGallery.js'));
const CartPage = lazy(() => import('./features/checkout/CartPage.js'));
const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage.js'));
const OrderPage = lazy(() => import('./features/checkout/OrderPage.js'));
const SettingsLayout = lazy(() => import('./features/studio/settings/SettingsLayout.js'));
const ProfileSettings = lazy(() => import('./features/studio/settings/ProfileSettings.js'));
const BrandingSettings = lazy(() => import('./features/studio/settings/BrandingSettings.js'));
const DomainSettings = lazy(() => import('./features/studio/settings/DomainSettings.js'));
const BillingSettings = lazy(() => import('./features/studio/settings/BillingSettings.js'));
const NotificationsSettings = lazy(() => import('./features/studio/settings/NotificationsSettings.js'));

function RouteFallback() {
  return <StateView variant="loading" title="Loading…" fullScreen />;
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <ThemeProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PortfolioViewer />} />
            <Route path="/p/*" element={<PortfolioViewer />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/portfolio/:handle" element={<PortfolioPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/lightbox" element={<LightboxPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/studio/dashboard" element={<StudioDashboard />} />
              <Route path="/studio/upload" element={<UploadPage />} />
              <Route path="/studio/analytics" element={<AnalyticsPage />} />
              <Route path="/studio/builder" element={<GalleryBuilderPage />} />
              <Route path="/studio/orders" element={<OrdersPage />} />
              <Route path="/studio/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="branding" element={<BrandingSettings />} />
                <Route path="domain" element={<DomainSettings />} />
                <Route path="billing" element={<BillingSettings />} />
                <Route path="notifications" element={<NotificationsSettings />} />
              </Route>
              <Route path="/chat" element={<ChatPage />} />
            </Route>

            <Route path="/search" element={<SearchPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/posts/:id" element={<PostDetailPage />} />
            <Route path="/client/:shareToken" element={<ClientGalleryPage />} />
            <Route path="/gallery/:shareToken" element={<ClientGallery />} />

            <Route path="/dashboard" element={<Navigate to="/studio/dashboard" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/studio/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <MobileTabBar />
        </Suspense>
        </ThemeProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;

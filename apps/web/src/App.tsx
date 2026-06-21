import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth.js';
import { SessionProvider } from './auth/SessionProvider.js';
import { StateView } from './components/ui/StateView.js';
import AuthCallback from './pages/auth/AuthCallback.js';
import Login from './pages/login/Login.js';

const PortfolioViewer = lazy(() => import('./pages/viewer/PortfolioViewer.js'));
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.js'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome.js'));
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

function RouteFallback() {
  return <StateView variant="loading" title="Loading…" fullScreen />;
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
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
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/studio/dashboard" element={<StudioDashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/client/:shareToken" element={<ClientGalleryPage />} />
            <Route path="/studio/upload" element={<UploadPage />} />
            <Route path="/studio/analytics" element={<AnalyticsPage />} />
            <Route path="/lightbox" element={<LightboxPage />} />
            <Route path="/chat" element={<ChatPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;

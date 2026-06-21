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
            <Route path="/portfolio/:handle" element={<PortfolioPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

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

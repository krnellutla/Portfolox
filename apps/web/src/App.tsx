import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth.js';
import { SessionProvider } from './auth/SessionProvider.js';
import AuthCallback from './pages/auth/AuthCallback.js';
import Login from './pages/login/Login.js';

const PortfolioViewer = lazy(() => import('./pages/viewer/PortfolioViewer.js'));
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.js'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome.js'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PortfolioViewer />} />
            <Route path="/p/*" element={<PortfolioViewer />} />
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

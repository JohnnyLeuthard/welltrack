import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

// Lazy-load TrendsPage so Recharts is split into a separate chunk and excluded
// from the initial bundle. The page is rarely the entry point, so the small
// waterfall on first visit is an acceptable trade-off.
const TrendsPage = lazy(() => import('./pages/TrendsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes — all wrapped in the app layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="/trends"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>}>
                    <TrendsPage />
                  </Suspense>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

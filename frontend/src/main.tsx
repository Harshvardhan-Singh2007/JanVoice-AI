import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './features/auth/AuthContext';
import { CitizenLayout } from './components/citizen/CitizenLayout';
import './styles/index.css';

const LandingPage = lazy(() => import('./app/App').then((module) => ({ default: module.LandingPage })));
const CitizenHome = lazy(() => import('./pages/CitizenPages').then((module) => ({ default: module.CitizenHome })));
const ReportIssuePage = lazy(() => import('./pages/CitizenPages').then((module) => ({ default: module.ReportIssuePage })));
const MyReportsPage = lazy(() => import('./pages/CitizenReportPages').then((module) => ({ default: module.MyReportsPage })));
const NotificationsPage = lazy(() => import('./pages/CitizenReportPages').then((module) => ({ default: module.NotificationsPage })));
const CitizenPlaceholder = lazy(() => import('./pages/CitizenReportPages').then((module) => ({ default: module.CitizenPlaceholder })));
const AuthorityDashboard = lazy(() => import('./pages/Dashboards').then((module) => ({ default: module.AuthorityDashboard })));
const AdminDashboardPage = lazy(() => import('./pages/Dashboards').then((module) => ({ default: module.AdminDashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div role="status" className="grid min-h-screen place-items-center text-sm text-slate-500">Loading JAN Voice AI...</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute role="citizen" />}>
              <Route path="/dashboard/citizen" element={<CitizenLayout />}>
                <Route index element={<CitizenHome />} />
                <Route path="report" element={<ReportIssuePage />} />
                <Route path="reports" element={<MyReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<CitizenPlaceholder title="Profile" />} />
                <Route path="settings" element={<CitizenPlaceholder title="Settings" />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute role="authority" />}><Route path="/dashboard/authority" element={<AuthorityDashboard />} /></Route>
            <Route element={<ProtectedRoute role="admin" />}><Route path="/dashboard/admin" element={<AdminDashboardPage />} /></Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

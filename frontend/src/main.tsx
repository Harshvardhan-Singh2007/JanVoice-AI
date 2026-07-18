import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './app/App';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './features/auth/AuthContext';
import { AuthorityDashboard, AdminDashboard } from './pages/Dashboards';
import { CitizenLayout } from './components/citizen/CitizenLayout';
import { CitizenHome, ReportIssuePage } from './pages/CitizenPages';
import { CitizenPlaceholder, MyReportsPage, NotificationsPage } from './pages/CitizenReportPages';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignupPage } from './pages/SignupPage';
import './styles/index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
            <Route element={<ProtectedRoute role="admin" />}><Route path="/dashboard/admin" element={<AdminDashboard />} /></Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

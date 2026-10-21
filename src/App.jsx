import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { titleForPath } from './lib/labels'
import Dashboard from './pages/Dashboard'
import { ConfirmProvider } from './components/ConfirmDialog'
import Toaster from './components/Toaster'
import OfflineBanner from './components/OfflineBanner'
import { LanguageProvider } from './i18n/LanguageContext'
import RouteGuard from './components/RouteGuard'
import Login from './pages/Login'
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPasswordConfirm = lazy(() => import('./pages/ResetPasswordConfirm'))
const SecureAccount = lazy(() => import('./pages/SecureAccount'))
const RemoveAccount = lazy(() => import('./pages/RemoveAccount'))
const FormsList = lazy(() => import('./pages/FormsList'))
const FormBuilder = lazy(() => import('./pages/FormBuilder'))
const FormSubmission = lazy(() => import('./pages/FormSubmission'))
const FormSubmissionsList = lazy(() => import('./pages/FormSubmissionsList'))
const FormSubmissionDetail = lazy(() => import('./pages/FormSubmissionDetail'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const UserForm = lazy(() => import('./pages/UserForm'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const PatientsList = lazy(() => import('./pages/PatientsList'))
const PatientForm = lazy(() => import('./pages/PatientForm'))
const PatientDetail = lazy(() => import('./pages/PatientDetail'))
const MeetingsList = lazy(() => import('./pages/MeetingsList'))
const MeetingDetail = lazy(() => import('./pages/MeetingDetail'))
const MeetingForm = lazy(() => import('./pages/MeetingForm'))
const MeetingRequestForm = lazy(() => import('./pages/MeetingRequestForm'))
const MeetingRequestsList = lazy(() => import('./pages/MeetingRequestsList'))
const AttachmentsList = lazy(() => import('./pages/AttachmentsList'))
const Analytics = lazy(() => import('./pages/Analytics'))
const AuditLogsList = lazy(() => import('./pages/AuditLogsList'))
const ReportsList = lazy(() => import('./pages/ReportsList'))
const VideoConferenceRoom = lazy(() => import('./pages/VideoConferenceRoom'))
const ServiceSettings = lazy(() => import('./pages/ServiceSettings'))
const NewCaseGateway = lazy(() => import('./pages/NewCaseGateway'))
const SecondOpinion = lazy(() => import('./pages/SecondOpinion'))


function AppRoutes() {
  const { loading, authenticated } = useAuth()
  const location = useLocation()

  // Tab title follows the page, so tabs, history and screen readers can tell pages apart
  useEffect(() => {
    document.title = titleForPath(location.pathname)
  }, [location.pathname])

  if (loading) {
    return <div className="loading">Chargement...</div>
  }

  return (
    <Suspense fallback={<div className="loading" role="status">Chargement...</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/second-opinion/:token" element={<SecondOpinion />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordConfirm />} />
      <Route path="/secure-account/:uidb64/:token" element={<SecureAccount />} />
      <Route path="/remove-account/:uidb64/:token" element={<RemoveAccount />} />
      
      <Route element={<Layout />}>
        {authenticated ? (
          <Route element={<RouteGuard />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases/new" element={<NewCaseGateway />} />
            <Route path="/forms" element={<FormsList />} />
            <Route path="/forms/new" element={<FormBuilder />} />
            <Route path="/forms/:id/edit" element={<FormBuilder />} />
            <Route path="/forms/:id/submit" element={<FormSubmission />} />
            <Route path="/forms/:id/submissions" element={<FormSubmissionsList />} />
            <Route path="/forms/:formId/submissions/:submissionId" element={<FormSubmissionDetail />} />
            <Route path="/forms/:id/submissions/:submissionId/edit" element={<FormSubmission />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id" element={<UserProfile />} />
            <Route path="/users/:id/edit" element={<UserForm />} />
            <Route path="/patients" element={<PatientsList />} />

            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:id/edit" element={<PatientForm />} />
            <Route path="/meetings" element={<MeetingsList />} />
            <Route path="/meetings/new" element={<MeetingForm />} />
            <Route path="/meetings/:id" element={<MeetingDetail />} />
            <Route path="/meetings/:id/edit" element={<MeetingForm />} />
            <Route path="/meetings/requests" element={<MeetingRequestsList />} />
            <Route path="/meetings/request" element={<MeetingRequestForm />} />
            <Route path="/attachments" element={<AttachmentsList />} />

            <Route path="/reports" element={<ReportsList />} />
            <Route path="/settings/services" element={<ServiceSettings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit-logs" element={<AuditLogsList />} />
            <Route path="/conference/:roomId" element={<VideoConferenceRoom />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Route>
    </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <ConfirmProvider>
        <AppRoutes />
        <Toaster />
        <OfflineBanner />
      </ConfirmProvider>
    </AuthProvider>
    </LanguageProvider>
  )
}

export default App

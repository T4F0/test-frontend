import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPasswordConfirm from './pages/ResetPasswordConfirm'
import SecureAccount from './pages/SecureAccount'
import RemoveAccount from './pages/RemoveAccount'
import FormsList from './pages/FormsList'
import FormBuilder from './pages/FormBuilder'
import FormSubmission from './pages/FormSubmission'
import FormSubmissionsList from './pages/FormSubmissionsList'
import FormSubmissionDetail from './pages/FormSubmissionDetail'
import UserManagement from './pages/UserManagement'
import UserForm from './pages/UserForm'
import UserProfile from './pages/UserProfile'
import PatientsList from './pages/PatientsList'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import MeetingsList from './pages/MeetingsList'
import MeetingDetail from './pages/MeetingDetail'
import MeetingForm from './pages/MeetingForm'
import MeetingRequestForm from './pages/MeetingRequestForm'
import MeetingRequestsList from './pages/MeetingRequestsList'
import AttachmentsList from './pages/AttachmentsList'
import AuditLogsList from './pages/AuditLogsList'
import ReportsList from './pages/ReportsList'
import VideoConferenceRoom from './pages/VideoConferenceRoom'
import ServiceSettings from './pages/ServiceSettings'


function HomeRedirect() {
  const { user } = useAuth()
  
  if (user?.role === 'MEDECIN_EXPERT') {
    return <Navigate to="/meetings" replace />
  }
  
  if (user?.role === 'MEDECIN') {
    return <Navigate to="/patients" replace />
  }
  
  // Coordinators and Admins go to users
  if (['COORDINATEUR', 'ADMIN'].includes(user?.role)) {
    return <Navigate to="/users" replace />
  }
  
  // Fallback
  return <Navigate to="/patients" replace />
}

function AppRoutes() {
  const { loading, authenticated } = useAuth()

  if (loading) {
    return <div className="loading">Chargement...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordConfirm />} />
      <Route path="/secure-account/:uidb64/:token" element={<SecureAccount />} />
      <Route path="/remove-account/:uidb64/:token" element={<RemoveAccount />} />
      
      <Route element={<Layout />}>
        {authenticated ? (
          <>
            <Route path="/" element={<HomeRedirect />} />
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
            <Route path="/audit-logs" element={<AuditLogsList />} />
            <Route path="/conference/:roomId" element={<VideoConferenceRoom />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import FormsList from './pages/FormsList'
import FormBuilder from './pages/FormBuilder'
import FormSubmission from './pages/FormSubmission'
import FormSubmissionsList from './pages/FormSubmissionsList'
import FormSubmissionDetail from './pages/FormSubmissionDetail'
import UserManagement from './pages/UserManagement'
import UserForm from './pages/UserForm'
import PatientsList from './pages/PatientsList'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import MeetingsList from './pages/MeetingsList'
import MeetingDetail from './pages/MeetingDetail'
import MeetingForm from './pages/MeetingForm'
import AttachmentsList from './pages/AttachmentsList'
import AuditLogsList from './pages/AuditLogsList'
import ReportsList from './pages/ReportsList'
import VideoConferenceRoom from './pages/VideoConferenceRoom'


function AppRoutes() {
  const { loading, authenticated } = useAuth()

  if (loading) {
    return <div className="loading">Chargement...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route element={<Layout />}>
        {authenticated ? (
          <>
            <Route path="/" element={<Navigate to="/patients" replace />} />
            <Route path="/forms" element={<FormsList />} />
            <Route path="/forms/new" element={<FormBuilder />} />
            <Route path="/forms/:id/edit" element={<FormBuilder />} />
            <Route path="/forms/:id/submit" element={<FormSubmission />} />
            <Route path="/forms/:id/submissions" element={<FormSubmissionsList />} />
            <Route path="/forms/:formId/submissions/:submissionId" element={<FormSubmissionDetail />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id/edit" element={<UserForm />} />
            <Route path="/patients" element={<PatientsList />} />
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:id/edit" element={<PatientForm />} />
            <Route path="/meetings" element={<MeetingsList />} />
            <Route path="/meetings/new" element={<MeetingForm />} />
            <Route path="/meetings/:id" element={<MeetingDetail />} />
            <Route path="/meetings/:id/edit" element={<MeetingForm />} />
            <Route path="/attachments" element={<AttachmentsList />} />

            <Route path="/reports" element={<ReportsList />} />
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

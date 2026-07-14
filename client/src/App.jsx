import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Verify from './pages/Verify'
import Register from './pages/Register'
import Welcome from './pages/Welcome'
import AuthCallback from './pages/AuthCallback'
import ElderHome from './pages/elder/ElderHome'
import ElderBook from './pages/elder/ElderBook'
import ElderBookings from './pages/ElderBookings'
import WorkerSelection from './pages/elder/WorkerSelection'
import BookingConfirm from './pages/elder/BookingConfirm'
import BookingSuccess from './pages/elder/BookingSuccess'
import ElderCompanion from './pages/elder/ElderCompanion'
import ElderHealth from './pages/elder/ElderHealth'
import ElderMedicines from './pages/elder/ElderMedicines'
import ElderSOS from './pages/elder/ElderSOS'
import ElderSOSHistory from './pages/elder/ElderSOSHistory'
import ElderTrackWorker from './pages/elder/ElderTrackWorker'
import WorkerJobs from './pages/WorkerJobs'
import WorkerProfile from './pages/WorkerProfile'
import WorkerSchedule from './pages/WorkerSchedule'
import WorkerLocation from './pages/WorkerLocation'
import WorkerRatings from './pages/WorkerRatings'
import FamilyDashboard from './pages/FamilyDashboard'
import ElderMedicalRecords from './pages/ElderMedicalRecords'
import ElderRecordViewer from './pages/ElderRecordViewer'
import TestVideoCall from './pages/TestVideoCall'
import VideoCallPage from './pages/VideoCallPage'
import CallHistoryPage from './pages/CallHistoryPage'
import FamilyGeofenceSetup from './pages/FamilyGeofenceSetup'
import FamilyLocationHistory from './pages/FamilyLocationHistory'
import ElderSchemes from './pages/elder/ElderSchemes'
import FamilySchemes from './pages/family/FamilySchemes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/register" element={<Register />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/elder/home" element={<ElderHome />} />
        <Route path="/elder/book" element={<ElderBook />} />
        <Route path="/elder/bookings" element={<ElderBookings />} />
        <Route path="/elder/book/workers" element={<WorkerSelection />} />
        <Route path="/elder/book/confirm" element={<BookingConfirm />} />
        <Route path="/elder/book/success" element={<BookingSuccess />} />
        <Route path="/elder/companion" element={<ElderCompanion />} />
        <Route path="/elder/health" element={<ElderHealth />} />
        <Route path="/elder/medicines" element={<ElderMedicines />} />
        <Route path="/elder/sos" element={<ElderSOS />} />
        <Route path="/elder/sos/history" element={<ElderSOSHistory />} />
        <Route path="/elder/track-worker" element={<ElderTrackWorker />} />
        <Route path="/elder/medical-records" element={<ElderMedicalRecords />} />
        <Route path="/elder/medical-records/:recordId/view" element={<ElderRecordViewer />} />
        <Route path="/family/dashboard" element={<FamilyDashboard />} />
        <Route path="/family/safety-zone" element={<FamilyGeofenceSetup />} />
        <Route path="/family/location-history" element={<FamilyLocationHistory />} />
        <Route path="/worker/jobs" element={<WorkerJobs />} />
        <Route path="/worker/profile" element={<WorkerProfile />} />
        <Route path="/worker/schedule" element={<WorkerSchedule />} />
        <Route path="/worker/location" element={<WorkerLocation />} />
        <Route path="/worker/ratings" element={<WorkerRatings />} />
        <Route path="/test-call" element={<TestVideoCall />} />
        <Route path="/call/:callId" element={<VideoCallPage />} />
        <Route path="/elder/call-history" element={<CallHistoryPage role="elder" />} />
        <Route path="/family/call-history" element={<CallHistoryPage role="family" />} />
        <Route path="/elder/schemes" element={<ElderSchemes />} />
        <Route path="/family/schemes" element={<FamilySchemes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

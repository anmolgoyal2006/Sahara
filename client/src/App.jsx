import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Verify from './pages/Verify'
import Register from './pages/Register'
import Welcome from './pages/Welcome'
import AuthCallback from './pages/AuthCallback'
import ElderHome from './pages/elder/ElderHome'
import ElderBook from './pages/elder/ElderBook'
import ElderCompanion from './pages/elder/ElderCompanion'
import ElderHealth from './pages/elder/ElderHealth'
import ElderMedicines from './pages/elder/ElderMedicines'
import ElderSOS from './pages/elder/ElderSOS'
import WorkerJobs from './pages/WorkerJobs'
import WorkerProfile from './pages/WorkerProfile'
import WorkerSchedule from './pages/WorkerSchedule'
import WorkerLocation from './pages/WorkerLocation'
import WorkerRatings from './pages/WorkerRatings'
import FamilyDashboard from './pages/FamilyDashboard'

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
        <Route path="/elder/companion" element={<ElderCompanion />} />
        <Route path="/elder/health" element={<ElderHealth />} />
        <Route path="/elder/medicines" element={<ElderMedicines />} />
        <Route path="/elder/sos" element={<ElderSOS />} />
        <Route path="/family/dashboard" element={<FamilyDashboard />} />
        <Route path="/worker/jobs" element={<WorkerJobs />} />
        <Route path="/worker/profile" element={<WorkerProfile />} />
        <Route path="/worker/schedule" element={<WorkerSchedule />} />
        <Route path="/worker/location" element={<WorkerLocation />} />
        <Route path="/worker/ratings" element={<WorkerRatings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

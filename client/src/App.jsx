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
import { supabase } from './lib/supabase'

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
        <Route path="/family/dashboard" element={<PlaceholderPage title="Family Dashboard" phase="9" />} />
        <Route path="/worker/jobs" element={<WorkerJobs />} />
      </Routes>
    </BrowserRouter>
  )
}

function PlaceholderPage({ title, phase }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{ background: '#1D9E75', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <i className="ti ti-leaf" style={{ color: 'white', fontSize: 22 }} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0A2540', marginBottom: 8 }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 32 }}>Phase {phase} will build the full {title.toLowerCase()} screen</p>
      <button onClick={handleLogout} style={{ background: 'white', border: '2px solid #E24B4A', color: '#E24B4A', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Log Out</button>
    </div>
  )
}

export default App

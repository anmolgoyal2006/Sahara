import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../components/layout/WorkerLayout'

export default function WorkerSchedule() {
  const navigate = useNavigate()
  return (
    <WorkerLayout>
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ width: 48, height: 48, background: '#185FA5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <i className="ti ti-clock" style={{ color: 'white', fontSize: 22 }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>My Schedule</h1>
        <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 32 }}>Schedule view coming in Phase 5</p>
        <button onClick={() => navigate('/worker/jobs')} style={{ height: 48, padding: '0 28px', borderRadius: 10, border: '1.5px solid #1D9E75', background: 'white', color: '#1D9E75', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Jobs</button>
      </div>
    </WorkerLayout>
  )
}

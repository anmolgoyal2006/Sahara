import { useNavigate } from 'react-router-dom'

export default function ElderSOS() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: '#E24B4A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <i className="ti ti-urgent" style={{ color: 'white', fontSize: 36 }} />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 8 }}>SOS Alert</h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>Full emergency feature coming in Phase 8</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 36 }}>Your family will be notified immediately</p>
      <button onClick={() => navigate('/elder/home')} style={{ height: 48, padding: '0 28px', borderRadius: 10, border: '2px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Home</button>
    </div>
  )
}

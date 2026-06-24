import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'

export default function ElderMedicines() {
  const navigate = useNavigate()
  return (
    <ElderLayout>
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, background: '#1D9E75', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <i className="ti ti-pill" style={{ color: 'white', fontSize: 22 }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Medicines</h1>
        <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 32 }}>Full medicine tracker coming in Phase 5</p>
        <button onClick={() => navigate('/elder/home')} style={{ height: 48, padding: '0 28px', borderRadius: 10, border: '1.5px solid #1D9E75', background: 'white', color: '#1D9E75', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Home</button>
      </div>
    </ElderLayout>
  )
}

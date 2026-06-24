import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function QuickActions({ nextMedicine }) {
  const navigate = useNavigate()
  const [showSOS, setShowSOS] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      {/* Medicine card */}
      <div style={{ flex: 1, background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Next Medicine</p>
        {nextMedicine ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 3 }}>{nextMedicine.name}</p>
            <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 8 }}>{nextMedicine.dosage}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <i className="ti ti-clock" style={{ fontSize: 13, color: '#1D9E75' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{nextMedicine.nextTime}</span>
            </div>
            <p style={{ fontSize: 11, color: '#A0B8D0', marginBottom: 12 }}>In {nextMedicine.minutesUntil} minutes</p>
            <button onClick={() => navigate('/elder/medicines')} style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Mark Taken</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <i className="ti ti-pill" style={{ fontSize: 32, color: '#DDE8F5', display: 'block', marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: '#5A7A9A' }}>All medicines taken</p>
            <p style={{ fontSize: 11, color: '#A0B8D0' }}>for today</p>
          </div>
        )}
      </div>

      {/* Emergency card */}
      <div
        onClick={() => setShowSOS(true)}
        style={{ flex: 1, background: '#FFF0F0', border: '1.5px solid #FECACA', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Emergency</p>
        <i className="ti ti-urgent" style={{ fontSize: 28, color: '#E24B4A', marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: '#E24B4A', fontWeight: 600, marginBottom: 4 }}>Tap to alert family</p>
        <p style={{ fontSize: 10, color: 'rgba(226,75,74,0.7)' }}>Instant notification</p>
      </div>

      {/* SOS Modal */}
      {showSOS && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowSOS(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Are you sure?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 24 }}>This will immediately alert your family members.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSOS(false)} style={{ flex: 1, height: 48, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { setShowSOS(false); navigate('/elder/sos') }} style={{ flex: 1, height: 48, borderRadius: 10, border: 'none', background: '#E24B4A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Yes, Send Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

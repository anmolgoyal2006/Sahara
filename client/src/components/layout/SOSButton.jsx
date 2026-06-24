import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SOSButton() {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        aria-label="Emergency SOS button"
        style={{
          position: 'fixed', bottom: 'var(--sos-bottom, 80px)', right: 20,
          width: 64, height: 64, borderRadius: '50%',
          background: '#E24B4A', border: 'none', cursor: 'pointer',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          animation: 'sosPulse 2s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(226,75,74,0.5)',
        }}
      >
        <i className="ti ti-urgent" style={{ fontSize: 18, color: 'white' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>SOS</span>
      </button>

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowModal(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FFF0F0', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-urgent" style={{ fontSize: 28, color: '#E24B4A' }} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Are you sure?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 24 }}>This will immediately alert your family members and notify nearby care workers.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, height: 48, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { setShowModal(false); navigate('/elder/sos') }} style={{ flex: 1, height: 48, borderRadius: 10, border: 'none', background: '#E24B4A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Yes, Send Alert</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sosPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(226,75,74,0.5); }
          50% { transform: scale(1.08); box-shadow: 0 4px 28px rgba(226,75,74,0.7); }
        }
        @media (min-width: 1024px) {
          button[aria-label="Emergency SOS button"] {
            --sos-bottom: 24px;
            width: 72px !important;
            height: 72px !important;
          }
        }
      `}</style>
    </>
  )
}

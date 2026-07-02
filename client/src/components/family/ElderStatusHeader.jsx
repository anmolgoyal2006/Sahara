import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function relativeTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  if (mins < 2)  return 'Active recently'
  if (mins < 60) return `Last seen ${mins}m ago`
  if (hrs  < 24) return `Last seen ${hrs}h ago`
  return `Last seen ${Math.floor(hrs / 24)}d ago`
}

export default function ElderStatusHeader({ elder, familyUserId, onUnlink }) {
  const [showModal,  setShowModal]  = useState(false)
  const [unlinking,  setUnlinking]  = useState(false)

  async function handleUnlink() {
    setUnlinking(true)
    try {
      await fetch(`${API_URL}/api/family/unlink-elder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_user_id: familyUserId }),
      })
      setShowModal(false)
      onUnlink()
    } catch {
      setUnlinking(false)
    }
  }

  const conditions = (elder.conditions || []).slice(0, 2)

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #185FA5 100%)',
        borderRadius: 16, padding: '24px 20px',
        marginBottom: 20, fontFamily: 'Noto Sans, sans-serif',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Monitoring
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 10px', lineHeight: 1.2 }}>
            {elder.name || 'Your Parent'}
          </p>

          {/* Age + condition pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {elder.age && (
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '3px 10px' }}>
                {elder.age} years
              </span>
            )}
            {conditions.map((c, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '3px 10px' }}>
                {c}
              </span>
            ))}
          </div>

          {/* Last active */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-clock" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {relativeTime(elder.lastActive) || 'Active recently'}
            </span>
          </div>
        </div>

        {/* Right — settings */}
        <button
          onClick={() => setShowModal(true)}
          aria-label="Settings"
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}
        >
          <i className="ti ti-settings" style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>

      {/* Unlink modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-unlink" style={{ fontSize: 24, color: '#E24B4A' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>
              Remove {elder.name} from monitoring?
            </p>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 24px', lineHeight: 1.5 }}>
              You can re-link at any time using their phone number.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #E24B4A', background: 'white', color: '#E24B4A', fontWeight: 700, fontSize: 15, cursor: unlinking ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: unlinking ? 0.7 : 1 }}
              >
                {unlinking ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

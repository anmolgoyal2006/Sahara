import { useState } from 'react'

function relativeTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  if (mins < 2)  return 'Just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  if (hrs < 24)  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
}

export default function SOSAlertCard({ alert, onResolve }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [resolving,   setResolving]   = useState(false)

  const isActive = !alert.resolved

  // ── RESOLVED state ────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div style={{
        background: '#F0FBF7', border: '1.5px solid #9FE1CB',
        borderRadius: 14, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'Noto Sans, sans-serif', marginBottom: 10,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 18, color: '#1D9E75' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75' }}>
              {relativeTime(alert.triggered_at)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', border: '1px solid #9FE1CB', borderRadius: 20, padding: '1px 8px' }}>Resolved</span>
          </div>
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0 }}>
            Resolved {alert.resolved_at ? relativeTime(alert.resolved_at) : ''}
            {alert.resolved_by ? ` by ${alert.resolved_by}` : ''}
          </p>
        </div>
        {alert.maps_link && (
          <button
            onClick={() => window.open(alert.maps_link, '_blank')}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #9FE1CB', background: 'white', color: '#1D9E75', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="ti ti-map-pin" style={{ fontSize: 12 }} />Map
          </button>
        )}
      </div>
    )
  }

  // ── ACTIVE state ──────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        background: '#FFF0F0', border: '2px solid #E24B4A',
        borderRadius: 14, padding: '16px 20px',
        fontFamily: 'Noto Sans, sans-serif', marginBottom: 10,
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', flexShrink: 0, animation: 'sosDotPulse 1.4s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Emergency Alert</span>
          <span style={{ fontSize: 11, color: '#A0B8D0' }}>{relativeTime(alert.triggered_at)}</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFD9D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-urgent" style={{ fontSize: 22, color: '#E24B4A' }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 4px' }}>Emergency alert triggered</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: 0 }}>Your family member needs help</p>
          </div>
        </div>

        {/* Location button */}
        {alert.maps_link && (
          <button
            onClick={() => window.open(alert.maps_link, '_blank')}
            style={{
              height: 38, padding: '0 16px', borderRadius: 10, marginBottom: 10,
              border: '1.5px solid #185FA5', background: 'white',
              color: '#185FA5', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-map-pin" style={{ fontSize: 14 }} />
            View Location
          </button>
        )}

        {/* Resolve button */}
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            width: '100%', height: 44, borderRadius: 10,
            border: 'none', background: '#1D9E75',
            color: 'white', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <i className="ti ti-shield-check" style={{ fontSize: 16 }} />
          They are safe now
        </button>
      </div>

      {/* Pulse keyframe */}
      <style>{`
        @keyframes sosDotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Resolve confirm modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, padding: 28,
            width: '100%', maxWidth: 340, textAlign: 'center',
            fontFamily: 'Noto Sans, sans-serif',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-shield-check" style={{ fontSize: 28, color: '#1D9E75' }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>Mark as safe?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px' }}>This will close the emergency alert.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setResolving(true)
                  await onResolve(alert.id)
                  setResolving(false)
                  setShowConfirm(false)
                }}
                disabled={resolving}
                style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', background: '#1D9E75', color: 'white', fontWeight: 700, fontSize: 15, cursor: resolving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: resolving ? 0.7 : 1 }}
              >
                {resolving ? 'Saving…' : "Yes, they're safe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

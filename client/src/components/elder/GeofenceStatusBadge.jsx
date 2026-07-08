import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GeofenceStatusBadge({ status, zone, lastCheck }) {
  const navigate = useNavigate()
  const [showTooltip, setShowTooltip] = useState(false)

  // Derive display config from status
  let bg, border, dotColor, dotPulse, text, textColor, tooltipText

  if (status === 'inside') {
    bg        = '#F0FBF7'
    border    = '1px solid #9FE1CB'
    dotColor  = '#1D9E75'
    dotPulse  = false
    text      = 'Safety Zone Active'
    textColor = '#0F6E56'
    tooltipText = zone
      ? `You are within ${zone.radiusMeters}m of ${zone.label || 'Home'}`
      : 'You are within your safe zone'
  } else if (status === 'outside') {
    bg        = '#FFF0F0'
    border    = '1px solid #FECACA'
    dotColor  = '#E24B4A'
    dotPulse  = true
    text      = 'Outside Safe Zone'
    textColor = '#E24B4A'
    tooltipText = zone
      ? `You are outside your safe zone (${zone.label || 'Home'})`
      : 'You are outside your safe zone'
  } else {
    // null — no zone set
    bg        = '#EBF4FF'
    border    = '1px solid #DDE8F5'
    dotColor  = '#A0B8D0'
    dotPulse  = false
    text      = 'Safety Zone not set'
    textColor = '#5A7A9A'
    tooltipText = 'Tap to set up your safety zone'
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Badge pill */}
      <div
        onClick={() => {
          if (status === null) {
            navigate('/elder/safety-zone')
          } else {
            setShowTooltip(v => !v)
          }
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 28, padding: '0 12px', borderRadius: 14,
          background: bg, border,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* Dot — pulsing when outside */}
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 8, height: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dotColor,
            display: 'block',
            position: 'relative', zIndex: 1,
          }} />
          {dotPulse && (
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: dotColor,
              opacity: 0.3,
              animation: 'geofencePulse 1.4s ease-out infinite',
            }} />
          )}
        </span>

        <span style={{ fontSize: 11, fontWeight: 700, color: textColor, whiteSpace: 'nowrap' }}>
          {text}
        </span>
      </div>

      {/* Tooltip card */}
      {showTooltip && (
        <>
          {/* Backdrop to dismiss */}
          <div
            onClick={() => setShowTooltip(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: 'absolute', top: 34, left: 0,
            background: 'white', border: '1.5px solid #DDE8F5',
            borderRadius: 10, padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 100, minWidth: 200, maxWidth: 260,
          }}>
            <p style={{ fontSize: 12, color: '#0A2540', fontWeight: 600, margin: '0 0 4px' }}>
              {tooltipText}
            </p>
            {lastCheck && (
              <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>
                Last checked: {lastCheck.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              onClick={() => { setShowTooltip(false); navigate('/elder/safety-zone') }}
              style={{
                marginTop: 8, fontSize: 11, fontWeight: 700,
                color: '#185FA5', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Manage zone →
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes geofencePulse {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          70%  { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

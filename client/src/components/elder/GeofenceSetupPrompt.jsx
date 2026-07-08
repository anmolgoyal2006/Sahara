import { useNavigate } from 'react-router-dom'

export default function GeofenceSetupPrompt({ onDismiss }) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 16, padding: 16, marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: '#EBF4FF', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-map-pin" style={{ fontSize: 20, color: '#185FA5' }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
          Set up your Safety Zone
        </p>
        <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0, lineHeight: 1.4 }}>
          Let family know you're safe without constant calls
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/elder/safety-zone')}
          style={{
            height: 32, padding: '0 14px', borderRadius: 8,
            background: '#185FA5', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          Set up
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1.5px solid #DDE8F5', background: 'white',
            color: '#A0B8D0', fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="ti ti-x" style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  )
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function SOSHistoryList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 14, padding: '32px 24px', textAlign: 'center',
        fontFamily: 'Noto Sans, sans-serif',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: '#1D9E75' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 4px' }}>No emergency alerts</p>
        <p style={{ fontSize: 12, color: '#1D9E75', margin: 0 }}>All is well</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, overflow: 'hidden', fontFamily: 'Noto Sans, sans-serif' }}>
      {alerts.map((alert, i) => (
        <div
          key={alert.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: i < alerts.length - 1 ? '1px solid #EEF4FB' : 'none',
          }}
        >
          {/* Status dot */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: alert.resolved ? '#1D9E75' : '#E24B4A',
          }} />

          {/* Date + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2540', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatDateTime(alert.triggered_at)}
            </p>
            <p style={{ fontSize: 11, color: alert.resolved ? '#1D9E75' : '#E24B4A', margin: 0, fontWeight: 600 }}>
              {alert.resolved ? 'Resolved' : 'Active'}
            </p>
          </div>

          {/* Map link */}
          {alert.maps_link && (
            <button
              onClick={() => window.open(alert.maps_link, '_blank')}
              style={{
                height: 30, padding: '0 10px', borderRadius: 8, flexShrink: 0,
                border: '1.5px solid #DDE8F5', background: 'white',
                color: '#185FA5', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <i className="ti ti-map-pin" style={{ fontSize: 11 }} />Map
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function countdown(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes())
  if (diff <= 0) return null
  if (diff < 60) return `In ${diff}m`
  return `In ${Math.floor(diff / 60)}h ${diff % 60}m`
}

function isOverdue(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  return (h * 60 + m) < (now.getHours() * 60 + now.getMinutes())
}

function leftBorderColor(dose) {
  if (dose.status === 'taken')   return '#1D9E75'
  if (dose.status === 'missed')  return '#E24B4A'
  if (dose.status === 'skipped') return '#A0B8D0'
  return isOverdue(dose.time)    ? '#BA7517' : '#DDE8F5'
}

function iconBg(color) {
  // Convert hex color to a light tint by mixing with white
  return color + '22' // 13% opacity hex
}

export default function DoseCard({ dose, onMarkTaken, onMarkSkipped }) {
  const overdue = dose.status === 'pending' && isOverdue(dose.time)
  const upcoming = dose.status === 'pending' && !overdue
  const cd = upcoming ? countdown(dose.time) : null
  const color = dose.color || '#1D9E75'

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #DDE8F5',
      borderLeft: `4px solid ${leftBorderColor(dose)}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: iconBg(color),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${dose.icon || 'ti-pill'}`} style={{ fontSize: 20, color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
          {formatTime(dose.time)}
        </p>
        <p style={{ fontSize: 14, color: '#0A2540', margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {dose.name}
        </p>
        {dose.dosage && (
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>{dose.dosage}</p>
        )}
      </div>

      {/* Right action */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
        {dose.status === 'taken' && (
          <>
            <i className="ti ti-circle-check" style={{ fontSize: 24, color: '#1D9E75', display: 'block', marginBottom: 2 }} />
            <p style={{ fontSize: 11, color: '#1D9E75', margin: 0 }}>
              {dose.taken_at
                ? `${new Date(dose.taken_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Taken'}
            </p>
          </>
        )}

        {dose.status === 'missed' && (
          <>
            <i className="ti ti-alert-circle" style={{ fontSize: 20, color: '#E24B4A', display: 'block', marginBottom: 2 }} />
            <p style={{ fontSize: 11, color: '#E24B4A', margin: '0 0 4px' }}>Missed</p>
            <button
              onClick={() => onMarkTaken(dose.log_id)}
              style={{
                height: 26, padding: '0 8px', borderRadius: 6,
                border: '1.5px solid #1D9E75', background: 'white',
                color: '#1D9E75', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Mark Taken
            </button>
          </>
        )}

        {dose.status === 'skipped' && (
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>Skipped</p>
        )}

        {overdue && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              onClick={() => onMarkTaken(dose.log_id)}
              style={{
                height: 36, padding: '0 12px', borderRadius: 10,
                border: 'none', background: '#1D9E75',
                color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Mark Taken
            </button>
            <button
              onClick={() => onMarkSkipped(dose.log_id)}
              style={{
                border: 'none', background: 'transparent',
                color: '#A0B8D0', fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Skip
            </button>
          </div>
        )}

        {upcoming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {cd && <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0 }}>{cd}</p>}
            <button
              onClick={() => onMarkTaken(dose.log_id)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 8,
                border: '1.5px solid #1D9E75', background: 'white',
                color: '#1D9E75', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Mark Taken
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

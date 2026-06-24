import { useNavigate } from 'react-router-dom'

function formatBookingTime(scheduledAt) {
  const date = new Date(scheduledAt)
  const now = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(now.getDate() + 1)
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (date.toDateString() === now.toDateString()) return `Today at ${timeStr}`
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${timeStr}`
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` at ${timeStr}`
}

const SERVICE_BADGE = {
  maid:            { bg: '#DCFCE7', color: '#166534', label: 'Maid' },
  nurse:           { bg: '#FFF0F0', color: '#E24B4A', label: 'Nurse' },
  driver:          { bg: '#EBF4FF', color: '#185FA5', label: 'Driver' },
  cook:            { bg: '#FAEEDA', color: '#BA7517', label: 'Cook' },
  physiotherapist: { bg: '#EDE9FE', color: '#5B21B6', label: 'Physio' },
  repair:          { bg: '#FFEDD5', color: '#C2410C', label: 'Repair' },
}

export default function UpcomingBookings({ bookings }) {
  const navigate = useNavigate()
  const next = bookings?.[0]

  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540' }}>Upcoming Help</p>
        <span onClick={() => navigate('/elder/book')} style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, cursor: 'pointer' }}>View All →</span>
      </div>

      {!next ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No bookings scheduled</p>
          <p style={{ fontSize: 12, color: '#A0B8D0', marginBottom: 16 }}>Book a helper now</p>
          <button onClick={() => navigate('/elder/book')} style={{ height: 40, padding: '0 20px', borderRadius: 9, border: 'none', background: '#1D9E75', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Book Now</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FBF7', border: '2px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {next.workers?.photo_url
                ? <img src={next.workers.photo_url} alt="Worker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 18, fontWeight: 800, color: '#1D9E75' }}>{next.workers?.users?.name?.[0] || 'W'}</span>
              }
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>{next.workers?.users?.name || 'Worker'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                {(() => { const b = SERVICE_BADGE[next.service_type] || SERVICE_BADGE.maid; return <span style={{ background: b.bg, color: b.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{b.label}</span> })()}
                <span style={{ fontSize: 13, color: '#5A7A9A' }}>{formatBookingTime(next.scheduled_at)}</span>
              </div>
              <p style={{ fontSize: 12, color: '#A0B8D0' }}>For {next.duration_hours || 2} hours</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', background: next.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7', color: next.status === 'confirmed' ? '#166534' : '#92400E', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                {next.status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </span>
              {next.workers?.rating > 0 && <span style={{ fontSize: 11, color: '#5A7A9A' }}>⭐ {next.workers.rating.toFixed(1)}</span>}
            </div>
          </div>

          {next.status === 'confirmed' && next.workers?.users?.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '10px 14px', background: '#F0FBF7', borderRadius: 10 }}>
              <i className="ti ti-phone" style={{ fontSize: 15, color: '#1D9E75' }} />
              <span style={{ fontSize: 13, color: '#0A2540', fontWeight: 600 }}>{next.workers.users.phone}</span>
              <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, marginLeft: 'auto' }}>Call Worker</span>
            </div>
          )}

          {bookings.length > 1 && (
            <div onClick={() => navigate('/elder/book')} style={{ textAlign: 'center', marginTop: 10, padding: '8px', borderRadius: 9, background: '#F7FBFF', cursor: 'pointer', fontSize: 12, color: '#185FA5', fontWeight: 700 }}>
              + {bookings.length - 1} more booking{bookings.length > 2 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  )
}

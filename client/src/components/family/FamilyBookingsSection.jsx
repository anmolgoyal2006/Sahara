const SERVICE_LABEL = {
  maid: 'Maid', nurse: 'Nurse', driver: 'Driver',
  cook: 'Cook', physiotherapist: 'Physio', repair: 'Repair',
}

const SERVICE_COLOR = {
  maid: '#185FA5', nurse: '#E24B4A', driver: '#1D9E75',
  cook: '#BA7517', physiotherapist: '#8B5CF6', repair: '#5A7A9A',
}

const SERVICE_ICON = {
  maid: 'ti-home', nurse: 'ti-stethoscope', driver: 'ti-car',
  cook: 'ti-tools-kitchen-2', physiotherapist: 'ti-ripple', repair: 'ti-tool',
}

const STATUS_STYLE = {
  confirmed: { color: '#1D9E75', bg: '#F0FBF7', border: '#9FE1CB' },
  pending:   { color: '#BA7517', bg: '#FAEEDA', border: '#F5C77A' },
  cancelled: { color: '#E24B4A', bg: '#FFF0F0', border: '#FECACA' },
}

function formatBookingDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function FamilyBookingsSection({ bookings = [] }) {
  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 20, marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Header */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 16px' }}>
        Upcoming Services
      </p>

      {/* Empty state */}
      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>No upcoming bookings</p>
        </div>
      ) : (
        bookings.map((booking, i) => {
          const svc     = booking.service_type
          const color   = SERVICE_COLOR[svc]  || '#5A7A9A'
          const icon    = SERVICE_ICON[svc]   || 'ti-calendar'
          const label   = SERVICE_LABEL[svc]  || svc
          const statusStyle = STATUS_STYLE[booking.status] || STATUS_STYLE.pending
          const worker  = booking.workers?.users
          const isLast  = i === bookings.length - 1

          return (
            <div
              key={booking.id}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 0',
                borderBottom: isLast ? 'none' : '1px solid #EEF4FB',
              }}
            >
              {/* Service icon */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 18, color }} />
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Service + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2540' }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, borderRadius: 20, padding: '1px 8px' }}>
                    {booking.status}
                  </span>
                </div>

                {/* Date/time */}
                <p style={{ fontSize: 12, color: '#5A7A9A', margin: '0 0 3px' }}>
                  {formatBookingDate(booking.scheduled_at)}
                </p>

                {/* Duration */}
                {booking.duration_hours && (
                  <p style={{ fontSize: 12, color: '#A0B8D0', margin: '0 0 3px' }}>
                    For {booking.duration_hours} hour{booking.duration_hours !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Worker name */}
                {worker?.name && (
                  <p style={{ fontSize: 12, color: '#5A7A9A', margin: '0 0 2px' }}>
                    <i className="ti ti-user" style={{ fontSize: 11, marginRight: 3 }} />
                    {worker.name}
                  </p>
                )}

                {/* Worker phone — only for confirmed bookings */}
                {booking.status === 'confirmed' && worker?.phone && (
                  <a
                    href={`tel:${worker.phone}`}
                    style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <i className="ti ti-phone" style={{ fontSize: 11 }} />
                    {worker.phone}
                  </a>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

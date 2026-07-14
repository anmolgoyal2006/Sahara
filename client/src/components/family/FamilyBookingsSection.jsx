import { useNavigate } from 'react-router-dom'

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

const SERVICE_CHIPS = [
  { icon: 'ti-home',        label: 'Maid',   color: '#185FA5', bg: '#EBF4FF' },
  { icon: 'ti-stethoscope', label: 'Nurse',  color: '#E24B4A', bg: '#FFF0F0' },
  { icon: 'ti-car',         label: 'Driver', color: '#1D9E75', bg: '#F0FBF7' },
  { icon: 'ti-tools-kitchen-2', label: 'Cook', color: '#BA7517', bg: '#FAEEDA' },
]

function formatBookingDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function FamilyBookingsSection({ bookings = [] }) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 20, marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: 0 }}>Upcoming Services</p>
        {bookings.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '2px 10px' }}>
            {bookings.length} scheduled
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <>
          {/* Compact empty message */}
          <p style={{ fontSize: 13, color: '#A0B8D0', margin: '0 0 12px' }}>No services booked yet</p>

          {/* Service chips in a tight 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {SERVICE_CHIPS.map(s => (
              <div
                key={s.label}
                onClick={() => navigate('/elder/book')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10,
                  border: '1.5px solid #EEF4FB', cursor: 'pointer',
                  background: 'white', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = s.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: 14, color: s.color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0A2540' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/elder/book')}
            style={{
              width: '100%', height: 38, borderRadius: 10,
              background: '#1D9E75', border: 'none',
              color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 13 }} />
            Book a Service
          </button>
        </>
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

      {/* Quick links — always visible at bottom */}
      <div style={{ borderTop: '1px solid #EEF4FB', marginTop: 12, paddingTop: 10 }}>
        {[
          { icon: 'ti-heart-rate-monitor', label: 'Health History',  color: '#E24B4A', path: '/family/health' },
          { icon: 'ti-map-pin-check',      label: 'Safety Zone',     color: '#185FA5', path: '/family/safety-zone' },
          { icon: 'ti-map-pin',            label: 'Location History',color: '#1D9E75', path: '/family/location-history' },
          { icon: 'ti-video',              label: 'Call History',    color: '#8B5CF6', path: '/family/call-history' },
        ].map((item, i, arr) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '8px 0',
              background: 'none', border: 'none',
              borderBottom: i < arr.length - 1 ? '1px solid #F4F8FC' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 15, color: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#0A2540', fontWeight: 600, flex: 1 }}>{item.label}</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12, color: '#C0D4E8' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

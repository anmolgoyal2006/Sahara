import { useState } from 'react'

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function GeofenceAlertCard({
  alerts, zone, isOutside, elderName, onAcknowledge,
}) {
  const [ackLoading, setAckLoading] = useState(null)

  const name        = elderName || 'Your parent'
  const recentAlerts = (alerts || []).slice(0, 5)
  const lastEvent   = alerts?.[0]

  /* ── Current status section ── */
  function StatusSection() {
    // No zone configured
    if (!zone) {
      return (
        <div style={{
          background: '#EBF4FF', border: '1.5px solid #DDE8F5',
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <i className="ti ti-map-pin-off" style={{ fontSize: 18, color: '#5A7A9A' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A2540' }}>No safety zone configured</span>
          </div>
          <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0 }}>
            Ask {name} to set up a safety zone in their Sahara app.
          </p>
        </div>
      )
    }

    if (isOutside) {
      const lat = lastEvent?.elder_lat
      const lng = lastEvent?.elder_lng
      const dist = lastEvent?.distance_from_center
      const mapsUrl = lat && lng
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : null

      return (
        <div style={{
          background: '#FFF0F0', border: '1.5px solid #FECACA',
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {/* Pulsing dot */}
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', display: 'block', position: 'relative', zIndex: 1 }} />
              <span style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 18, height: 18, borderRadius: '50%',
                background: '#E24B4A', opacity: 0.25,
                animation: 'gfPulse 1.4s ease-out infinite',
              }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Outside Safe Zone
            </span>
            {lastEvent && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A0B8D0' }}>
                {timeAgo(lastEvent.triggered_at)}
              </span>
            )}
          </div>

          {/* Info row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <i className="ti ti-map-pin-off" style={{ fontSize: 20, color: '#E24B4A', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
                {name} is outside their safe zone
              </p>
              {dist != null && (
                <p style={{ fontSize: 13, color: '#E24B4A', margin: 0 }}>
                  Last seen {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`} from {zone?.label || 'Home'}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: '1.5px solid #185FA5', background: 'white',
                  color: '#185FA5', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none',
                }}
              >
                <i className="ti ti-map" style={{ fontSize: 15 }} />
                View Location
              </a>
            )}
          </div>
        </div>
      )
    }

    // Inside zone
    return (
      <div style={{
        background: '#F0FBF7', border: '1.5px solid #9FE1CB',
        borderRadius: 14, padding: 16, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Inside Safe Zone
          </span>
          {lastEvent && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A0B8D0' }}>
              {timeAgo(lastEvent.triggered_at)}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2540', margin: '0 0 2px' }}>
          {name} is within their safe zone
        </p>
        {zone?.label && (
          <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0 }}>
            Zone: {zone.label} · {zone.radius_meters < 1000 ? `${zone.radius_meters}m` : `${(zone.radius_meters / 1000).toFixed(1)}km`} radius
          </p>
        )}
      </div>
    )
  }

  /* ── Alert history ── */
  async function handleAck(eventId) {
    setAckLoading(eventId)
    try {
      await onAcknowledge(eventId)
    } finally {
      setAckLoading(null)
    }
  }

  const unackedAlerts = recentAlerts.filter(a => !a.acknowledged)
  const hasHistory = recentAlerts.length > 0

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className="ti ti-map-pin-check" style={{ fontSize: 18, color: '#185FA5' }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0 }}>Safety Zone</p>
      </div>

      <StatusSection />

      {/* Alert history */}
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 14, padding: 16,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>
          Location History
        </p>

        {!hasHistory ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <i className="ti ti-shield-check" style={{ fontSize: 16, color: '#1D9E75' }} />
            <span style={{ fontSize: 12, color: '#5A7A9A' }}>No recent alerts</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentAlerts.map(alert => {
              const isLeft = alert.event_type === 'left'
              const dist   = alert.distance_from_center

              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid #F0F4F8',
                  }}
                >
                  {/* Color dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isLeft ? '#E24B4A' : '#1D9E75',
                    flexShrink: 0,
                  }} />

                  {/* Event text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2540', margin: 0 }}>
                      {isLeft
                        ? `Left safe zone — ${dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`} away`
                        : 'Returned to safe zone'}
                    </p>
                  </div>

                  {/* Time + ack */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#A0B8D0' }}>
                      {timeAgo(alert.triggered_at)}
                    </span>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAck(alert.id)}
                        disabled={ackLoading === alert.id}
                        style={{
                          height: 28, padding: '0 10px', borderRadius: 8,
                          border: '1.5px solid #DDE8F5', background: 'white',
                          color: '#5A7A9A', fontSize: 11, fontWeight: 700,
                          cursor: ackLoading === alert.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          opacity: ackLoading === alert.id ? 0.6 : 1,
                        }}
                      >
                        OK
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {unackedAlerts.length === 0 && hasHistory && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 14, color: '#1D9E75' }} />
                <span style={{ fontSize: 11, color: '#5A7A9A' }}>All alerts acknowledged</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gfPulse {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.25; }
          70%  { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
          100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

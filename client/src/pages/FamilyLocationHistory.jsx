import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FamilyLayout from '../components/layout/FamilyLayout'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function FamilyLocationHistory() {
  const navigate = useNavigate()

  const [userId,     setUserId]     = useState(null)
  const [userName,   setUserName]   = useState(null)
  const [elderId,    setElderId]    = useState(null)
  const [elderName,  setElderName]  = useState(null)
  const [zone,       setZone]       = useState(null)
  const [events,     setEvents]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [notLinked,  setNotLinked]  = useState(false)
  const [disabling,  setDisabling]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id
      setUserId(uid)
      setUserName(session.user.user_metadata?.name || null)

      try {
        const overviewRes  = await fetch(`${API_URL}/api/family/elder-overview/${uid}`)
        const overviewData = await overviewRes.json()

        if (!overviewData.success || !overviewData.linked || !overviewData.elder) {
          setNotLinked(true)
          setLoading(false)
          return
        }

        const eid = overviewData.elder.id
        setElderId(eid)
        setElderName(overviewData.elder.name)

        const [zoneRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/api/geofence/zone/${eid}`),
          fetch(`${API_URL}/api/geofence/events/${eid}?type=alerts&limit=50`),
        ])
        const zoneData   = await zoneRes.json()
        const eventsData = await eventsRes.json()

        setZone(zoneData.zone || null)
        setEvents(eventsData.events || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    })
  }, [])

  async function handleDisable() {
    if (!elderId) return
    setDisabling(true)
    try {
      await fetch(`${API_URL}/api/geofence/zone/${elderId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      navigate('/family/dashboard')
    } catch {
      setDisabling(false)
    }
  }

  if (loading) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ textAlign: 'center', padding: 60, color: '#A0B8D0' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
          Loading history…
        </div>
      </FamilyLayout>
    )
  }

  if (notLinked) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
          <i className="ti ti-user-off" style={{ fontSize: 48, color: '#A0B8D0', display: 'block', marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>No elder linked yet</p>
          <button
            onClick={() => navigate('/family/dashboard')}
            style={{
              height: 44, padding: '0 24px', borderRadius: 12,
              background: '#185FA5', border: 'none',
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </FamilyLayout>
    )
  }

  return (
    <FamilyLayout userName={userName}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Back link */}
        <button
          onClick={() => navigate('/family/dashboard')}
          style={{
            background: 'none', border: 'none', padding: '0 0 16px',
            color: '#185FA5', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
          Back to Dashboard
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>
            {elderName ? `${elderName}'s` : ''} Location History
          </h1>
          <p style={{ fontSize: 14, color: '#A0B8D0' }}>
            Events recorded by the Safety Zone
          </p>
        </div>

        {/* Zone info card */}
        {zone ? (
          <div style={{
            background: 'white', border: '1.5px solid #DDE8F5',
            borderRadius: 16, padding: 16, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#F0FBF7', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-map-pin-check" style={{ fontSize: 22, color: '#1D9E75' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
                {zone.label || 'Home'}
              </p>
              <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 6px' }}>
                Radius: {formatDistance(zone.radius_meters)}
              </p>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: zone.is_active ? '#F0FBF7' : '#F7F9FB',
                border: `1px solid ${zone.is_active ? '#9FE1CB' : '#DDE8F5'}`,
                color: zone.is_active ? '#0F6E56' : '#A0B8D0',
              }}>
                {zone.is_active ? '● Active' : '○ Paused'}
              </span>
            </div>

            <button
              onClick={() => navigate('/family/safety-zone')}
              style={{
                height: 34, padding: '0 14px', borderRadius: 10,
                border: '1.5px solid #DDE8F5', background: 'white',
                color: '#185FA5', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              Edit Zone →
            </button>
          </div>
        ) : (
          <div style={{
            background: '#EBF4FF', border: '1.5px solid #DDE8F5',
            borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center',
          }}>
            <i className="ti ti-map-pin-off" style={{ fontSize: 32, color: '#A0B8D0', display: 'block', marginBottom: 10 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>
              No safety zone set up yet
            </p>
            <button
              onClick={() => navigate('/family/safety-zone')}
              style={{
                height: 40, padding: '0 20px', borderRadius: 10,
                background: '#185FA5', border: 'none',
                color: 'white', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Set up Safety Zone
            </button>
          </div>
        )}

        {/* Events timeline */}
        {events.length === 0 ? (
          <div style={{
            background: 'white', border: '1.5px solid #DDE8F5',
            borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            marginBottom: 24,
          }}>
            <i className="ti ti-check-circle" style={{ fontSize: 48, color: '#1D9E75', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>
              No safety alerts
            </p>
            <p style={{ fontSize: 14, color: '#A0B8D0' }}>
              No geofence notifications have been triggered yet
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 16 }}>
              Location Events
            </p>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 11, top: 12, bottom: 12,
                width: 2, background: '#DDE8F5', zIndex: 0,
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {events.map((event) => {
                  const isLeft   = event.event_type === 'left'
                  const dotColor = isLeft ? '#E24B4A' : '#1D9E75'
                  const labelColor = isLeft ? '#E24B4A' : '#0F6E56'

                  return (
                    <div key={event.id} style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: isLeft ? '#FFF0F0' : '#F0FBF7',
                        border: `2px solid ${dotColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 10,
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: dotColor, display: 'block',
                        }} />
                      </div>

                      <div style={{
                        flex: 1, background: 'white',
                        border: '1.5px solid #DDE8F5',
                        borderLeft: `3px solid ${dotColor}`,
                        borderRadius: 12, padding: '12px 14px',
                      }}>
                        <p style={{
                          fontSize: 14, fontWeight: 700,
                          color: labelColor, margin: '0 0 4px',
                        }}>
                          {isLeft ? 'Left safe zone' : 'Returned to safe zone'}
                        </p>

                        {event.distance_from_center != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <i className="ti ti-map-pin" style={{ fontSize: 12, color: '#A0B8D0' }} />
                            <span style={{ fontSize: 12, color: '#5A7A9A' }}>
                              {formatDistance(event.distance_from_center)} from {event.zone_label || 'Home'}
                            </span>
                          </div>
                        )}

                        <p style={{ fontSize: 12, color: '#A0B8D0', margin: '0 0 6px' }}>
                          {formatDateTime(event.triggered_at)}
                        </p>

                        <span style={{
                          display: 'inline-block', padding: '2px 8px',
                          borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: '#F7F9FB', border: '1px solid #DDE8F5',
                          color: '#A0B8D0',
                        }}>
                          You were notified
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{
          background: '#F7F9FB', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i className="ti ti-shield" style={{ fontSize: 16, color: '#A0B8D0' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A7A9A' }}>Zone Controls</span>
          </div>
          <p style={{ fontSize: 12, color: '#A0B8D0', lineHeight: 1.6, margin: '0 0 12px' }}>
            You can pause or turn off the safety zone at any time from the settings page.
          </p>
          <button
            onClick={handleDisable}
            disabled={disabling || !zone}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 700,
              color: (!zone || disabling) ? '#A0B8D0' : '#E24B4A',
              cursor: (!zone || disabling) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {disabling ? 'Turning off…' : 'Turn off Safety Zone'}
          </button>
        </div>

      </div>
    </FamilyLayout>
  )
}

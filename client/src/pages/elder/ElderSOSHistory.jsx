import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const spinKeyframe = `@keyframes spin { to { transform: rotate(360deg) } }`
const dotPulseKeyframe = `
  @keyframes sosDotPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function ElderSOSHistory() {
  const navigate  = useNavigate()
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return }
      fetch(`${API_URL}/api/sos/history/${session.user.id}`)
        .then(r => r.json())
        .then(data => { if (data.success) setEvents(data.events || []) })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [navigate])

  if (loading) {
    return (
      <ElderLayout>
        <style>{spinKeyframe}</style>
        <div style={{ textAlign: 'center', padding: 64, color: '#A0B8D0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #EEF4FB', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      </ElderLayout>
    )
  }

  return (
    <ElderLayout>
      <style>{dotPulseKeyframe}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', margin: 0 }}>Emergency History</h1>
        <p style={{ fontSize: 14, color: '#A0B8D0', margin: '4px 0 0' }}>Your past SOS alerts</p>
      </div>

      {/* Empty state */}
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', fontFamily: 'Noto Sans, sans-serif' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: 40, color: '#1D9E75' }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', margin: '0 0 8px' }}>No emergency alerts</p>
          <p style={{ fontSize: 14, color: '#1D9E75', margin: '0 0 28px' }}>Hopefully this page stays empty!</p>
          <button
            onClick={() => navigate('/elder/home')}
            style={{
              height: 48, padding: '0 28px', borderRadius: 12,
              border: 'none', background: '#1D9E75', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Back to Home
          </button>
        </div>
      ) : (
        <div>
          {events.map(event => {
            const isActive = !event.resolved
            return (
              <div
                key={event.id}
                style={{
                  background: 'white',
                  border: `1.5px solid ${isActive ? '#E24B4A' : '#DDE8F5'}`,
                  borderLeft: `4px solid ${isActive ? '#E24B4A' : '#1D9E75'}`,
                  borderRadius: 14, padding: 16, marginBottom: 10,
                  fontFamily: 'Noto Sans, sans-serif',
                }}
              >
                {/* Row 1 — date/time + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                    {formatDateTime(event.triggered_at)}
                  </p>
                  {isActive ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#E24B4A', background: '#FFF0F0', border: '1px solid #E24B4A', borderRadius: 20, padding: '3px 10px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E24B4A', display: 'inline-block', animation: 'sosDotPulse 1.4s ease-in-out infinite' }} />
                      Active
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '3px 10px' }}>
                      Resolved
                    </span>
                  )}
                </div>

                {/* Row 2 — location text */}
                <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className={`ti ${event.lat ? 'ti-map-pin' : 'ti-map-pin-off'}`} style={{ fontSize: 13, color: event.lat ? '#1D9E75' : '#A0B8D0' }} />
                  {event.address_text || (event.lat ? `${Number(event.lat).toFixed(4)}, ${Number(event.lng).toFixed(4)}` : 'Location not captured')}
                </p>

                {/* Row 3 — map link */}
                {event.maps_link && (
                  <button
                    onClick={() => window.open(event.maps_link, '_blank')}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#185FA5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}
                  >
                    <i className="ti ti-external-link" style={{ fontSize: 12 }} />
                    View on Map →
                  </button>
                )}

                {/* Row 4 — resolved / still active */}
                {isActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', display: 'inline-block', animation: 'sosDotPulse 1.4s ease-in-out infinite' }} />
                    <span style={{ fontSize: 12, color: '#E24B4A', fontWeight: 600 }}>Still Active</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, margin: 0 }}>
                    <i className="ti ti-shield-check" style={{ fontSize: 12, marginRight: 4 }} />
                    Resolved {formatDateTime(event.resolved_at)}
                    {event.resolved_by ? ` · by ${event.resolved_by}` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ElderLayout>
  )
}

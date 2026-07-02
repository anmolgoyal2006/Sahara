import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── Pulsing circle animation style ───────────────────────────────────────────
const pulseKeyframes = `
  @keyframes sosPulse {
    0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(255,255,255,0.4); }
    70%  { transform: scale(1.15); box-shadow: 0 0 0 20px rgba(255,255,255,0); }
    100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(255,255,255,0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

export default function ElderSOS() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(null)

  // ── Page state ────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('idle')   // 'idle' | 'active' | 'sent' | 'error'

  // ── GPS ───────────────────────────────────────────────────────────────────
  const [location, setLocation]           = useState(null)
  const [locationError, setLocationError] = useState(null)

  // ── SOS result data ───────────────────────────────────────────────────────
  const [sosId,          setSosId]          = useState(null)
  const [mapsLink,       setMapsLink]       = useState(null)
  const [familyMembers,  setFamilyMembers]  = useState([])
  const [nearestWorker,  setNearestWorker]  = useState(null)
  const [sendError,      setSendError]      = useState(null)

  // ── Resolve modal ─────────────────────────────────────────────────────────
  const [showResolveModal,   setShowResolveModal]   = useState(false)
  const [resolving,          setResolving]          = useState(false)

  const hasSentRef = useRef(false)

  // ── Session + active SOS check ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      // SOSButton already confirmed active exists — skip straight to State C
      if (searchParams.get('existing') === 'true') {
        fetch(`${API_URL}/api/sos/active/${uid}`)
          .then(r => r.json())
          .then(data => {
            if (data.active && data.sos) {
              setSosId(data.sos.id)
              setMapsLink(data.sos.maps_link)
            }
            setScreen('sent')
          })
          .catch(() => setScreen('sent'))
        return
      }

      // Normal mount — check for any existing active SOS
      fetch(`${API_URL}/api/sos/active/${uid}`)
        .then(r => r.json())
        .then(data => {
          if (data.active && data.sos) {
            setSosId(data.sos.id)
            setMapsLink(data.sos.maps_link)
            setScreen('sent')
          }
        })
        .catch(() => {})
    })
  }, [navigate, searchParams])

  // ── GPS capture ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location not available on this device')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => {
        setLocationError('Could not get your location')
        console.error('GPS error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // ── Send SOS ──────────────────────────────────────────────────────────────
  async function sendSOS() {
    if (!userId || hasSentRef.current) return
    hasSentRef.current = true
    setScreen('active')
    setSendError(null)

    try {
      const body = { elder_id: userId }
      if (location) {
        body.lat = location.lat
        body.lng = location.lng
      }

      const res = await fetch(`${API_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || 'Trigger failed')

      setSosId(data.sos?.id)
      setMapsLink(data.mapsLink)
      setFamilyMembers(data.familyMembers || [])
      setNearestWorker(data.nearestWorker || null)

      // Confirmation notification on the elder's own device
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Alert Sent — Sahara', {
          body: 'Your family has been notified. Help is coming.',
          icon: '/favicon.svg',
          tag: 'sos-sent-confirmation',
        })
      }

      // Brief pause so the sending animation is visible
      await new Promise(r => setTimeout(r, 2000))
      setScreen('sent')
    } catch (e) {
      console.error('SOS send error:', e)
      setSendError(e.message || 'Could not send alert.')
      setScreen('error')
      hasSentRef.current = false
    }
  }

  // ── Resolve SOS ───────────────────────────────────────────────────────────
  async function handleResolve() {
    if (!sosId) { navigate('/elder/home'); return }
    setResolving(true)
    try {
      await fetch(`${API_URL}/api/sos/resolve/${sosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_by: 'elder', notes: 'Cancelled by elder' }),
      })
      navigate('/elder/home')
    } catch {
      navigate('/elder/home')
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATE A — IDLE
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'idle') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'white', fontFamily: 'Noto Sans, sans-serif' }}>
        <style>{pulseKeyframes}</style>

        {/* Top section — red header */}
        <div style={{ flex: '0 0 30%', minHeight: 220, background: '#FFF0F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(226,75,74,0.35)' }}>
            <i className="ti ti-urgent" style={{ fontSize: 40, color: 'white' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#E24B4A', margin: 0 }}>Emergency Help</p>
        </div>

        {/* Middle section — copy */}
        <div style={{ flex: '0 0 40%', padding: '32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 12px' }}>Send Emergency Alert?</p>
          <p style={{ fontSize: 15, color: '#5A7A9A', margin: '0 0 24px', lineHeight: 1.6 }}>
            This will immediately notify your family members that you need help.
          </p>

          {/* Location status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {location ? (
              <>
                <i className="ti ti-map-pin" style={{ fontSize: 16, color: '#1D9E75' }} />
                <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>Your location will be shared</span>
              </>
            ) : locationError ? (
              <>
                <i className="ti ti-map-pin-off" style={{ fontSize: 16, color: '#BA7517' }} />
                <span style={{ fontSize: 13, color: '#BA7517' }}>Location unavailable — alert will still be sent</span>
              </>
            ) : (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid #DDE8F5', borderTop: '2px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#A0B8D0' }}>Getting your location...</span>
              </>
            )}
          </div>
        </div>

        {/* Bottom section — buttons */}
        <div style={{ flex: '0 0 30%', padding: '0 24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={sendSOS}
            style={{
              width: '100%', height: 64, borderRadius: 14, border: 'none',
              background: '#E24B4A', color: 'white', fontSize: 18, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 20px rgba(226,75,74,0.4)',
            }}
          >
            <i className="ti ti-urgent" style={{ fontSize: 22 }} />
            Send Emergency Alert
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              border: '1.5px solid #DDE8F5', background: 'white',
              color: '#5A7A9A', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            Cancel — I'm okay
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATE B — ACTIVE / SENDING
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'active') {
    return (
      <div style={{ minHeight: '100dvh', background: '#E24B4A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, fontFamily: 'Noto Sans, sans-serif' }}>
        <style>{pulseKeyframes}</style>

        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          border: '4px solid white', background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sosPulse 1.5s ease-in-out infinite',
        }}>
          <i className="ti ti-urgent" style={{ fontSize: 48, color: 'white' }} />
        </div>

        <p style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Sending Alert...</p>

        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Notifying your family</p>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: '#E24B4A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 56, color: 'white' }} />
        <p style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>Could not send alert</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          {sendError || 'Please call 112 for emergency services.'}
        </p>
        <a href="tel:112" style={{ height: 52, padding: '0 28px', borderRadius: 14, background: 'white', color: '#E24B4A', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <i className="ti ti-phone" style={{ fontSize: 18 }} />
          Call 112
        </a>
        <button
          onClick={() => { hasSentRef.current = false; setScreen('idle') }}
          style={{ height: 44, padding: '0 24px', borderRadius: 14, border: '2px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}
        >
          Try Again
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATE C — SENT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100dvh', background: 'white', fontFamily: 'Noto Sans, sans-serif', overflowY: 'auto' }}>
      <style>{pulseKeyframes}</style>

      {/* Green top bar */}
      <div style={{ height: 6, background: '#1D9E75', width: '100%' }} />

      {/* Header section */}
      <div style={{ background: '#F0FBF7', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <i className="ti ti-check" style={{ fontSize: 40, color: '#1D9E75' }} />
        </div>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0A2540', margin: '16px 0 8px' }}>Alert Sent!</p>
        <p style={{ fontSize: 15, color: '#5A7A9A', margin: 0 }}>Your family has been notified</p>
      </div>

      {/* Family notified section */}
      <div style={{ background: 'white', padding: '20px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Who was notified</p>

        {familyMembers.length > 0 ? (
          familyMembers.map((member, i) => (
            <div key={member.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < familyMembers.length - 1 ? '1px solid #EEF4FB' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-user" style={{ fontSize: 16, color: '#1D9E75' }} />
              </div>
              <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>{member.name}</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '3px 10px' }}>Notified</span>
            </div>
          ))
        ) : (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #F5C77A', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: '#BA7517', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>No family members linked yet</p>
              <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>Add a family member from Settings to receive emergency alerts.</p>
            </div>
          </div>
        )}
      </div>

      {/* Nearest worker section */}
      <div style={{ background: 'white', borderTop: '1px solid #EEF4FB', padding: '16px 24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Nearest Helper</p>

        {nearestWorker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-user-check" style={{ fontSize: 18, color: '#1D9E75' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
                {nearestWorker.name}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5A7A9A', marginLeft: 8 }}>{nearestWorker.distanceKm} km away</span>
              </p>
              {nearestWorker.phone && (
                <a
                  href={`tel:${nearestWorker.phone}`}
                  style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <i className="ti ti-phone" style={{ fontSize: 13 }} />
                  {nearestWorker.phone}
                  <span style={{ marginLeft: 4, fontSize: 12, color: '#1D9E75' }}>· Call</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>No verified workers nearby right now.</p>
        )}
      </div>

      {/* Location section */}
      {mapsLink && (
        <div style={{ background: 'white', borderTop: '1px solid #EEF4FB', padding: '16px 24px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Your Location</p>
          <button
            onClick={() => window.open(mapsLink, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EBF4FF', border: '1.5px solid #DDE8F5', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', width: '100%', fontFamily: 'Noto Sans, sans-serif' }}
          >
            <i className="ti ti-map-pin" style={{ fontSize: 18, color: '#185FA5' }} />
            <span style={{ fontSize: 13, color: '#185FA5', fontWeight: 600 }}>Tap to view on Google Maps</span>
            <i className="ti ti-external-link" style={{ fontSize: 13, color: '#185FA5', marginLeft: 'auto' }} />
          </button>
        </div>
      )}

      {/* Resolve + home buttons */}
      <div style={{ padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => setShowResolveModal(true)}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            border: '1.5px solid #1D9E75', background: 'white',
            color: '#1D9E75', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
          }}
        >
          I'm Safe Now — Cancel Alert
        </button>

        <button
          onClick={() => navigate('/elder/home')}
          style={{
            width: '100%', height: 44, borderRadius: 14,
            border: 'none', background: 'transparent',
            color: '#A0B8D0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
          }}
        >
          Back to Home
        </button>

        <button
          onClick={() => navigate('/elder/sos/history')}
          style={{
            width: '100%', height: 36, borderRadius: 14,
            border: 'none', background: 'transparent',
            color: '#185FA5', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
          }}
        >
          View all emergency history →
        </button>
      </div>

      {/* Resolve confirm modal */}
      {showResolveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 400, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-shield-check" style={{ fontSize: 28, color: '#1D9E75' }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>Are you safe?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px' }}>Cancel this emergency alert?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowResolveModal(false)}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}
              >
                Keep Alert Active
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', background: '#1D9E75', color: 'white', fontWeight: 700, fontSize: 15, cursor: resolving ? 'wait' : 'pointer', fontFamily: 'Noto Sans, sans-serif', opacity: resolving ? 0.7 : 1 }}
              >
                {resolving ? 'Resolving...' : "Yes, I'm Safe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

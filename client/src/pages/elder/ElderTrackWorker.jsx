import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, API_URL } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'
import LiveLocationMap from '../../components/booking/LiveLocationMap'

const SERVICE_META = {
  maid:            { icon: 'ti-home-2',      label: 'Maid',            color: '#1D9E75' },
  nurse:           { icon: 'ti-stethoscope', label: 'Nurse',           color: '#E24B4A' },
  driver:          { icon: 'ti-car',         label: 'Driver',          color: '#185FA5' },
  cook:            { icon: 'ti-chef-hat',    label: 'Cook',            color: '#BA7517' },
  physiotherapist: { icon: 'ti-run',         label: 'Physiotherapist', color: '#7C3AED' },
  repair:          { icon: 'ti-tools',       label: 'Repair',          color: '#EA580C' },
}

function formatTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).toUpperCase()
}

export default function ElderTrackWorker() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const bookingId       = params.get('bookingId')

  const [userId, setUserId]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState(null)   // full active-location payload
  const [lastRefresh, setLastRefresh] = useState(null)
  const [noActive, setNoActive]       = useState(false)
  const intervalRef = useRef(null)

  // ── Fetch location data ───────────────────────────────────────────────────
  async function fetchLocation(bid) {
    try {
      const res  = await fetch(`${API_URL}/api/booking/active-location/${bid}`)
      const json = await res.json()
      if (json.success) {
        if (!json.locationSharingActive) {
          // Booking is no longer active — stop polling
          setNoActive(true)
          clearInterval(intervalRef.current)
        } else {
          setData(json)
          setLastRefresh(new Date())
        }
      }
    } catch (_) {}
  }

  // ── Bootstrap: get session + active booking id ────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      let bid = bookingId

      // If no bookingId in URL, find the active booking for this elder
      if (!bid) {
        try {
          const res  = await fetch(`${API_URL}/api/booking/my-active/${uid}?role=elder`)
          const json = await res.json()
          if (json.booking) {
            bid = json.booking.id
          } else {
            setNoActive(true)
            setLoading(false)
            return
          }
        } catch (_) {
          setNoActive(true)
          setLoading(false)
          return
        }
      }

      await fetchLocation(bid)
      setLoading(false)

      // Poll every 15 seconds for live updates
      intervalRef.current = setInterval(() => fetchLocation(bid), 15000)
    }

    init()
    return () => clearInterval(intervalRef.current)
  }, [bookingId, navigate])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#5A7A9A', fontFamily: 'Noto Sans, sans-serif' }}>Finding your worker...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── No active booking ─────────────────────────────────────────────────────
  if (noActive || !data) {
    return (
      <ElderLayout>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', fontFamily: 'Noto Sans, sans-serif', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="ti ti-map-off" style={{ fontSize: 28, color: '#9FE1CB' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>No Active Booking</h2>
          <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 28 }}>
            Worker tracking is only available while a booking is confirmed or in progress.
          </p>
          <button
            onClick={() => navigate('/elder/bookings')}
            style={{ height: 48, padding: '0 28px', borderRadius: 10, border: 'none', background: '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}
          >
            View My Bookings
          </button>
        </div>
      </ElderLayout>
    )
  }

  const { booking, worker, elder } = data
  const svc = SERVICE_META[booking?.service_type] || SERVICE_META.maid
  const workerHasLocation = worker?.lat && worker?.lng
  const mapsLink = workerHasLocation
    ? `https://www.google.com/maps?q=${worker.lat},${worker.lng}`
    : null

  return (
    <ElderLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Noto Sans, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate('/elder/bookings')}
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDE8F5', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 16, color: '#5A7A9A' }} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: 0 }}>Worker Location</h1>
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0 }}>Live • updates every 15 seconds</p>
          </div>
        </div>

        {/* Booking summary card */}
        <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className={`ti ${svc.icon}`} style={{ fontSize: 22, color: svc.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
              {worker?.name || 'Your Worker'}
            </p>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 2px' }}>
              {svc.label} · {formatTime(booking?.scheduled_at)}
            </p>
            {worker?.phone && (
              <a
                href={`tel:${worker.phone}`}
                style={{ fontSize: 12, color: '#185FA5', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <i className="ti ti-phone" style={{ fontSize: 12 }} />
                {worker.phone}
              </a>
            )}
          </div>
          <span style={{ background: '#DCFCE7', color: '#166534', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {booking?.status === 'active' ? 'In Progress' : 'Confirmed'}
          </span>
        </div>

        {/* Live refresh indicator */}
        {lastRefresh && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#5A7A9A' }}>
              Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #DDE8F5', marginBottom: 16 }}>
          <LiveLocationMap
            height="300px"
            primaryPin={
              workerHasLocation
                ? { lat: worker.lat, lng: worker.lng, label: worker?.name || 'Worker', color: '#185FA5' }
                : null
            }
            secondaryPin={
              elder?.lat && elder?.lng
                ? { lat: elder.lat, lng: elder.lng, label: 'Your Home', color: '#1D9E75' }
                : null
            }
          />
        </div>

        {/* Location details */}
        {workerHasLocation ? (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-map-pin" style={{ fontSize: 14, color: '#185FA5' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                  {worker?.name || 'Worker'}'s Location
                </p>
                <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>
                  {Number(worker.lat).toFixed(5)}, {Number(worker.lng).toFixed(5)}
                </p>
              </div>
            </div>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, border: '1.5px solid #185FA5', background: 'white', color: '#185FA5', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
              >
                <i className="ti ti-external-link" style={{ fontSize: 14 }} />
                Open in Google Maps
              </a>
            )}
          </div>
        ) : (
          <div style={{ background: '#FAEEDA', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-clock" style={{ fontSize: 16, color: '#BA7517', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', margin: 0 }}>Worker location not shared yet</p>
                <p style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Your worker will appear on the map once they open Sahara</p>
              </div>
            </div>
          </div>
        )}

        {/* Call button */}
        {worker?.phone && (
          <a
            href={`tel:${worker.phone}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 12, border: 'none', background: '#1D9E75', color: 'white', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            <i className="ti ti-phone" style={{ fontSize: 18 }} />
            Call {worker?.name || 'Worker'}
          </a>
        )}
      </div>
    </ElderLayout>
  )
}

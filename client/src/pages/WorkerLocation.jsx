import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import WorkerLayout from '../components/layout/WorkerLayout'
import { useActiveBookingLocation } from '../hooks/useActiveBookingLocation'

// ── Vanilla Leaflet map ───────────────────────────────────────────────────────
// Shows worker pin (green) + optional elder pin (blue) when active booking exists.
function LeafletMap({ lat, lng, workerName, elderLat, elderLng, elderName }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const workerMarkRef = useRef(null)
  const elderMarkRef  = useRef(null)

  // ── Initial mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    // Load Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) return // already initialised

      // ── Icons ──────────────────────────────────────────────────────────────
      const workerIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#1D9E75;border:3px solid white;
          box-shadow:0 2px 10px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
        "><i class="ti ti-navigation" style="color:white;font-size:16px;"></i></div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
      })

      const elderIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:#185FA5;border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
        "><span style="color:white;font-size:14px;line-height:1">🏠</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
      })

      // ── Map ────────────────────────────────────────────────────────────────
      const map = L.map(containerRef.current).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Worker marker
      const wm = L.marker([lat, lng], { icon: workerIcon })
        .addTo(map)
        .bindPopup(`<b style="font-family:Noto Sans,sans-serif;font-size:13px">${workerName || 'You'} — Your location</b>`)
      workerMarkRef.current = wm

      // Elder marker (only if coords available at mount time)
      if (elderLat && elderLng) {
        const em = L.marker([elderLat, elderLng], { icon: elderIcon })
          .addTo(map)
          .bindPopup(`<b style="font-family:Noto Sans,sans-serif;font-size:13px">${elderName || 'Elder'} — Elder Location</b>`)
        elderMarkRef.current = em

        // Fit both pins in view
        map.fitBounds(
          L.latLngBounds([lat, lng], [elderLat, elderLng]),
          { padding: [48, 48] }
        )
      }

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current     = null
        workerMarkRef.current = null
        elderMarkRef.current  = null
      }
    }
  }, []) // init once

  // ── Update worker marker when own coords change ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !workerMarkRef.current) return
    workerMarkRef.current.setLatLng([lat, lng])
    // Only recenter on worker if no elder pin is visible
    if (!elderMarkRef.current) {
      mapRef.current.setView([lat, lng], 14, { animate: true })
    }
  }, [lat, lng])

  // ── Add / update elder marker when active booking arrives ─────────────────
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then(({ default: L }) => {
      if (!elderLat || !elderLng) {
        // Remove elder marker if booking ended
        if (elderMarkRef.current) {
          elderMarkRef.current.remove()
          elderMarkRef.current = null
        }
        return
      }

      if (elderMarkRef.current) {
        // Already exists — just move it
        elderMarkRef.current.setLatLng([elderLat, elderLng])
      } else {
        // Create fresh
        const elderIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:#185FA5;border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          "><span style="color:white;font-size:14px;line-height:1">🏠</span></div>`,
          iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
        })
        const em = L.marker([elderLat, elderLng], { icon: elderIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b style="font-family:Noto Sans,sans-serif;font-size:13px">${elderName || 'Elder'} — Elder Location</b>`)
        elderMarkRef.current = em
      }

      // Fit both pins in view whenever elder coords update
      if (workerMarkRef.current) {
        mapRef.current.fitBounds(
          L.latLngBounds([lat, lng], [elderLat, elderLng]),
          { padding: [48, 48], animate: true }
        )
      }
    })
  }, [elderLat, elderLng])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkerLocation() {
  const navigate = useNavigate()

  const [userId, setUserId]           = useState(null)
  const [workerUser, setWorkerUser]   = useState(null)
  const [worker, setWorker]           = useState(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [lat, setLat]                 = useState(null)
  const [lng, setLng]                 = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [updating, setUpdating]       = useState(false)
  const [loading, setLoading]         = useState(true)

  // Active booking → elder location (polls every 30s)
  const { locationData, refresh } = useActiveBookingLocation(userId, 'worker')

  const elderLat  = locationData?.elder?.lat  || null
  const elderLng  = locationData?.elder?.lng  || null
  const elderName = locationData?.elder?.name || null

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const res  = await fetch(`${API_URL}/api/worker/profile/${uid}`)
      const data = await res.json()
      if (data.success) {
        setWorkerUser(data.user)
        setWorker(data.worker)
        setIsAvailable(data.worker?.available ?? true)
        if (data.worker?.lat) setLat(data.worker.lat)
        if (data.worker?.lng) setLng(data.worker.lng)
        if (data.worker?.updated_at) setLastUpdated(data.worker.updated_at)
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleUpdateNow() {
    if (!navigator.geolocation || !userId) return
    setUpdating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        try {
          await fetch(`${API_URL}/api/worker/location/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          })
          setLat(latitude)
          setLng(longitude)
          setLastUpdated(new Date().toISOString())
        } catch {}
        setUpdating(false)
      },
      () => setUpdating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const hasLocation = lat !== null && lng !== null
  const hasElderLoc = elderLat !== null && elderLng !== null

  return (
    <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 4 }}>My Location</p>
        <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 20 }}>Your live position shared with elders nearby</p>

        {/* ── My location status card ── */}
        <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isAvailable ? '#1D9E75' : '#A0B8D0' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: isAvailable ? '#0F6E56' : '#5A7A9A' }}>
                {isAvailable ? 'Location sharing ON' : 'Location sharing OFF'}
              </span>
            </div>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#A0B8D0' }}>
                Updated {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>

          {hasLocation && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#F7FBFF', borderRadius: 10, padding: '10px 14px', border: '1px solid #EEF4FB' }}>
                <p style={{ fontSize: 10, color: '#A0B8D0', fontWeight: 600, marginBottom: 2 }}>LATITUDE</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>{lat.toFixed(6)}</p>
              </div>
              <div style={{ flex: 1, background: '#F7FBFF', borderRadius: 10, padding: '10px 14px', border: '1px solid #EEF4FB' }}>
                <p style={{ fontSize: 10, color: '#A0B8D0', fontWeight: 600, marginBottom: 2 }}>LONGITUDE</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>{lng.toFixed(6)}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleUpdateNow}
            disabled={updating}
            style={{ width: '100%', height: 48, borderRadius: 10, border: 'none', background: updating ? '#9FE1CB' : '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <i className="ti ti-map-pin" style={{ fontSize: 16 }} />
            {updating ? 'Getting location...' : 'Update Location Now'}
          </button>
        </div>

        {/* ── Active booking — elder location card ── */}
        {locationData?.elder && (
          <div style={{
            background: '#EBF4FF',
            border: '1.5px solid #DDE8F5',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
              Active Booking — Elder Location
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Elder avatar */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-user" style={{ color: 'white', fontSize: 18 }} />
              </div>

              {/* Elder info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                  {locationData.elder.name || 'Elder'}
                </p>
                {locationData.elder.address && (
                  <p style={{ fontSize: 12, color: '#5A7A9A', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {locationData.elder.address}
                  </p>
                )}
                {hasElderLoc && (
                  <p style={{ fontSize: 11, color: '#A0B8D0', margin: '2px 0 0' }}>
                    {elderLat.toFixed(4)}, {elderLng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Directions button */}
              {hasElderLoc && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${elderLat},${elderLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: '#185FA5', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <i className="ti ti-navigation" style={{ fontSize: 12 }} />
                  Directions
                </a>
              )}
            </div>

            {/* Phone + refresh row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #D4E4F5' }}>
              {locationData.elder.phone ? (
                <a href={`tel:${locationData.elder.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#1D9E75', textDecoration: 'none' }}>
                  <i className="ti ti-phone" style={{ fontSize: 13 }} />
                  Call Elder
                </a>
              ) : <span />}
              <button
                onClick={refresh}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A0B8D0', fontFamily: 'inherit', padding: 0 }}
              >
                <i className="ti ti-refresh" style={{ fontSize: 12 }} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* ── Map ── */}
        {hasLocation ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #DDE8F5', height: 360 }}>
            <LeafletMap
              lat={lat}
              lng={lng}
              workerName={workerUser?.name}
              elderLat={elderLat}
              elderLng={elderLng}
              elderName={elderName}
            />
          </div>
        ) : (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
            <i className="ti ti-map-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No location data yet</p>
            <p style={{ fontSize: 12, color: '#A0B8D0' }}>Click "Update Location Now" to share your position</p>
          </div>
        )}

        {/* Legend — only when both pins are visible */}
        {hasLocation && hasElderLoc && (
          <div style={{ display: 'flex', gap: 16, marginTop: 12, padding: '10px 14px', background: 'white', borderRadius: 10, border: '1px solid #EEF4FB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1D9E75', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              <span style={{ fontSize: 11, color: '#5A7A9A', fontWeight: 600 }}>You</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#185FA5', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              <span style={{ fontSize: 11, color: '#5A7A9A', fontWeight: 600 }}>{elderName || 'Elder'}</span>
            </div>
          </div>
        )}
      </div>
    </WorkerLayout>
  )
}

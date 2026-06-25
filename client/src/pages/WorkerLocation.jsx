import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import WorkerLayout from '../components/layout/WorkerLayout'

// Vanilla Leaflet map — avoids react-leaflet React 18 context incompatibility
function LeafletMap({ lat, lng, workerName }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markerRef    = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Dynamically load leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) return // already initialised

      const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      })

      const map = L.map(containerRef.current).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const marker = L.marker([lat, lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup(workerName || 'You are here')
      
      mapRef.current    = map
      markerRef.current = marker
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current    = null
        markerRef.current = null
      }
    }
  }, []) // only init once

  // Update marker + recenter when coords change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    markerRef.current.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], 14)
  }, [lat, lng])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

export default function WorkerLocation() {
  const navigate   = useNavigate()
  const [userId, setUserId]       = useState(null)
  const [workerUser, setWorkerUser] = useState(null)
  const [worker, setWorker]       = useState(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [lat, setLat]             = useState(null)
  const [lng, setLng]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [updating, setUpdating]   = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const res = await fetch(`${API_URL}/api/worker/profile/${uid}`)
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

  return (
    <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 4 }}>My Location</p>
        <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 20 }}>Your live position shared with elders nearby</p>

        {/* Status card */}
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

        {/* Map */}
        {hasLocation ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #DDE8F5', height: 360 }}>
            <LeafletMap lat={lat} lng={lng} workerName={workerUser?.name} />
          </div>
        ) : (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
            <i className="ti ti-map-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No location data yet</p>
            <p style={{ fontSize: 12, color: '#A0B8D0' }}>Click "Update Location Now" to share your position</p>
          </div>
        )}
      </div>
    </WorkerLayout>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FamilyLayout from '../components/layout/FamilyLayout'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const RADIUS_PRESETS = [
  { label: '200m', value: 200 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
]

function formatRadius(meters) {
  if (meters < 1000) return `${meters} meters`
  return `${(meters / 1000).toFixed(1)} km`
}

/* ─────────────────────────────────────
   Leaflet Map with draggable marker + circle
   + optional read-only elder location pin
───────────────────────────────────── */
function GeofenceMap({ centerLat, centerLng, radiusMeters, onMarkerDrag, mapKey, elderLat, elderLng, elderName }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markerRef    = useRef(null)
  const circleRef    = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !centerLat || !centerLng) return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        circleRef.current = null
      }

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([centerLat, centerLng], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // ── Elder's current location pin (read-only, blue) ──
      if (elderLat && elderLng) {
        const elderIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:36px;height:36px;border-radius:50%;
            background:#185FA5;border:3px solid white;
            box-shadow:0 2px 10px rgba(24,95,165,0.45);
            display:flex;align-items:center;justify-content:center;
          "><i class="ti ti-user" style="color:white;font-size:16px;"></i></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20],
        })
        L.marker([elderLat, elderLng], { icon: elderIcon, interactive: true })
          .addTo(map)
          .bindPopup(`<b style="font-size:13px">${elderName || 'Elder'}'s current location</b>`)
      }

      // ── Home / zone centre marker (draggable, green) ──
      const homeIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:40px;height:40px;border-radius:50%;
          background:#1D9E75;border:3px solid white;
          box-shadow:0 2px 10px rgba(29,158,117,0.45);
          display:flex;align-items:center;justify-content:center;
          cursor:grab;
        "><i class="ti ti-home" style="color:white;font-size:18px;"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22],
      })

      const marker = L.marker([centerLat, centerLng], {
        icon: homeIcon,
        draggable: true,
      })
        .addTo(map)
        .bindPopup('<b style="font-size:13px">Drag to set home</b>')

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        onMarkerDrag(lat, lng)
      })

      const circle = L.circle([centerLat, centerLng], {
        radius: radiusMeters,
        color: '#1D9E75',
        fillColor: '#1D9E75',
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map)

      mapRef.current    = map
      markerRef.current = marker
      circleRef.current = circle
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current    = null
        markerRef.current = null
        circleRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey])

  useEffect(() => {
    if (!circleRef.current) return
    circleRef.current.setRadius(radiusMeters)
  }, [radiusMeters])

  useEffect(() => {
    if (!markerRef.current || !circleRef.current) return
    markerRef.current.setLatLng([centerLat, centerLng])
    circleRef.current.setLatLng([centerLat, centerLng])
  }, [centerLat, centerLng])

  if (!centerLat || !centerLng) {
    return (
      <div style={{
        height: 260, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F7FBFF', borderRadius: 12,
        border: '1.5px dashed #DDE8F5', gap: 10,
      }}>
        <i className="ti ti-map-pin-off" style={{ fontSize: 36, color: '#DDE8F5' }} />
        <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>Getting location…</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height: 260, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  )
}

/* ─────────────────────────────────────
   Main page
───────────────────────────────────── */
export default function FamilyGeofenceSetup() {
  const navigate = useNavigate()

  const [userId,        setUserId]        = useState(null)
  const [userName,      setUserName]      = useState(null)
  const [elderId,       setElderId]       = useState(null)
  const [elderName,     setElderName]     = useState(null)
  const [elderLat,      setElderLat]      = useState(null)
  const [elderLng,      setElderLng]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState(null)
  const [toast,         setToast]         = useState(false)
  const [hasZone,       setHasZone]       = useState(false)
  const [notLinked,     setNotLinked]     = useState(false)

  // Zone fields
  const [centerLat,    setCenterLat]    = useState(null)
  const [centerLng,    setCenterLng]    = useState(null)
  const [radiusMeters, setRadiusMeters] = useState(500)
  const [label,        setLabel]        = useState('Home')
  const [isActive,     setIsActive]     = useState(true)
  const [zoneIsActive, setZoneIsActive] = useState(true)

  // Address search
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [searchError,    setSearchError]    = useState(null)
  const searchDebounceRef = useRef(null)

  // Map
  const [mapKey, setMapKey] = useState(0)

  /* ── Load session + linked elder + existing zone ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id
      setUserId(uid)
      setUserName(session.user.user_metadata?.name || null)

      try {
        // Get linked elder
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

        // Store elder's last known location for the map pin
        const eLat = overviewData.elder.lat
        const eLng = overviewData.elder.lng
        if (eLat && eLng) {
          setElderLat(eLat)
          setElderLng(eLng)
        }

        // Fetch existing zone for the elder
        const zoneRes  = await fetch(`${API_URL}/api/geofence/zone/${eid}`)
        const zoneData = await zoneRes.json()

        if (zoneData.hasZone && zoneData.zone) {
          setHasZone(true)
          setCenterLat(zoneData.zone.center_lat)
          setCenterLng(zoneData.zone.center_lng)
          setRadiusMeters(zoneData.zone.radius_meters)
          setLabel(zoneData.zone.label || 'Home')
          setIsActive(zoneData.zone.is_active)
          setZoneIsActive(zoneData.zone.is_active)
        } else if (eLat && eLng) {
          // Seed map to elder's current location when no zone exists
          setCenterLat(eLat)
          setCenterLng(eLng)
          setMapKey(k => k + 1)
        }
        // else: map stays blank until user searches an address
      } catch {
        // silent — map stays blank, user can search
      } finally {
        setLoading(false)
      }
    })
  }, [])

  /* ── Address search via Nominatim (OpenStreetMap, no key needed) ── */
  function handleSearchInput(value) {
    setSearchQuery(value)
    setSearchResults([])
    setSearchError(null)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!value.trim() || value.trim().length < 3) return
    searchDebounceRef.current = setTimeout(() => doSearch(value.trim()), 450)
  }

  async function doSearch(query) {
    setSearchLoading(true)
    setSearchError(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (!data.length) setSearchError('No results found. Try a more specific address.')
      setSearchResults(data)
    } catch {
      setSearchError('Search failed. Check your connection.')
    } finally {
      setSearchLoading(false)
    }
  }

  function selectResult(result) {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setCenterLat(lat)
    setCenterLng(lng)
    setMapKey(k => k + 1)
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','))
    setSearchResults([])
  }

  /* ── Save (saves against the elder's ID) ── */
  async function handleSave() {
    if (!centerLat || !centerLng || !elderId) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/geofence/zone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elder_id:      elderId,
          center_lat:    centerLat,
          center_lng:    centerLng,
          radius_meters: radiusMeters,
          label,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Save failed')

      if (isActive !== zoneIsActive) {
        await fetch(`${API_URL}/api/geofence/zone/${elderId}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: isActive }),
        })
      }

      setToast(true)
      setTimeout(() => {
        setToast(false)
        navigate('/family/dashboard')
      }, 1800)
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ textAlign: 'center', padding: 60, color: '#A0B8D0' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
          Loading safety zone…
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
          <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 20 }}>
            Link a senior family member first to manage their safety zone.
          </p>
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
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1D9E75', color: 'white', borderRadius: 12,
          padding: '12px 24px', fontSize: 14, fontWeight: 700,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-check" style={{ fontSize: 18 }} />
          Safety zone saved!
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
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
        <div style={{
          background: 'linear-gradient(135deg, #0A2540, #185FA5)',
          borderRadius: 16, padding: '24px 20px', marginBottom: 20,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <i className="ti ti-map-pin-check" style={{ fontSize: 28, color: 'white', marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0, marginBottom: 6 }}>
                Safety Zone
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                {elderName
                  ? `Set a safe zone for ${elderName} — you'll be notified if they leave it`
                  : 'Set a safe zone for your elder — you\'ll be notified if they leave it'}
              </p>
            </div>
          </div>

          {hasZone && (
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: zoneIsActive ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.15)',
              border: `1px solid ${zoneIsActive ? '#1D9E75' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 20, padding: '4px 12px',
              fontSize: 11, fontWeight: 700,
              color: zoneIsActive ? '#9FE1CB' : 'rgba(255,255,255,0.6)',
            }}>
              {zoneIsActive ? '● Active' : '○ Paused'}
            </div>
          )}
        </div>

        {/* Onboarding / info card */}
        {!hasZone ? (
          <div style={{
            background: '#F0FBF7', border: '1.5px solid #9FE1CB',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F6E56', marginBottom: 6 }}>
              Set up {elderName ? `${elderName}'s` : 'their'} Safety Zone
            </p>
            <p style={{ fontSize: 13, color: '#5A7A9A', lineHeight: 1.6, marginBottom: 8 }}>
              You'll automatically be notified whenever they leave or return to this zone — no need for constant check-in calls.
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', margin: 0 }}>
              Takes 1 minute to set up
            </p>
          </div>
        ) : (
          <div style={{
            background: '#EBF4FF', border: '1.5px solid #DDE8F5',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <i className="ti ti-info-circle" style={{ fontSize: 16, color: '#185FA5' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#185FA5' }}>How does this work?</span>
            </div>
            {[
              { emoji: '📍', text: 'Pin their home location on the map' },
              { emoji: '📏', text: 'Choose a safe radius (200m — 5km)' },
              { emoji: '🔔', text: 'You get notified if they go outside' },
            ].map((row) => (
              <div key={row.text} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{row.emoji}</span>
                <span style={{ fontSize: 11, color: '#185FA5' }}>{row.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Map section */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 16, marginBottom: 20,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#A0B8D0',
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
          }}>
            Home Location
          </p>

          {/* ── Address search ── */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1.5px solid #DDE8F5', borderRadius: 12,
              background: '#F7FAFF', overflow: 'visible',
            }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: '#A0B8D0', padding: '0 10px', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search address, landmark or area…"
                style={{
                  flex: 1, height: 44, border: 'none', background: 'transparent',
                  fontSize: 14, color: '#0A2540', fontFamily: 'inherit',
                  outline: 'none', paddingRight: 36,
                }}
              />
              {searchLoading && (
                <i className="ti ti-loader-2" style={{
                  fontSize: 16, color: '#A0B8D0', padding: '0 10px', flexShrink: 0,
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
              {searchQuery && !searchLoading && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchError(null) }}
                  style={{ background: 'none', border: 'none', padding: '0 10px', cursor: 'pointer', color: '#A0B8D0', fontSize: 16 }}
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            {(searchResults.length > 0 || searchError) && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4,
                overflow: 'hidden',
              }}>
                {searchError && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#A0B8D0' }}>
                    {searchError}
                  </div>
                )}
                {searchResults.map((r, i) => (
                  <button
                    key={r.place_id}
                    onClick={() => selectResult(r)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      borderTop: i > 0 ? '1px solid #F0F4F8' : 'none',
                      padding: '11px 14px', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F7FAFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <i className="ti ti-map-pin" style={{ fontSize: 15, color: '#1D9E75', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#0A2540', lineHeight: 1.4 }}>
                      {r.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <GeofenceMap
            centerLat={centerLat}
            centerLng={centerLng}
            radiusMeters={radiusMeters}
            mapKey={mapKey}
            elderLat={elderLat}
            elderLng={elderLng}
            elderName={elderName}
            onMarkerDrag={(lat, lng) => {
              setCenterLat(lat)
              setCenterLng(lng)
            }}
          />

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#5A7A9A', fontWeight: 600 }}>Zone centre (drag to adjust)</span>
            </div>
            {elderLat && elderLng && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#185FA5', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#5A7A9A', fontWeight: 600 }}>{elderName || 'Elder'}'s current location</span>
              </div>
            )}
          </div>

          {/* Jump-to shortcuts */}
          {elderLat && elderLng && (
            <button
              onClick={() => { setCenterLat(elderLat); setCenterLng(elderLng); setMapKey(k => k + 1) }}
              style={{
                marginTop: 10, height: 36, padding: '0 14px', borderRadius: 10,
                border: '1.5px solid #DDE8F5', background: 'white',
                color: '#185FA5', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="ti ti-user-pin" style={{ fontSize: 13 }} />
              Centre on {elderName || 'Elder'}
            </button>
          )}

          {centerLat && centerLng && (
            <p style={{ fontSize: 11, color: '#A0B8D0', margin: '8px 0 0' }}>
              {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
            </p>
          )}
        </div>

        {/* Radius selector */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 16, marginBottom: 20,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#A0B8D0',
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
          }}>
            Safe Zone Radius
          </p>

          <p style={{ fontSize: 24, fontWeight: 700, color: '#1D9E75', margin: '0 0 2px' }}>
            {formatRadius(radiusMeters)}
          </p>
          <p style={{ fontSize: 12, color: '#A0B8D0', marginBottom: 16 }}>
            {elderName ? `${elderName} can` : 'They can'} go up to {formatRadius(radiusMeters)} from home
          </p>

          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={radiusMeters}
            onChange={e => setRadiusMeters(parseInt(e.target.value))}
            style={{ width: '100%', marginBottom: 16, accentColor: '#1D9E75', height: 6, cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            {RADIUS_PRESETS.map(p => {
              const active = radiusMeters === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => setRadiusMeters(p.value)}
                  style={{
                    flex: 1, height: 36, borderRadius: 20,
                    border: active ? '2px solid #1D9E75' : '1.5px solid #DDE8F5',
                    background: active ? '#1D9E75' : 'white',
                    color: active ? 'white' : '#5A7A9A',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Zone label */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 16, marginBottom: 20,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#A0B8D0',
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
          }}>
            Zone Name
          </p>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Home, Daughter's House"
            maxLength={40}
            style={{
              width: '100%', height: 48, border: '1.5px solid #DDE8F5',
              borderRadius: 12, padding: '0 14px', fontSize: 15,
              color: '#0A2540', background: 'white', fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Active toggle */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 16, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 2 }}>
              Geofence Alerts
            </p>
            <p style={{ fontSize: 12, color: '#A0B8D0' }}>
              Notify me when {elderName || 'they'} leave this zone
            </p>
          </div>
          <div
            onClick={() => setIsActive(!isActive)}
            style={{
              width: 48, height: 28, borderRadius: 14,
              background: isActive ? '#1D9E75' : '#DDE8F5',
              position: 'relative', cursor: 'pointer',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: isActive ? 23 : 3,
              width: 22, height: 22, borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FFF4F4', border: '1px solid #FECACA',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: '#E24B4A', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!centerLat || !centerLng || saving}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: (!centerLat || !centerLng || saving) ? '#A0B8D0' : '#1D9E75',
            border: 'none', color: 'white', fontSize: 18, fontWeight: 700,
            cursor: (!centerLat || !centerLng || saving) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginBottom: 16, transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save Safety Zone'}
        </button>

        {/* View history link */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button
            onClick={() => navigate('/family/location-history')}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 700, color: '#185FA5',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            View location history →
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </FamilyLayout>
  )
}

import { useEffect, useRef, useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBookingTime(scheduledAt) {
  if (!scheduledAt) return ''
  const d = new Date(scheduledAt)
  const now = new Date()
  const tom = new Date(now); tom.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`
  if (d.toDateString() === tom.toDateString()) return `Tomorrow · ${time}`
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time}`
}

function haversineKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null
  const R   = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

const SERVICE_LABELS = {
  maid: 'Maid', nurse: 'Nurse', driver: 'Driver',
  cook: 'Cook', physiotherapist: 'Physiotherapist', repair: 'Repair',
}

// ── Leaflet map (vanilla — avoids react-leaflet React 18 issues) ──────────────

function BookingLeafletMap({ workerLat, workerLng, elderLat, elderLng, workerName }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const workerMarkRef = useRef(null)

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

    const centerLat = workerLat || elderLat || 28.6139
    const centerLng = workerLng || elderLng || 77.2090

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) return

      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false })
        .setView([centerLat, centerLng], 14)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Worker marker — green moving pin
      const workerIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:#1D9E75;border:3px solid white;
          box-shadow:0 2px 10px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        "><i class="ti ti-user" style="color:white;font-size:14px;"></i></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
      })

      if (workerLat && workerLng) {
        const wm = L.marker([workerLat, workerLng], { icon: workerIcon })
          .addTo(map)
          .bindPopup(`<b style="font-size:13px;font-family:Noto Sans,sans-serif">${workerName || 'Your helper'} — Your helper</b>`)
        workerMarkRef.current = wm
      }

      // Elder marker — blue home pin
      if (elderLat && elderLng) {
        const elderIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:#185FA5;border:2px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
          "><i class="ti ti-home" style="color:white;font-size:12px;"></i></div>`,
          iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
        })
        L.marker([elderLat, elderLng], { icon: elderIcon })
          .addTo(map)
          .bindPopup(`<b style="font-size:13px;font-family:Noto Sans,sans-serif">Your location</b>`)

        // Fit both markers in view if both exist
        if (workerLat && workerLng) {
          map.fitBounds(
            L.latLngBounds([workerLat, workerLng], [elderLat, elderLng]),
            { padding: [36, 36] }
          )
        }
      }

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; workerMarkRef.current = null }
    }
  }, []) // init once

  // Update worker marker when coords change
  useEffect(() => {
    if (!mapRef.current || !workerMarkRef.current || !workerLat || !workerLng) return
    workerMarkRef.current.setLatLng([workerLat, workerLng])
    mapRef.current.setView([workerLat, workerLng], 14, { animate: true })
  }, [workerLat, workerLng])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActiveBookingMap({
  booking,
  workerLocation,
  workerName,
  workerPhone,
  elderLocation,  // { lat, lng } — optional, used for distance calc
  workerPhoto,
  workerRating,
  onRefresh,
}) {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing]   = useState(false)

  const hasWorkerLoc = !!(workerLocation?.lat && workerLocation?.lng)
  const hasElderLoc  = !!(elderLocation?.lat  && elderLocation?.lng)

  const distanceKm = hasWorkerLoc && hasElderLoc
    ? haversineKm(workerLocation.lat, workerLocation.lng, elderLocation.lat, elderLocation.lng)
    : null

  const svcLabel = SERVICE_LABELS[booking?.service_type] || booking?.service_type || 'Service'
  const statusLabel = booking?.status === 'active' ? 'Worker Active' : 'Worker En Route'

  // Initials fallback for worker avatar
  const initials = workerName
    ? workerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'W'

  async function handleRefresh() {
    setRefreshing(true)
    await onRefresh?.()
    setLastUpdated(new Date())
    setRefreshing(false)
  }

  function timeSince(date) {
    const secs = Math.floor((new Date() - date) / 1000)
    if (secs < 10)  return 'just now'
    if (secs < 60)  return `${secs}s ago`
    if (secs < 120) return '1 min ago'
    return `${Math.floor(secs / 60)} min ago`
  }

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #DDE8F5',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F6E56, #1D9E75)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left: status + service info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Pulsing dot */}
          <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 1, left: 1,
              boxShadow: '0 0 0 0 rgba(255,255,255,0.7)',
              animation: 'abm-pulse 2s infinite',
            }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>
              {statusLabel}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              {svcLabel} · {formatBookingTime(booking?.scheduled_at)}
            </p>
          </div>
        </div>

        {/* Right: call button */}
        {workerPhone && (
          <a
            href={`tel:${workerPhone}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 30, padding: '0 12px', borderRadius: 20,
              border: '1.5px solid rgba(255,255,255,0.7)',
              background: 'transparent', color: 'white',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <i className="ti ti-phone" style={{ fontSize: 12 }} />
            Call
          </a>
        )}
      </div>

      {/* ── Map section or no-location placeholder ── */}
      {hasWorkerLoc ? (
        <div style={{ height: 200 }}>
          <BookingLeafletMap
            workerLat={workerLocation.lat}
            workerLng={workerLocation.lng}
            elderLat={elderLocation?.lat}
            elderLng={elderLocation?.lng}
            workerName={workerName}
          />
        </div>
      ) : (
        <div style={{
          height: 200,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, background: '#F7FBFF',
        }}>
          <i className="ti ti-map-pin-question" style={{ fontSize: 40, color: '#F59E0B' }} />
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, fontWeight: 600 }}>
            Waiting for worker's location...
          </p>
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0, textAlign: 'center', padding: '0 24px' }}>
            Location updates when worker starts navigation
          </p>
        </div>
      )}

      {/* ── Bottom info bar ── */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderTop: '1px solid #EEF4FB',
      }}>
        {/* Worker avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: '#F0FBF7', border: '2px solid #9FE1CB',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {workerPhoto
            ? <img src={workerPhoto} alt={workerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 14, fontWeight: 800, color: '#1D9E75' }}>{initials}</span>
          }
        </div>

        {/* Worker info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workerName || 'Your Worker'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {workerRating > 0 && (
              <span style={{ fontSize: 12, color: '#5A7A9A' }}>⭐ {Number(workerRating).toFixed(1)}</span>
            )}
            {distanceKm !== null && (
              <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m away` : `${distanceKm} km away`}
              </span>
            )}
          </div>
        </div>

        {/* Refresh + timestamp */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: 12, color: '#A0B8D0', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
              marginBottom: 2,
            }}
          >
            <i className={`ti ti-refresh${refreshing ? ' rotating' : ''}`} style={{ fontSize: 12 }} />
            Refresh
          </button>
          <p style={{ fontSize: 10, color: '#C0D4E8', margin: 0 }}>
            Updated {timeSince(lastUpdated)}
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes abm-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes abm-spin { to { transform: rotate(360deg); } }
        .rotating { animation: abm-spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

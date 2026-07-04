import { useEffect, useRef } from 'react'

/**
 * LiveLocationMap — vanilla Leaflet map showing one or two pins.
 * Uses dynamic import to avoid react-leaflet React 18 context issues.
 *
 * Props:
 *   primaryPin   { lat, lng, label, color }  — always shown (e.g. worker)
 *   secondaryPin { lat, lng, label, color }  — optional (e.g. elder home)
 *   height       — css height string (default '260px')
 */
export default function LiveLocationMap({ primaryPin, secondaryPin, height = '260px' }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const primaryRef   = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !primaryPin?.lat || !primaryPin?.lng) return

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

      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false })
        .setView([primaryPin.lat, primaryPin.lng], 14)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Primary marker (pulsing blue for worker, green for elder)
      const primaryColor = primaryPin.color || '#185FA5'
      const primaryIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${primaryColor};border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        "><i class="ti ti-map-pin" style="color:white;font-size:16px;"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      })

      const primaryMarker = L.marker([primaryPin.lat, primaryPin.lng], { icon: primaryIcon })
        .addTo(map)
        .bindPopup(`<b style="font-size:13px">${primaryPin.label || 'Location'}</b>`)

      primaryRef.current = primaryMarker
      mapRef.current     = map

      // Secondary marker (home pin)
      if (secondaryPin?.lat && secondaryPin?.lng) {
        const secColor = secondaryPin.color || '#1D9E75'
        const secIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:${secColor};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
          "><i class="ti ti-home" style="color:white;font-size:14px;"></i></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        })
        L.marker([secondaryPin.lat, secondaryPin.lng], { icon: secIcon })
          .addTo(map)
          .bindPopup(`<b style="font-size:13px">${secondaryPin.label || 'Home'}</b>`)

        // Fit both pins in view
        const bounds = L.latLngBounds(
          [primaryPin.lat, primaryPin.lng],
          [secondaryPin.lat, secondaryPin.lng]
        )
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current    = null
        primaryRef.current = null
      }
    }
  }, []) // init once

  // Update primary marker when coords change (live refresh)
  useEffect(() => {
    if (!mapRef.current || !primaryRef.current || !primaryPin?.lat || !primaryPin?.lng) return
    primaryRef.current.setLatLng([primaryPin.lat, primaryPin.lng])
    mapRef.current.setView([primaryPin.lat, primaryPin.lng], 14, { animate: true })
  }, [primaryPin?.lat, primaryPin?.lng])

  if (!primaryPin?.lat || !primaryPin?.lng) {
    return (
      <div style={{
        height,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F7FBFF', borderRadius: 12,
        border: '1.5px dashed #DDE8F5', gap: 10,
      }}>
        <i className="ti ti-map-pin-off" style={{ fontSize: 36, color: '#DDE8F5' }} />
        <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>Location not available yet</p>
        <p style={{ fontSize: 11, color: '#C0D4E8', margin: 0 }}>Updates when the app is open</p>
      </div>
    )
  }

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }} />
}

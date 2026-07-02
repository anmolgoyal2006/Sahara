import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix leaflet's default icon path issue with bundlers
import 'leaflet/dist/leaflet.css'

// Custom green circle DivIcon
const elderIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: #1D9E75; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <i class="ti ti-user" style="color: white; font-size: 15px;"></i>
    </div>
  `,
  iconSize:   [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
})

// Recenter map when coords change
function Recenter({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true })
  }, [lat, lng, map])
  return null
}

export default function ElderLocationMap({ lat, lng, elderName, address }) {
  const mapsLink = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!lat || !lng) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 14, overflow: 'hidden', marginBottom: 20,
        fontFamily: 'Noto Sans, sans-serif',
      }}>
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>Last Known Location</p>
          <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>Updates when parent has Sahara open</p>
        </div>
        <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <i className="ti ti-map-pin-off" style={{ fontSize: 40, color: '#DDE8F5' }} />
          <p style={{ fontSize: 14, color: '#A0B8D0', margin: 0 }}>Location not available</p>
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>Location is shared when your parent uses Sahara</p>
        </div>
      </div>
    )
  }

  // ── Map state ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, overflow: 'hidden', marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>Last Known Location</p>
        <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>Updates when parent has Sahara open</p>
      </div>

      {/* Map */}
      <div style={{ height: 220, borderRadius: '0 0 0 0' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
        >
          <Recenter lat={lat} lng={lng} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[lat, lng]} icon={elderIcon}>
            <Popup>
              <div style={{ fontFamily: 'Noto Sans, sans-serif', minWidth: 140 }}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px', color: '#0A2540' }}>
                  {elderName || 'Parent'}'s location
                </p>
                {address && (
                  <p style={{ fontSize: 11, color: '#5A7A9A', margin: '0 0 6px' }}>{address}</p>
                )}
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}
                >
                  Open in Maps →
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px' }}>
        {address && (
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 13, color: '#1D9E75' }} />
            {address}
          </p>
        )}
        <p style={{ fontSize: 11, color: '#A0B8D0', margin: '0 0 4px' }}>
          {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </p>
        <a
          href={mapsLink}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: '#185FA5', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <i className="ti ti-external-link" style={{ fontSize: 11 }} />
          Open in Google Maps →
        </a>
      </div>
    </div>
  )
}

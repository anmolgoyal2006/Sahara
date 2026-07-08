import { useEffect, useRef, useCallback, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Check interval: every 2 minutes
const CHECK_INTERVAL_MS = 2 * 60 * 1000

export function useGeofenceMonitor(elderId, hasZone) {
  const [currentStatus, setCurrentStatus] = useState(null) // null | 'inside' | 'outside'
  const [lastCheck, setLastCheck] = useState(null)
  const [zone, setZone] = useState(null)

  const intervalRef = useRef(null)
  const lastEventTypeRef = useRef(null)

  /* ─────────────────────────
     Single location check
  ───────────────────────── */
  const checkLocation = useCallback(async () => {
    if (!elderId || !hasZone) return

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          try {
            const res = await fetch(`${API_URL}/api/geofence/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ elder_id: elderId, lat, lng }),
            })
            const data = await res.json()

            if (data.success && data.hasZone) {
              setCurrentStatus(data.isInside ? 'inside' : 'outside')
              setLastCheck(new Date())
              setZone({
                centerLat: null,
                centerLng: null,
                radiusMeters: data.radiusMeters,
                label: data.zoneLabel,
              })

              // If alert needed, log and store for family polling
              if (data.shouldAlert) {
                console.log('Geofence alert:', data.eventType, data.alertMessage)
                lastEventTypeRef.current = data.eventType

                // Store alert in localStorage as belt-and-suspenders
                // alongside server-side events
                localStorage.setItem(
                  'sahara_geofence_alert',
                  JSON.stringify({
                    type: data.eventType,
                    message: data.alertMessage,
                    distance: data.distanceFormatted,
                    timestamp: new Date().toISOString(),
                  })
                )
              }
            }

            resolve(data)
          } catch (e) {
            console.error('Geofence check failed:', e)
            resolve(null)
          }
        },
        (err) => {
          console.error('GPS error:', err)
          resolve(null)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000, // Accept up to 1 min cached position
        }
      )
    })
  }, [elderId, hasZone])

  /* ─────────────────────────
     Start monitoring
  ───────────────────────── */
  useEffect(() => {
    if (!elderId || !hasZone) return
    if (!navigator.geolocation) {
      console.warn('Geofence: Geolocation not supported in this browser')
      return
    }

    // Initial check immediately
    checkLocation()

    // Then check every 2 minutes
    intervalRef.current = setInterval(checkLocation, CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [elderId, hasZone, checkLocation])

  return { currentStatus, lastCheck, zone, checkLocation }
}

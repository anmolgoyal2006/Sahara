import { useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Poll for new alerts every 30 seconds
const POLL_INTERVAL_MS = 30 * 1000

export function useGeofenceFamilyAlerts(familyUserId) {
  const lastAlertIdRef = useRef(null)
  const lastStatusRef = useRef(null)
  const intervalRef = useRef(null)

  const checkForAlerts = useCallback(async () => {
    if (!familyUserId) return

    try {
      const res = await fetch(
        `${API_URL}/api/geofence/family-alerts/${familyUserId}`
      )
      const data = await res.json()

      if (!data.success || !data.alerts?.length) return

      const latestAlert = data.alerts[0]

      // Only notify for new alerts
      if (latestAlert.id === lastAlertIdRef.current) return

      // Only care about left/returned events
      if (!['left', 'returned'].includes(latestAlert.event_type)) return

      // Don't re-notify if status hasn't changed
      if (latestAlert.event_type === lastStatusRef.current) return

      lastAlertIdRef.current = latestAlert.id
      lastStatusRef.current = latestAlert.event_type

      // Show browser notification
      if (Notification.permission === 'granted') {
        const isLeft = latestAlert.event_type === 'left'
        const title = isLeft
          ? '📍 Sahara — Safety Alert'
          : '✅ Sahara — Returned Home'
        const body = isLeft
          ? `Your parent has moved ${latestAlert.distance_from_center}m outside their safe zone. Tap to view their location.`
          : `Your parent has returned to their safe zone. They are home safely.`

        const notification = new Notification(title, {
          body,
          icon: '/favicon.svg',
          tag: `geofence-${latestAlert.id}`,
          requireInteraction: isLeft, // Stays until dismissed if elder left
        })

        notification.onclick = () => {
          window.focus()
          window.location.href = '/family/dashboard'
        }
      }
    } catch (e) {
      console.error('Family geofence poll error:', e)
    }
  }, [familyUserId])

  useEffect(() => {
    if (!familyUserId) return

    // Initial check immediately
    checkForAlerts()

    // Then poll every 30 seconds
    intervalRef.current = setInterval(checkForAlerts, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [familyUserId, checkForAlerts])

  return { checkForAlerts }
}

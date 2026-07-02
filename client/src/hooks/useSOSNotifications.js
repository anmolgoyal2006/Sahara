import { useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useSOSNotifications(familyUserId) {
  const lastAlertId = useRef(null)
  const intervalRef = useRef(null)

  // Poll for new SOS events every 30 seconds
  useEffect(() => {
    if (!familyUserId) return
    if (!('Notification' in window)) return

    const checkForAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sos/family-alerts/${familyUserId}`)
        const data = await res.json()
        if (!data.success || !data.alerts.length) return

        const latestAlert = data.alerts[0]

        // Only notify for new unresolved alerts
        if (
          latestAlert.id !== lastAlertId.current &&
          !latestAlert.resolved
        ) {
          lastAlertId.current = latestAlert.id

          if (Notification.permission === 'granted') {
            const notification = new Notification('🚨 Sahara — Emergency Alert', {
              body: 'Your family member needs help! Open Sahara now.',
              icon: '/favicon.svg',
              tag: `sos-${latestAlert.id}`,
              requireInteraction: true,
            })
            notification.onclick = () => {
              window.focus()
              window.location.href = '/family/dashboard'
            }
          }
        }
      } catch (e) {
        console.error('SOS polling error:', e)
      }
    }

    // Check immediately, then every 30 seconds
    checkForAlerts()
    intervalRef.current = setInterval(checkForAlerts, 30000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [familyUserId])

  // Manual trigger — call immediately after SOS is sent
  const notifyFamilyNow = useCallback((elderName, mapsLink) => {
    if (Notification.permission !== 'granted') return

    const body = mapsLink
      ? `${elderName} needs help! Tap to see their location.`
      : `${elderName} needs help! Open Sahara now.`

    const notification = new Notification('🚨 Sahara — Emergency Alert', {
      body,
      icon: '/favicon.svg',
      tag: `sos-immediate-${Date.now()}`,
      requireInteraction: true,
    })

    notification.onclick = () => {
      if (mapsLink) window.open(mapsLink, '_blank')
      window.focus()
      window.location.href = '/family/dashboard'
    }
  }, [])

  return { notifyFamilyNow }
}

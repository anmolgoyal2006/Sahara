import { useEffect, useRef } from 'react'

export function useMedicineNotifications(elderId, schedule) {
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    if (!elderId || !('Notification' in window)) return

    // Note: permission must be requested from a user gesture (button click).
    // The NotificationPermissionBanner in ElderHome handles that.
    // Here we only proceed if permission is already granted.

    const checkInterval = setInterval(() => {
      if (Notification.permission !== 'granted') return

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      schedule.forEach(dose => {
        const key = `${dose.medicine_id}_${dose.time}`
        if (
          dose.time === currentTime &&
          dose.status === 'pending' &&
          !notifiedRef.current.has(key)
        ) {
          notifiedRef.current.add(key)
          const notification = new Notification('Sahara — Medicine Time', {
            body: `Time for ${dose.name}${dose.dosage ? ` (${dose.dosage})` : ''}`,
            icon: '/favicon.svg',
            tag: key,
            requireInteraction: true,
          })
          notification.onclick = () => {
            window.focus()
            window.location.href = '/elder/medicines'
          }
        }
      })
    }, 30000) // check every 30 seconds

    return () => clearInterval(checkInterval)
  }, [elderId, schedule])
}

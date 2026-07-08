/**
 * useIncomingCall — polls every 15s for an incoming video call for the elder.
 * Used in ElderHome to surface the IncomingCallModal.
 */
import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useIncomingCall(elderId) {
  const [incomingCall, setIncomingCall] = useState(null)
  const lastCallId = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!elderId) return

    const checkForCall = async () => {
      try {
        const res = await fetch(`${API_URL}/api/videocall/active/${elderId}`)
        const data = await res.json()

        // New incoming call (waiting OR active) that we haven't seen yet
        if (
          data.hasActiveCall &&
          data.call?.id !== lastCallId.current &&
          (data.call?.status === 'waiting' || data.call?.status === 'active')
        ) {
          lastCallId.current = data.call.id
          setIncomingCall(data.call)

          // Browser notification (only when tab is not focused)
          if (Notification.permission === 'granted' && document.hidden) {
            try {
              const n = new Notification('📞 Incoming Video Call — Sahara', {
                body: 'Your family wants to video call you! Tap to answer.',
                icon: '/favicon.svg',
                tag: `call-${data.call.id}`,
                requireInteraction: true
              })
              n.onclick = () => {
                window.focus()
                n.close()
              }
            } catch (_) {
              // Notifications blocked or not supported — silent fail
            }
          }
        }

        // Call no longer waiting/active — clear the modal
        if (!data.hasActiveCall && lastCallId.current) {
          lastCallId.current = null
          setIncomingCall(null)
        }
      } catch (e) {
        console.error('Incoming call check error:', e)
      }
    }

    // Check immediately, then every 5s for fast notification
    checkForCall()
    intervalRef.current = setInterval(checkForCall, 5000)

    return () => clearInterval(intervalRef.current)
  }, [elderId])

  const dismissCall = () => {
    setIncomingCall(null)
    // Don't reset lastCallId — prevents the same call re-appearing if dismissed
  }

  return { incomingCall, dismissCall }
}

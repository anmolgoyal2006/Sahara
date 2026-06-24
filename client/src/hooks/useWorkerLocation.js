import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../lib/supabase'

export function useWorkerLocation(workerId, isAvailable) {
  const watchIdRef  = useRef(null)
  const intervalRef = useRef(null)
  const [denied, setDenied] = useState(false)

  async function updateLocation(lat, lng) {
    if (!workerId || !isAvailable) return
    try {
      await fetch(`${API_URL}/api/worker/location/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
    } catch {}
  }

  function handleError(err) {
    if (err.code === 1) {
      // Permission denied — stop trying, set denied flag
      setDenied(true)
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // code 2 = unavailable, code 3 = timeout — silently ignore
  }

  useEffect(() => {
    if (!workerId || !isAvailable || denied) return
    if (!navigator.geolocation) return

    const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }

    navigator.geolocation.getCurrentPosition(
      pos => updateLocation(pos.coords.latitude, pos.coords.longitude),
      handleError,
      opts
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => updateLocation(pos.coords.latitude, pos.coords.longitude),
      handleError,
      opts
    )

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => updateLocation(pos.coords.latitude, pos.coords.longitude),
        handleError
      )
    }, 5 * 60 * 1000)

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [workerId, isAvailable, denied]) // eslint-disable-line react-hooks/exhaustive-deps

  return { locationDenied: denied }
}

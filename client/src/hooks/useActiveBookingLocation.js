import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useActiveBookingLocation(userId, role) {
  const [booking, setBooking]           = useState(null)
  const [locationData, setLocationData] = useState(null)
  const [loading, setLoading]           = useState(true)
  const intervalRef                     = useRef(null)

  const fetchActiveBooking = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/booking/my-active/${userId}?role=${role}`)
      const data = await res.json()
      if (data.success && data.booking) {
        setBooking(data.booking)
        // Fetch location data for this booking
        const locRes  = await fetch(`${API_URL}/api/booking/active-location/${data.booking.id}`)
        const locData = await locRes.json()
        if (locData.success && locData.locationSharingActive) {
          setLocationData(locData)
        } else {
          setLocationData(null)
        }
      } else {
        setBooking(null)
        setLocationData(null)
      }
    } catch (e) {
      console.error('Active booking fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    fetchActiveBooking()
    // Poll every 30 seconds for location updates
    intervalRef.current = setInterval(fetchActiveBooking, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [userId, role])

  return {
    booking,
    locationData,
    loading,
    refresh: fetchActiveBooking,
  }
}

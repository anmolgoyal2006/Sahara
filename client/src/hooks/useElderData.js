import { useState, useEffect } from 'react'
import { supabase, API_URL } from '../lib/supabase'

export function useElderData() {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [healthLog, setHealthLog]     = useState(null)
  const [bookings, setBookings]       = useState([])
  const [medicines, setMedicines]     = useState([])
  const [nextMedicine, setNextMedicine] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          window.location.href = '/login'
          return
        }

        const userId = session.user.id
        const base = API_URL

        const [profileRes, healthRes, bookingsRes, medsRes] = await Promise.all([
          fetch(`${base}/api/elder/profile/${userId}`),
          fetch(`${base}/api/elder/health/today/${userId}`),
          fetch(`${base}/api/elder/bookings/upcoming/${userId}`),
          fetch(`${base}/api/elder/medicines/today/${userId}`),
        ])

        const [profileData, healthData, bookingsData, medsData] = await Promise.all([
          profileRes.json(),
          healthRes.json(),
          bookingsRes.json(),
          medsRes.json(),
        ])

        setUser(profileData.user || null)
        setProfile(profileData.profile || null)
        setHealthLog(healthData.log || null)
        setBookings(bookingsData.bookings || [])
        setMedicines(medsData.medicines || [])
        setNextMedicine(medsData.nextMedicine || null)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { user, profile, healthLog, bookings, medicines, nextMedicine, loading, error }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useElderContext() {
  const [context, setContext] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function build() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/login'; return }
        const uid = session.user.id
        setUserId(uid)

        const hour = new Date().getHours()
        const timeOfDay =
          hour >= 5 && hour < 12 ? 'morning'
          : hour >= 12 && hour < 17 ? 'afternoon'
          : hour >= 17 && hour < 21 ? 'evening'
          : 'night'

        const [profileRes, healthRes, bookingsRes, medsRes, alertsRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/elder/profile/${uid}`).then(r => r.json()),
          fetch(`${API_URL}/api/elder/health/today/${uid}`).then(r => r.json()),
          fetch(`${API_URL}/api/booking/history/${uid}?limit=3`).then(r => r.json()),
          fetch(`${API_URL}/api/elder/medicines/today/${uid}`).then(r => r.json()),
          fetch(`${API_URL}/api/health/alerts/${uid}`).then(r => r.json()),
        ])

        const profile  = profileRes.status  === 'fulfilled' ? profileRes.value  : {}
        const health   = healthRes.status   === 'fulfilled' ? healthRes.value   : {}
        const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value : {}
        const meds     = medsRes.status     === 'fulfilled' ? medsRes.value     : {}
        const alerts   = alertsRes.status   === 'fulfilled' ? alertsRes.value   : {}

        setContext({
          name:             profile.user?.name || 'Friend',
          age:              profile.profile?.age || null,
          language:         profile.user?.language || 'hi',
          conditions:       profile.profile?.conditions || [],
          lastHealthLog:    health.log || null,
          upcomingBookings: (bookings.bookings || []).filter(b =>
            b.status === 'pending' || b.status === 'confirmed'
          ),
          medicines:        meds.medicines || [],
          healthAlerts:     alerts.alerts || [],
          timeOfDay,
        })
      } catch (e) {
        console.error('Context build error:', e)
        setContext({ name: 'Friend', language: 'hi', timeOfDay: 'morning', conditions: [], medicines: [], upcomingBookings: [] })
      } finally {
        setLoading(false)
      }
    }
    build()
  }, [])

  return { context, userId, loading }
}

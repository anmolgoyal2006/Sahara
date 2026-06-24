const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
    const { data: profile } = await supabase.from('elder_profiles').select('*').eq('id', userId).single()
    return res.json({ success: true, user, profile: profile || {} })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/health/today/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('health_logs').select('*').eq('elder_id', userId).gte('logged_at', today.toISOString()).order('logged_at', { ascending: false }).limit(1)
    return res.json({ success: true, log: data?.[0] || null })
  } catch (e) {
    return res.status(500).json({ success: false, log: null })
  }
})

router.get('/bookings/upcoming/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const { data } = await supabase.from('bookings').select(`*, workers(id, skills, rating, photo_url, users(name, phone))`).eq('elder_id', userId).in('status', ['pending', 'confirmed']).gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(3)
    return res.json({ success: true, bookings: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, bookings: [] })
  }
})

router.get('/medicines/today/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const { data: medicines } = await supabase.from('medicines').select('*').eq('elder_id', userId).eq('is_active', true)
    const now = new Date()
    const cur = now.getHours() * 60 + now.getMinutes()
    let nextMedicine = null
    let minDiff = Infinity
    medicines?.forEach(med => {
      med.times?.forEach(time => {
        const [h, m] = time.split(':').map(Number)
        const diff = (h * 60 + m) - cur
        if (diff > 0 && diff < minDiff) {
          minDiff = diff
          nextMedicine = { ...med, nextTime: time, minutesUntil: diff }
        }
      })
    })
    return res.json({ success: true, medicines: medicines || [], nextMedicine })
  } catch (e) {
    return res.status(500).json({ success: false, medicines: [], nextMedicine: null })
  }
})

module.exports = router

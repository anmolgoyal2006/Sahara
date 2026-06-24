const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

// GET worker profile
router.get('/profile/:workerId', async (req, res) => {
  const { workerId } = req.params
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', workerId).single()
    const { data: worker } = await supabase.from('workers').select('*').eq('id', workerId).single()
    return res.json({ success: true, user, worker: worker || {} })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// PUT update worker profile
router.put('/profile/:workerId', async (req, res) => {
  const { workerId } = req.params
  const { skills, languages, experience_years, aadhaar_number, photo_url, available } = req.body
  try {
    const { error } = await supabase.from('workers').update({
      skills, languages, experience_years, aadhaar_number, photo_url, available
    }).eq('id', workerId)
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// PUT update worker location
router.put('/location/:workerId', async (req, res) => {
  const { workerId } = req.params
  const { lat, lng } = req.body
  try {
    const { error } = await supabase.from('workers').update({ lat, lng }).eq('id', workerId)
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET worker's assigned bookings
router.get('/bookings/:workerId', async (req, res) => {
  const { workerId } = req.params
  try {
    const { data } = await supabase.from('bookings')
      .select(`*, users!bookings_elder_id_fkey (name, phone)`)
      .eq('worker_id', workerId)
      .order('scheduled_at', { ascending: true })
    return res.json({ success: true, bookings: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, bookings: [] })
  }
})

// GET available bookings (no worker assigned yet)
router.get('/available-bookings/:workerId', async (req, res) => {
  const { workerId } = req.params
  try {
    const { data } = await supabase.from('bookings')
      .select(`*, users!bookings_elder_id_fkey (name, phone)`)
      .is('worker_id', null)
      .eq('status', 'pending')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20)
    return res.json({ success: true, bookings: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, bookings: [] })
  }
})

// PUT accept a booking
router.put('/accept-booking/:bookingId', async (req, res) => {
  const { bookingId } = req.params
  const { workerId } = req.body
  try {
    const { error } = await supabase.from('bookings')
      .update({ worker_id: workerId, status: 'confirmed' })
      .eq('id', bookingId)
      .is('worker_id', null)
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// PUT complete a booking
router.put('/complete-booking/:bookingId', async (req, res) => {
  const { bookingId } = req.params
  const { workerId } = req.body
  try {
    const { error } = await supabase.from('bookings')
      .update({ status: 'done' })
      .eq('id', bookingId)
      .eq('worker_id', workerId)
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET find workers near elder
router.get('/nearby', async (req, res) => {
  const { lat, lng, skill, language, radius = 10000 } = req.query
  try {
    let query = supabase.from('workers')
      .select(`id, skills, languages, rating, photo_url, lat, lng, available, verified, experience_years, users ( name, phone )`)
      .eq('verified', true)
      .eq('available', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (skill) query = query.contains('skills', [skill])
    if (language) query = query.contains('languages', [language])

    const { data: workers, error } = await query
    if (error) throw error

    const workerLat = parseFloat(lat)
    const workerLng = parseFloat(lng)

    const nearby = workers.map(w => {
      const dLat = (w.lat - workerLat) * Math.PI / 180
      const dLng = (w.lng - workerLng) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(workerLat * Math.PI / 180) * Math.cos(w.lat * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2)
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return { ...w, distance_meters: Math.round(distance) }
    }).filter(w => w.distance_meters <= parseInt(radius))
      .sort((a, b) => a.distance_meters - b.distance_meters)

    return res.json({ success: true, workers: nearby })
  } catch (e) {
    return res.status(500).json({ success: false, workers: [] })
  }
})

module.exports = router

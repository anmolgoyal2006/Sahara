const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   Helper: build Google Maps link
───────────────────────────────────── */
function buildMapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/* ─────────────────────────────────────
   Helper: Haversine distance (metres)
───────────────────────────────────── */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ─────────────────────────────────────
   POST /api/sos/trigger
   Create a new SOS event
───────────────────────────────────── */
router.post('/trigger', async (req, res) => {
  const { elder_id, lat, lng, address_text } = req.body

  if (!elder_id) {
    return res.status(400).json({ success: false, error: 'elder_id is required' })
  }

  try {
    const mapsLink = lat && lng ? buildMapsLink(lat, lng) : null

    // ── Step 1: INSERT with only the guaranteed base columns ─────────────────
    // The Phase 8A migration adds maps_link, address_text, notified_family,
    // notified_worker, resolved_at, resolved_by, notes. If it hasn't been run
    // yet the insert would fail. We use only the original schema columns here,
    // then attempt the extra fields in a best-effort UPDATE below.
    const { data: sosEvent, error: sosError } = await supabase
      .from('sos_events')
      .insert({
        elder_id,
        lat: lat || null,
        lng: lng || null,
        resolved: false,
      })
      .select()
      .single()

    if (sosError) throw sosError

    // ── Step 2: Best-effort UPDATE with Phase 8A columns ────────────────────
    // Silently ignored if the columns don't exist yet.
    try {
      await supabase
        .from('sos_events')
        .update({
          address_text: address_text || null,
          maps_link: mapsLink,
        })
        .eq('id', sosEvent.id)
    } catch { /* migration not run yet — safe to ignore */ }

    // ── Step 3: Elder name ───────────────────────────────────────────────────
    const { data: elderUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', elder_id)
      .single()

    // ── Step 4: Family members ───────────────────────────────────────────────
    const { data: familyMembers } = await supabase
      .from('users')
      .select('id, name')
      .eq('elder_id', elder_id)
      .eq('role', 'family')

    // ── Step 5: Nearest available verified worker ────────────────────────────
    let nearestWorker = null
    if (lat && lng) {
      const { data: workers } = await supabase
        .from('workers')
        .select(`id, lat, lng, users ( name, phone )`)
        .eq('available', true)
        .eq('verified', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (workers && workers.length > 0) {
        let minDist = Infinity
        workers.forEach(w => {
          const dist = haversineDistance(lat, lng, w.lat, w.lng)
          if (dist < minDist) {
            minDist = dist
            nearestWorker = {
              id: w.id,
              name: w.users?.name,
              phone: w.users?.phone,
              distanceKm: (dist / 1000).toFixed(1),
            }
          }
        })
      }
    }

    // ── Step 6: Best-effort UPDATE with notification flags ───────────────────
    try {
      await supabase
        .from('sos_events')
        .update({
          notified_family: (familyMembers?.length || 0) > 0,
          notified_worker: !!nearestWorker,
        })
        .eq('id', sosEvent.id)
    } catch { /* migration not run yet — safe to ignore */ }

    return res.json({
      success: true,
      sos: sosEvent,
      elderName: elderUser?.name,
      familyMembers: familyMembers || [],
      nearestWorker,
      mapsLink,
    })
  } catch (e) {
    console.error('SOS trigger error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   PUT /api/sos/resolve/:sosId
   Resolve an active SOS event
───────────────────────────────────── */
router.put('/resolve/:sosId', async (req, res) => {
  const { sosId } = req.params
  const { resolved_by, notes } = req.body

  try {
    // Try full update with Phase 8A columns first
    let data, error
    const full = await supabase
      .from('sos_events')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolved_by || 'elder',
        notes: notes || null,
      })
      .eq('id', sosId)
      .select()
      .single()

    if (full.error && full.error.message?.includes('column')) {
      // Fall back to just marking resolved
      const minimal = await supabase
        .from('sos_events')
        .update({ resolved: true })
        .eq('id', sosId)
        .select()
        .single()
      data = minimal.data
      error = minimal.error
    } else {
      data = full.data
      error = full.error
    }

    if (error) throw error
    return res.json({ success: true, sos: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/sos/history/:elderId
───────────────────────────────────── */
router.get('/history/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { limit = 20 } = req.query

  try {
    const { data, error } = await supabase
      .from('sos_events')
      .select('*')
      .eq('elder_id', elderId)
      .order('triggered_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error
    return res.json({ success: true, events: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, events: [] })
  }
})

/* ─────────────────────────────────────
   GET /api/sos/active/:elderId
───────────────────────────────────── */
router.get('/active/:elderId', async (req, res) => {
  const { elderId } = req.params

  try {
    const { data, error } = await supabase
      .from('sos_events')
      .select('*')
      .eq('elder_id', elderId)
      .eq('resolved', false)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return res.json({ success: true, active: !!data, sos: data || null })
  } catch (e) {
    return res.json({ success: true, active: false, sos: null })
  }
})

/* ─────────────────────────────────────
   GET /api/sos/family-alerts/:familyUserId
───────────────────────────────────── */
router.get('/family-alerts/:familyUserId', async (req, res) => {
  const { familyUserId } = req.params

  try {
    const { data: familyUser } = await supabase
      .from('users')
      .select('elder_id')
      .eq('id', familyUserId)
      .single()

    if (!familyUser?.elder_id) {
      return res.json({ success: true, alerts: [] })
    }

    const { data, error } = await supabase
      .from('sos_events')
      .select('*')
      .eq('elder_id', familyUser.elder_id)
      .order('triggered_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return res.json({ success: true, alerts: data || [] })
  } catch (e) {
    return res.json({ success: true, alerts: [] })
  }
})

module.exports = router

const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { fastModel } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   Helper: Haversine distance in meters
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
   Helper: Human readable distance
───────────────────────────────────── */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} meters`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/* ─────────────────────────────────────
   POST /api/geofence/zone
   Create or update elder's safe zone
───────────────────────────────────── */
router.post('/zone', async (req, res) => {
  const {
    elder_id, center_lat, center_lng,
    radius_meters, label
  } = req.body

  if (!elder_id || !center_lat || !center_lng) {
    return res.status(400).json({
      success: false,
      error: 'elder_id, center_lat, center_lng required'
    })
  }

  try {
    const { data, error } = await supabase
      .from('geofence_zones')
      .upsert({
        elder_id,
        center_lat,
        center_lng,
        radius_meters: radius_meters || 500,
        label: label || 'Home',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'elder_id'
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, zone: data })
  } catch (e) {
    console.error('Zone create error:', e)
    return res.status(500).json({
      success: false,
      error: e.message
    })
  }
})

/* ─────────────────────────────────────
   GET /api/geofence/zone/:elderId
   Get elder's current safe zone
───────────────────────────────────── */
router.get('/zone/:elderId', async (req, res) => {
  const { elderId } = req.params

  try {
    const { data, error } = await supabase
      .from('geofence_zones')
      .select('*')
      .eq('elder_id', elderId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return res.json({
      success: true,
      zone: data || null,
      hasZone: !!data
    })
  } catch (e) {
    return res.json({
      success: true,
      zone: null,
      hasZone: false
    })
  }
})

/* ─────────────────────────────────────
   PUT /api/geofence/zone/:elderId/toggle
   Enable or disable geofence
───────────────────────────────────── */
router.put('/zone/:elderId/toggle', async (req, res) => {
  const { elderId } = req.params
  const { is_active } = req.body

  try {
    const { data, error } = await supabase
      .from('geofence_zones')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('elder_id', elderId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, zone: data })
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    })
  }
})

/* ─────────────────────────────────────
   POST /api/geofence/check
   Check if elder is inside safe zone.
   Called every 2 minutes from elder's device.
───────────────────────────────────── */
router.post('/check', async (req, res) => {
  const { elder_id, lat, lng } = req.body

  if (!elder_id || !lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'elder_id, lat, lng required'
    })
  }

  try {
    // Get elder's active safe zone
    const { data: zone } = await supabase
      .from('geofence_zones')
      .select('*')
      .eq('elder_id', elder_id)
      .eq('is_active', true)
      .single()

    if (!zone) {
      return res.json({
        success: true,
        hasZone: false,
        isInside: null,
        message: 'No active geofence zone set'
      })
    }

    // Calculate distance from zone center
    const distance = haversineDistance(
      zone.center_lat, zone.center_lng, lat, lng
    )
    const isInside = distance <= zone.radius_meters

    // Check last event to avoid duplicate alerts
    const { data: lastEvent } = await supabase
      .from('geofence_events')
      .select('event_type, triggered_at')
      .eq('elder_id', elder_id)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single()

    const lastEventType = lastEvent?.event_type || 'check'

    let shouldAlert = false
    let eventType = 'check'

    if (!isInside && lastEventType !== 'left') {
      // Elder just left the safe zone
      shouldAlert = true
      eventType = 'left'
    } else if (isInside && lastEventType === 'left') {
      // Elder returned to safe zone
      shouldAlert = true
      eventType = 'returned'
    } else {
      eventType = isInside ? 'check' : 'left'
    }

    // Update elder location in elder_profiles
    await supabase
      .from('elder_profiles')
      .update({ lat, lng })
      .eq('id', elder_id)

    // Log the geofence check/event
    const { data: event } = await supabase
      .from('geofence_events')
      .insert({
        elder_id,
        event_type: eventType,
        elder_lat: lat,
        elder_lng: lng,
        distance_from_center: Math.round(distance),
        radius_meters: zone.radius_meters,
        zone_label: zone.label
      })
      .select()
      .single()

    // If alert needed, generate AI context message
    let alertMessage = null
    let elderName = null

    if (shouldAlert) {
      const { data: elderUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', elder_id)
        .single()

      elderName = elderUser?.name || null

      try {
        const prompt = eventType === 'left'
          ? `Generate a brief, calm safety alert message for a family member whose elderly parent named ${elderUser?.name || 'your parent'} has moved ${formatDistance(distance)} away from their home (safe zone radius: ${formatDistance(zone.radius_meters)}). Write 1-2 sentences only. Be informative but not alarming. This may be intentional — they could be visiting a shop or taking a walk. Suggest checking in with them. No formatting, no bullet points.`
          : `Generate a brief reassuring message for a family member that their elderly parent named ${elderUser?.name || 'your parent'} has returned to their home safe zone after being outside. Write 1 sentence only. Be warm and reassuring. No formatting.`

        const result = await fastModel.generateContent(prompt)
        alertMessage = result.response.text().trim()
      } catch (geminiErr) {
        console.error('Gemini alert message failed:', geminiErr)
        alertMessage = eventType === 'left'
          ? `${elderUser?.name || 'Your parent'} has moved outside their safe zone. They are ${formatDistance(distance)} from home.`
          : `${elderUser?.name || 'Your parent'} has returned home safely.`
      }
    }

    return res.json({
      success: true,
      hasZone: true,
      isInside,
      distance: Math.round(distance),
      distanceFormatted: formatDistance(distance),
      radiusMeters: zone.radius_meters,
      zoneLabel: zone.label,
      shouldAlert,
      eventType,
      event,
      alertMessage,
      elderName
    })
  } catch (e) {
    console.error('Geofence check error:', e)
    return res.status(500).json({
      success: false,
      error: e.message
    })
  }
})

/* ─────────────────────────────────────
   GET /api/geofence/events/:elderId
   Get geofence event history
───────────────────────────────────── */
router.get('/events/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { limit = 50, type } = req.query

  try {
    let query = supabase
      .from('geofence_events')
      .select('*')
      .eq('elder_id', elderId)
      .order('triggered_at', { ascending: false })
      .limit(parseInt(limit))

    // Only return alert events (left/returned), not routine checks
    if (type === 'alerts') {
      query = query.in('event_type', ['left', 'returned'])
    }

    const { data, error } = await query
    if (error) throw error

    return res.json({ success: true, events: data || [] })
  } catch (e) {
    return res.status(500).json({
      success: false,
      events: []
    })
  }
})

/* ─────────────────────────────────────
   GET /api/geofence/family-alerts/:familyUserId
   Get geofence alerts for family dashboard
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
      return res.json({ success: true, alerts: [], zone: null })
    }

    const elderId = familyUser.elder_id

    // Get zone info
    const { data: zone } = await supabase
      .from('geofence_zones')
      .select('*')
      .eq('elder_id', elderId)
      .single()

    // Get recent alert events only
    const { data: alerts } = await supabase
      .from('geofence_events')
      .select('*')
      .eq('elder_id', elderId)
      .in('event_type', ['left', 'returned'])
      .order('triggered_at', { ascending: false })
      .limit(20)

    // Check current status
    const lastEvent = alerts?.[0]
    const currentStatus = lastEvent?.event_type || 'unknown'

    return res.json({
      success: true,
      alerts: alerts || [],
      zone,
      currentStatus,
      isOutside: currentStatus === 'left'
    })
  } catch (e) {
    return res.json({
      success: true,
      alerts: [],
      zone: null,
      currentStatus: 'unknown',
      isOutside: false
    })
  }
})

/* ─────────────────────────────────────
   PUT /api/geofence/acknowledge/:eventId
   Family acknowledges an alert
───────────────────────────────────── */
router.put('/acknowledge/:eventId', async (req, res) => {
  const { eventId } = req.params

  try {
    const { data, error } = await supabase
      .from('geofence_events')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, event: data })
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    })
  }
})

module.exports = router

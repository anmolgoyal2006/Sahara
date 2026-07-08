/**
 * videocall.js — Phase 12 (Jitsi Meet backend)
 *
 * Jitsi Meet is free, no API key, no credit card.
 * We generate a unique room name, save the call record to Supabase,
 * and return the Jitsi URL. Both participants open the same URL.
 */
const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const JITSI_BASE = 'https://meet.jit.si'

/* ─────────────────────────────────────
   Helper: Generate unique room name
───────────────────────────────────── */
function generateRoomName(elderId) {
  const timestamp = Date.now()
  const shortId = elderId.replace(/-/g, '').substring(0, 8)
  return `Sahara-${shortId}-${timestamp}`
}

/* ─────────────────────────────────────
   POST /api/videocall/create
   Create a Jitsi room and save to Supabase
───────────────────────────────────── */
router.post('/create', async (req, res) => {
  const { created_by, elder_id, family_id } = req.body

  if (!created_by || !elder_id) {
    return res.status(400).json({
      success: false,
      error: 'created_by and elder_id are required'
    })
  }

  try {
    const roomName = generateRoomName(elder_id)
    const roomUrl = `${JITSI_BASE}/${roomName}`

    // Save to Supabase
    const { data: callRecord, error } = await supabase
      .from('video_calls')
      .insert({
        room_name: roomName,
        room_url: roomUrl,
        created_by,
        elder_id,
        family_id: family_id || null,
        status: 'waiting'
      })
      .select()
      .single()

    if (error) throw error

    return res.json({
      success: true,
      call: callRecord,
      roomUrl,
      roomName
    })
  } catch (e) {
    console.error('Create video call error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   PUT /api/videocall/start/:callId
   Mark call as active
───────────────────────────────────── */
router.put('/start/:callId', async (req, res) => {
  const { callId } = req.params
  try {
    const { data, error } = await supabase
      .from('video_calls')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', callId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, call: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   PUT /api/videocall/end/:callId
   End a call and record duration
───────────────────────────────────── */
router.put('/end/:callId', async (req, res) => {
  const { callId } = req.params
  const { duration_seconds } = req.body

  try {
    const { data: call } = await supabase
      .from('video_calls')
      .select('started_at')
      .eq('id', callId)
      .single()

    const endTime = new Date()
    const duration = duration_seconds || (
      call?.started_at
        ? Math.floor((endTime - new Date(call.started_at)) / 1000)
        : 0
    )

    const { data, error } = await supabase
      .from('video_calls')
      .update({
        status: 'ended',
        ended_at: endTime.toISOString(),
        duration_seconds: duration
      })
      .eq('id', callId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, call: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/videocall/active/:elderId
   Check if elder has a waiting/active call
───────────────────────────────────── */
router.get('/active/:elderId', async (req, res) => {
  const { elderId } = req.params
  try {
    const { data } = await supabase
      .from('video_calls')
      .select('*')
      .eq('elder_id', elderId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return res.json({
      success: true,
      hasActiveCall: !!data,
      call: data || null
    })
  } catch (e) {
    return res.json({ success: true, hasActiveCall: false, call: null })
  }
})

/* ─────────────────────────────────────
   GET /api/videocall/history/:userId
   Get call history for elder or family
───────────────────────────────────── */
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params
  const { role } = req.query

  try {
    let query = supabase
      .from('video_calls')
      .select(`
        *,
        elder:users!video_calls_elder_id_fkey (name),
        family:users!video_calls_family_id_fkey (name)
      `)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(20)

    if (role === 'family') {
      query = query.eq('family_id', userId)
    } else {
      query = query.eq('elder_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return res.json({ success: true, calls: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, calls: [] })
  }
})

/* ─────────────────────────────────────
   POST /api/videocall/token
   No-op for Jitsi (no tokens needed)
   Kept for API compatibility
───────────────────────────────────── */
router.post('/token', async (req, res) => {
  return res.json({ success: true, token: null })
})

module.exports = router

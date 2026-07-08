const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const DAILY_API_KEY = process.env.DAILY_API_KEY
const DAILY_API_URL = 'https://api.daily.co/v1'

/* ─────────────────────────────────────
   Helper: Call Daily.co API
───────────────────────────────────── */
async function dailyAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${DAILY_API_URL}${endpoint}`, options)
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Daily.co API error: ${error}`)
  }
  return res.json()
}

/* ─────────────────────────────────────
   Helper: Generate unique room name
───────────────────────────────────── */
function generateRoomName(elderId) {
  const timestamp = Date.now()
  const shortId = elderId.replace(/-/g, '').substring(0, 8)
  return `sahara-${shortId}-${timestamp}`
}

/* ─────────────────────────────────────
   POST /api/videocall/create
   Create a new Daily.co room and save
   to Supabase
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

    // Create room on Daily.co — expires after 2 hours automatically
    const expiryTime = Math.floor(Date.now() / 1000) + (2 * 60 * 60)

    const room = await dailyAPI('/rooms', 'POST', {
      name: roomName,
      privacy: 'private',
      properties: {
        exp: expiryTime,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_recording: 'none',
        start_video_off: false,
        start_audio_off: false,
        // Mobile-friendly settings
        enable_prejoin_ui: false,
        lang: 'en'
      }
    })

    // Save to Supabase
    const { data: callRecord, error } = await supabase
      .from('video_calls')
      .insert({
        room_name: roomName,
        room_url: room.url,
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
      roomUrl: room.url,
      roomName
    })
  } catch (e) {
    console.error('Create video call error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   PUT /api/videocall/start/:callId
   Mark call as active when both join
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
      .select('room_name, started_at')
      .eq('id', callId)
      .single()

    const endTime = new Date()
    const duration = duration_seconds || (
      call?.started_at
        ? Math.floor((endTime - new Date(call.started_at)) / 1000)
        : 0
    )

    // Delete room on Daily.co to free up resources
    try {
      await dailyAPI(`/rooms/${call?.room_name}`, 'DELETE')
    } catch (deleteErr) {
      // Non-critical — room will expire anyway
      console.error('Room delete failed:', deleteErr)
    }

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
   Check if elder has an active/waiting
   call (for notification polling)
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
    // .single() throws when no rows found — that's fine
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
   Generate a meeting token for a
   specific participant (more secure
   than using the room URL directly)
───────────────────────────────────── */
router.post('/token', async (req, res) => {
  const { room_name, user_name, is_owner } = req.body

  if (!room_name || !user_name) {
    return res.status(400).json({
      success: false,
      error: 'room_name and user_name required'
    })
  }

  try {
    const expiryTime = Math.floor(Date.now() / 1000) + (2 * 60 * 60)

    const token = await dailyAPI('/meeting-tokens', 'POST', {
      properties: {
        room_name,
        user_name,
        is_owner: is_owner || false,
        exp: expiryTime,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false
      }
    })

    return res.json({ success: true, token: token.token })
  } catch (e) {
    console.error('Token creation error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router

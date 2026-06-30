const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { model } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   POST /api/booking/parse
   Parse natural language booking request using Gemini AI
───────────────────────────────────── */
router.post('/parse', async (req, res) => {
  const { request, language = 'hi' } = req.body

  if (!request || request.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'Request too short' })
  }

  try {
    const systemPrompt = `You are a booking assistant for an elderly 
care platform in India called Sahara. 
Extract structured booking information from natural language 
requests in Hindi or English.

Return ONLY a valid JSON object with exactly these fields, 
no markdown, no explanation, just raw JSON:
{
  "service_type": "maid" | "nurse" | "driver" | "cook" | "physiotherapist" | "repair",
  "date": "today" | "tomorrow" | "YYYY-MM-DD",
  "time": "morning" | "afternoon" | "evening" | "HH:MM",
  "duration_hours": number between 1 and 8,
  "special_requirements": string or null,
  "language_preference": "Hindi" | "English" | "Punjabi" | null,
  "urgency": "normal" | "urgent",
  "confidence": number between 0 and 1
}

Rules:
- service_type is required. Map these Hindi words:
  khaana/cook/chef → cook
  nurse/nursing → nurse
  driver/car/hospital → driver
  maid/safaai/cleaning → maid
  physiotherapy/exercise → physiotherapist
  repair/electrician/plumber → repair
- If date not mentioned, assume tomorrow
- If time not mentioned, assume morning
- If duration not mentioned, assume 2 hours
- confidence: how certain you are about service_type
- Never add explanation, only return the JSON object

User request: "${request}"`

    let raw
    try {
      const result = await model.generateContent(systemPrompt)
      raw = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini parse error:', geminiErr)
      if (geminiErr.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Sahara is busy right now. Please wait a moment and try again.'
        })
      }
      throw geminiErr
    }
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Convert relative dates to actual dates (IST-safe, no toISOString/UTC)
    function resolveDateIST(rel) {
      const istOffset = 5.5 * 60 * 60 * 1000
      const now = new Date(Date.now() + istOffset)
      const y = now.getUTCFullYear()
      const m = String(now.getUTCMonth() + 1).padStart(2, '0')
      const d = String(now.getUTCDate()).padStart(2, '0')
      if (rel === 'today') return `${y}-${m}-${d}`
      const t = new Date(now)
      t.setUTCDate(t.getUTCDate() + 1)
      return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')}`
    }

    if (parsed.date === 'today' || parsed.date === 'tomorrow') {
      parsed.date = resolveDateIST(parsed.date)
    }

    // Convert time descriptions to actual times
    const timeMap = { morning: '09:00', afternoon: '14:00', evening: '18:00', night: '20:00' }
    if (timeMap[parsed.time]) {
      parsed.time = timeMap[parsed.time]
    }

    // Build scheduled_at timestamp
    parsed.scheduled_at = `${parsed.date}T${parsed.time}:00`

    return res.json({ success: true, parsed })
  } catch (e) {
    console.error('Gemini parse error:', e)
    return res.status(500).json({
      success: false,
      error: 'Could not understand your request. Please try again.'
    })
  }
})

/* ─────────────────────────────────────
   POST /api/booking/create
   Create a new booking in Supabase
───────────────────────────────────── */
router.post('/create', async (req, res) => {
  const { elder_id, worker_id, service_type, scheduled_at, duration_hours, notes, ai_parsed_request } = req.body

  if (!elder_id || !service_type || !scheduled_at) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        elder_id,
        worker_id: worker_id || null,
        service_type,
        scheduled_at,
        duration_hours: duration_hours || 2,
        notes: notes || null,
        ai_parsed_request: ai_parsed_request || null,
        status: worker_id ? 'confirmed' : 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, booking: data })
  } catch (e) {
    console.error('Create booking error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/booking/history/:elderId
   Get all bookings for an elder
───────────────────────────────────── */
router.get('/history/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { status, limit = 20 } = req.query

  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        workers (
          id,
          rating,
          photo_url,
          users ( name, phone )
        )
      `)
      .eq('elder_id', elderId)
      .order('scheduled_at', { ascending: false })
      .limit(parseInt(limit))

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return res.json({ success: true, bookings: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, bookings: [] })
  }
})

/* ─────────────────────────────────────
   PUT /api/booking/cancel/:bookingId
   Cancel a booking
───────────────────────────────────── */
router.put('/cancel/:bookingId', async (req, res) => {
  const { bookingId } = req.params
  const { elder_id } = req.body

  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('elder_id', elder_id)
      .in('status', ['pending', 'confirmed'])

    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   POST /api/booking/rate
   Rate a completed booking
───────────────────────────────────── */
router.post('/rate', async (req, res) => {
  const { booking_id, worker_id, rating, review } = req.body

  if (!booking_id || !worker_id || !rating) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  try {
    // Get current worker rating
    const { data: worker } = await supabase
      .from('workers')
      .select('rating, total_ratings')
      .eq('id', worker_id)
      .single()

    // Calculate new average rating
    const totalRatings = (worker?.total_ratings || 0) + 1
    const currentTotal = (worker?.rating || 0) * (worker?.total_ratings || 0)
    const newRating = (currentTotal + rating) / totalRatings

    // Update worker rating
    await supabase
      .from('workers')
      .update({ rating: parseFloat(newRating.toFixed(1)), total_ratings: totalRatings })
      .eq('id', worker_id)

    // Update booking with rating
    await supabase
      .from('bookings')
      .update({ rating, review: review || null })
      .eq('id', booking_id)

    return res.json({ success: true, new_rating: newRating })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router

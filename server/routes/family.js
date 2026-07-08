const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { fastModel } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   Helper: IST-safe today date string
───────────────────────────────────── */
function todayIST() {
  const istOffset = 5.5 * 60 * 60 * 1000
  const now = new Date(Date.now() + istOffset)
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ─────────────────────────────────────
   GET /api/family/elder-overview/:familyUserId
   Get complete elder data for family dashboard
   in one API call
───────────────────────────────────── */
router.get('/elder-overview/:familyUserId', async (req, res) => {
  const { familyUserId } = req.params

  try {
    // Get family member's linked elder
    const { data: familyUser } = await supabase
      .from('users')
      .select('elder_id, name')
      .eq('id', familyUserId)
      .single()

    if (!familyUser?.elder_id) {
      return res.json({ success: true, linked: false, elder: null })
    }

    const elderId = familyUser.elder_id
    const today   = todayIST()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch everything in parallel
    const [
      elderUserRes,
      elderProfileRes,
      healthRes,
      bookingsRes,
      medicinesRes,
      medLogsRes,
      sosRes,
    ] = await Promise.allSettled([
      // Elder basic info
      supabase
        .from('users')
        .select('id, name, language, created_at')
        .eq('id', elderId)
        .single(),

      // Elder profile
      supabase
        .from('elder_profiles')
        .select('age, conditions, lat, lng, address')
        .eq('id', elderId)
        .single(),

      // Last 7 days health logs
      supabase
        .from('health_logs')
        .select('*')
        .eq('elder_id', elderId)
        .gte('logged_at', sevenDaysAgo)
        .order('logged_at', { ascending: false })
        .limit(7),

      // Upcoming bookings with worker info
      supabase
        .from('bookings')
        .select(`
          *,
          workers (
            id, rating, photo_url,
            users ( name, phone )
          )
        `)
        .eq('elder_id', elderId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),

      // Active medicines
      supabase
        .from('medicines')
        .select('*')
        .eq('elder_id', elderId)
        .eq('is_active', true),

      // Today's medicine logs
      supabase
        .from('medicine_logs')
        .select('*')
        .eq('elder_id', elderId)
        .eq('scheduled_date', today),

      // Recent SOS events
      supabase
        .from('sos_events')
        .select('*')
        .eq('elder_id', elderId)
        .order('triggered_at', { ascending: false })
        .limit(5),
    ])

    // Extract results safely
    const elderUser    = elderUserRes.status    === 'fulfilled' ? elderUserRes.value.data    : null
    const elderProfile = elderProfileRes.status === 'fulfilled' ? elderProfileRes.value.data : null
    const healthLogs   = healthRes.status       === 'fulfilled' ? healthRes.value.data    || [] : []
    const bookings     = bookingsRes.status     === 'fulfilled' ? bookingsRes.value.data  || [] : []
    const medicines    = medicinesRes.status    === 'fulfilled' ? medicinesRes.value.data || [] : []
    const medLogs      = medLogsRes.status      === 'fulfilled' ? medLogsRes.value.data   || [] : []
    const sosEvents    = sosRes.status          === 'fulfilled' ? sosRes.value.data       || [] : []

    // Medicine compliance today
    const totalDoses = medLogs.length
    const takenDoses = medLogs.filter(l => l.status === 'taken').length
    const medicineCompliance = totalDoses > 0
      ? Math.round((takenDoses / totalDoses) * 100)
      : null

    // Active SOS
    const activeSOS = sosEvents.find(s => !s.resolved) || null

    return res.json({
      success: true,
      linked: true,
      elder: {
        id:         elderId,
        name:       elderUser?.name,
        language:   elderUser?.language,
        age:        elderProfile?.age,
        conditions: elderProfile?.conditions || [],
        lat:        elderProfile?.lat,
        lng:        elderProfile?.lng,
        address:    elderProfile?.address,
      },
      todayHealth:         healthLogs[0] || null,
      healthLogs,
      bookings,
      medicines,
      medLogs,
      medicineCompliance,
      sosEvents,
      activeSOS,
    })
  } catch (e) {
    console.error('Family overview error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/family/daily-summary/:familyUserId
   AI-generated daily summary of elder status
───────────────────────────────────── */
router.get('/daily-summary/:familyUserId', async (req, res) => {
  const { familyUserId } = req.params

  try {
    const { data: familyUser } = await supabase
      .from('users')
      .select('elder_id')
      .eq('id', familyUserId)
      .single()

    if (!familyUser?.elder_id) {
      return res.json({ success: false, error: 'No elder linked' })
    }

    const elderId   = familyUser.elder_id
    const today     = todayIST()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [elderRes, healthRes, medsRes, bookRes] = await Promise.allSettled([
      supabase
        .from('users')
        .select('name')
        .eq('id', elderId)
        .single(),

      supabase
        .from('health_logs')
        .select('*')
        .eq('elder_id', elderId)
        .gte('logged_at', yesterday)
        .order('logged_at', { ascending: false })
        .limit(1),

      supabase
        .from('medicine_logs')
        .select('*, medicines(name)')
        .eq('elder_id', elderId)
        .eq('scheduled_date', today),

      supabase
        .from('bookings')
        .select('service_type, scheduled_at, status')
        .eq('elder_id', elderId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1),
    ])

    const elderName   = elderRes.status   === 'fulfilled' ? elderRes.value.data?.name   : 'your parent'
    const todayLog    = healthRes.status  === 'fulfilled' ? healthRes.value.data?.[0]   : null
    const medLogs     = medsRes.status    === 'fulfilled' ? medsRes.value.data || []    : []
    const nextBooking = bookRes.status    === 'fulfilled' ? bookRes.value.data?.[0]     : null

    const totalMeds = medLogs.length
    const takenMeds = medLogs.filter(l => l.status === 'taken').length

    const healthText = todayLog
      ? `Today's health: BP ${todayLog.bp_systolic || '-'}/${todayLog.bp_diastolic || '-'}, Sugar ${todayLog.sugar_level || '-'} mg/dL, Mood: ${todayLog.mood || 'not recorded'}.`
      : 'No health data logged today.'

    const medicineText = totalMeds > 0
      ? `Medicine compliance: ${takenMeds} of ${totalMeds} doses taken today.`
      : 'No medicines scheduled today.'

    const bookingText = nextBooking
      ? `Upcoming booking: ${nextBooking.service_type} on ${new Date(nextBooking.scheduled_at).toLocaleDateString('en-IN')}.`
      : 'No upcoming bookings.'

    const summaryPrompt = `You are a caring assistant helping a family member in India stay informed about their elderly parent named ${elderName}. Write a warm, brief 2-3 sentence summary of how ${elderName} is doing today based on this data:
${healthText}
${medicineText}
${bookingText}
Be reassuring if things look normal. Gently flag if something seems concerning (missed medicines, high readings). Keep it simple, warm, and human — like a message from a caring nurse. No bullet points, no asterisks, no formatting. Just plain text.`

    let summary
    try {
      const result = await fastModel.generateContent(summaryPrompt)
      summary = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini summary error:', geminiErr)
      summary = `${elderName} is being monitored by Sahara. Check the dashboard for today's health and medicine details.`
    }

    return res.json({ success: true, summary, elderName })
  } catch (e) {
    console.error('Daily summary error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   POST /api/family/link-elder
   Link a family member to an elder by their Sahara User ID.
   Also writes the reverse link: elder.family_id = family_user_id
───────────────────────────────────── */
router.post('/link-elder', async (req, res) => {
  const { family_user_id, elder_code } = req.body

  if (!family_user_id || !elder_code) {
    return res.status(400).json({
      success: false,
      error: 'family_user_id and elder_code required'
    })
  }

  try {
    const code = elder_code.trim()

    // Find elder by their Supabase user ID (the "Sahara Code")
    const { data: elderData } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', code)
      .eq('role', 'elder')
      .single()

    if (!elderData) {
      return res.json({
        success: false,
        error: 'No senior account found with this code. Ask your parent to open Sahara and share their Sahara Code.',
      })
    }

    // Prevent self-link
    if (elderData.id === family_user_id) {
      return res.json({ success: false, error: 'You cannot link to your own account.' })
    }

    // Link family → elder
    const { error: familyLinkError } = await supabase
      .from('users')
      .update({ elder_id: elderData.id })
      .eq('id', family_user_id)

    if (familyLinkError) throw familyLinkError

    // Reverse link: elder → family (best-effort — column may not exist yet)
    await supabase
      .from('users')
      .update({ family_id: family_user_id })
      .eq('id', elderData.id)
      .then(() => {}) // non-critical, silent fail if column missing

    return res.json({ success: true, elder: { id: elderData.id, name: elderData.name } })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   POST /api/family/unlink-elder
   Unlink family member from elder
───────────────────────────────────── */
router.post('/unlink-elder', async (req, res) => {
  const { family_user_id } = req.body

  try {
    const { error } = await supabase
      .from('users')
      .update({ elder_id: null })
      .eq('id', family_user_id)

    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router

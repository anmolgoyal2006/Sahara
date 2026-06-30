const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { model, fastModel } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   Helper: classify BP reading
───────────────────────────────────── */
function classifyBP(systolic, diastolic) {
  if (systolic > 140 || diastolic > 90)
    return { level: 'high', label: 'High — See Doctor' }
  if (systolic > 130 || diastolic > 85)
    return { level: 'elevated', label: 'Slightly High' }
  if (systolic < 100 || diastolic < 65)
    return { level: 'low', label: 'Low' }
  return { level: 'normal', label: 'Normal' }
}

function classifySugar(value) {
  if (value > 180) return { level: 'high', label: 'Very High' }
  if (value > 125) return { level: 'elevated', label: 'High' }
  if (value < 70)  return { level: 'low', label: 'Low' }
  return { level: 'normal', label: 'Normal' }
}

/* ─────────────────────────────────────
   POST /api/health/log
   Save a new health log entry
───────────────────────────────────── */
router.post('/log', async (req, res) => {
  const {
    elder_id, bp_systolic, bp_diastolic,
    sugar_level, weight, mood, notes
  } = req.body

  if (!elder_id) {
    return res.status(400).json({ success: false, error: 'elder_id is required' })
  }

  try {
    // Get elder's conditions for context
    const { data: profile } = await supabase
      .from('elder_profiles')
      .select('conditions, age')
      .eq('id', elder_id)
      .single()

    // Generate AI tip based on this reading using Gemini
    let aiTip = null
    try {
      const conditionsText = profile?.conditions?.length
        ? `Known conditions: ${profile.conditions.join(', ')}. `
        : ''
      const readingText = [
        bp_systolic && bp_diastolic ? `Blood pressure: ${bp_systolic}/${bp_diastolic} mmHg. ` : '',
        sugar_level ? `Blood sugar: ${sugar_level} mg/dL. ` : '',
        weight     ? `Weight: ${weight} kg. ` : '',
        mood       ? `Mood: ${mood}. ` : '',
      ].filter(Boolean).join(' ')

      const tipPrompt = `You are a caring health assistant for an elderly person in India, age ${profile?.age || 'elderly'}. ${conditionsText}Today's reading: ${readingText}Give ONE short, simple, practical health tip in 1 sentence based on this reading. Be warm and encouraging, never alarming. If reading is concerning, gently suggest seeing a doctor. No formatting, no bullet points, no asterisks, just one plain sentence.`

      const result = await fastModel.generateContent(tipPrompt)
      aiTip = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini tip generation failed:', geminiErr)
      // Non-critical — continue without AI tip
    }

    // Insert health log
    const { data, error } = await supabase
      .from('health_logs')
      .insert({
        elder_id,
        bp_systolic:  bp_systolic  || null,
        bp_diastolic: bp_diastolic || null,
        sugar_level:  sugar_level  || null,
        weight:       weight       || null,
        mood:         mood         || null,
        notes:        notes        || null,
        ai_tip:       aiTip,
      })
      .select()
      .single()

    if (error) throw error

    // Determine if this reading needs a warning flag
    let warning = null
    if (bp_systolic && bp_diastolic) {
      const bpStatus = classifyBP(bp_systolic, bp_diastolic)
      if (bpStatus.level === 'high') {
        warning = {
          type: 'bp_high',
          message: 'Blood pressure reading is high. Consider consulting a doctor.',
        }
      }
    }
    if (sugar_level) {
      const sugarStatus = classifySugar(sugar_level)
      if (sugarStatus.level === 'high' && !warning) {
        warning = {
          type: 'sugar_high',
          message: 'Blood sugar reading is high. Consider consulting a doctor.',
        }
      }
    }

    return res.json({ success: true, log: data, warning })
  } catch (e) {
    console.error('Health log error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/health/trend/:elderId
   Get last N days of health data for charts
───────────────────────────────────── */
router.get('/trend/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { days = 7 } = req.query

  try {
    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))

    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('elder_id', elderId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true })

    if (error) throw error

    // Group by calendar day and average numeric vitals
    const dayMap = {}
    ;(data || []).forEach(log => {
      const dateKey = new Date(log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          date: dateKey,
          fullDate: log.logged_at,
          systolicVals: [], diastolicVals: [],
          sugarVals: [], weightVals: [],
          moods: [],
        }
      }
      const d = dayMap[dateKey]
      if (log.bp_systolic  != null) d.systolicVals.push(log.bp_systolic)
      if (log.bp_diastolic != null) d.diastolicVals.push(log.bp_diastolic)
      if (log.sugar_level  != null) d.sugarVals.push(log.sugar_level)
      if (log.weight       != null) d.weightVals.push(log.weight)
      if (log.mood)                  d.moods.push(log.mood)
    })

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null

    const chartData = Object.values(dayMap).map(d => ({
      date:      d.date,
      fullDate:  d.fullDate,
      systolic:  avg(d.systolicVals),
      diastolic: avg(d.diastolicVals),
      sugar:     avg(d.sugarVals),
      weight:    avg(d.weightVals),
      // Use last mood of the day
      mood:      d.moods.length ? d.moods[d.moods.length - 1] : null,
      // How many readings that day
      count:     Math.max(d.systolicVals.length, d.sugarVals.length, d.weightVals.length, d.moods.length),
    }))

    return res.json({ success: true, data: chartData })
  } catch (e) {
    return res.status(500).json({ success: false, data: [] })
  }
})

/* ─────────────────────────────────────
   GET /api/health/history/:elderId
   Get full paginated history list
───────────────────────────────────── */
router.get('/history/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { limit = 30 } = req.query

  try {
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('elder_id', elderId)
      .order('logged_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error
    return res.json({ success: true, logs: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, logs: [] })
  }
})

/* ─────────────────────────────────────
   GET /api/health/summary/:elderId
   AI-generated weekly summary for doctor sharing
───────────────────────────────────── */
router.get('/summary/:elderId', async (req, res) => {
  const { elderId } = req.params

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { data: logs } = await supabase
      .from('health_logs')
      .select('*')
      .eq('elder_id', elderId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true })

    const { data: profile } = await supabase
      .from('elder_profiles')
      .select('conditions, age')
      .eq('id', elderId)
      .single()

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', elderId)
      .single()

    if (!logs || logs.length === 0) {
      return res.json({ success: true, summary: 'No health data logged in the past 7 days.', logs: [] })
    }

    const dataText = logs.map(l =>
      `${new Date(l.logged_at).toLocaleDateString('en-IN')}: ` +
      `BP ${l.bp_systolic || '-'}/${l.bp_diastolic || '-'}, ` +
      `Sugar ${l.sugar_level || '-'}, ` +
      `Weight ${l.weight || '-'}kg, Mood: ${l.mood || '-'}`
    ).join('\n')

    const summaryPrompt = `Generate a brief health summary report for a doctor about ${user?.name || 'patient'}, age ${profile?.age || 'unknown'}.
Known conditions: ${profile?.conditions?.join(', ') || 'none reported'}.
Last 7 days readings:
${dataText}
Write a 3-4 sentence professional summary covering: overall trend, any concerning patterns, and general observation. Use medical but understandable language. No bullet points, no asterisks, just flowing sentences.`

    let summary
    try {
      const result = await model.generateContent(summaryPrompt)
      summary = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini summary error:', geminiErr)
      if (geminiErr.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Sahara is busy right now. Please wait a moment and try again.',
        })
      }
      return res.status(500).json({ success: false, error: 'Could not generate summary. Please try again.' })
    }

    return res.json({
      success: true,
      summary,
      logs,
      patientName:  user?.name,
      patientAge:   profile?.age,
      conditions:   profile?.conditions || [],
    })
  } catch (e) {
    console.error('Summary error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/health/alerts/:elderId
   Get recent unacknowledged health warnings
   (built now, used in Phase 6D)
───────────────────────────────────── */
router.get('/alerts/:elderId', async (req, res) => {
  const { elderId } = req.params

  try {
    const since = new Date()
    since.setDate(since.getDate() - 3)

    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('elder_id', elderId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: false })

    const alerts = (data || [])
      .filter(log => {
        const bpHigh    = log.bp_systolic > 140 || log.bp_diastolic > 90
        const sugarHigh = log.sugar_level > 180
        return bpHigh || sugarHigh
      })
      .map(log => ({
        id:   log.id,
        date: log.logged_at,
        type: log.bp_systolic > 140 ? 'bp' : 'sugar',
        values: {
          bp:    `${log.bp_systolic}/${log.bp_diastolic}`,
          sugar: log.sugar_level,
        },
      }))

    return res.json({ success: true, alerts })
  } catch (e) {
    return res.json({ success: true, alerts: [] })
  }
})

module.exports = router

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
   POST /api/medicine/add
───────────────────────────────────── */
router.post('/add', async (req, res) => {
  const { elder_id, name, dosage, times, days, remind_family, category } = req.body

  if (!elder_id || !name || !times || times.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Name and at least one time are required',
    })
  }

  try {
    let infoNote = null
    try {
      const infoPrompt = `In one simple sentence, explain in plain language what the medicine "${name}" is commonly used for in India. Do NOT mention dosage, do NOT give medical advice, just say what condition it is typically prescribed for, in a warm non-alarming tone suitable for an elderly person. If you are not sure what this medicine is, simply say "Please ask your pharmacist about this medicine." No formatting, no asterisks, one sentence only.`
      const result = await fastModel.generateContent(infoPrompt)
      infoNote = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini medicine info failed:', geminiErr)
    }

    const { data, error } = await supabase
      .from('medicines')
      .insert({
        elder_id,
        name,
        dosage: dosage || '',
        times,
        days: days || ['daily'],
        remind_family: remind_family !== false,
        is_active: true,
        info_note: infoNote,
        category: category || 'other',
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, medicine: data })
  } catch (e) {
    console.error('Add medicine error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/medicine/list/:elderId
───────────────────────────────────── */
router.get('/list/:elderId', async (req, res) => {
  const { elderId } = req.params
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('elder_id', elderId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json({ success: true, medicines: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, medicines: [] })
  }
})

/* ─────────────────────────────────────
   PUT /api/medicine/update/:medicineId
───────────────────────────────────── */
router.put('/update/:medicineId', async (req, res) => {
  const { medicineId } = req.params
  const { name, dosage, times, days, remind_family, category } = req.body
  try {
    const { data, error } = await supabase
      .from('medicines')
      .update({ name, dosage, times, days, remind_family: remind_family !== false, category })
      .eq('id', medicineId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, medicine: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   DELETE /api/medicine/delete/:medicineId
   Soft delete
───────────────────────────────────── */
router.delete('/delete/:medicineId', async (req, res) => {
  const { medicineId } = req.params
  try {
    const { error } = await supabase
      .from('medicines')
      .update({ is_active: false })
      .eq('id', medicineId)

    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/medicine/today/:elderId
   Full schedule with taken/pending status,
   creates missing log rows on the fly
───────────────────────────────────── */
router.get('/today/:elderId', async (req, res) => {
  const { elderId } = req.params
  const today = todayIST()

  try {
    const { data: medicines } = await supabase
      .from('medicines')
      .select('*')
      .eq('elder_id', elderId)
      .eq('is_active', true)

    if (!medicines || medicines.length === 0) {
      return res.json({ success: true, schedule: [] })
    }

    const { data: existingLogs } = await supabase
      .from('medicine_logs')
      .select('*')
      .eq('elder_id', elderId)
      .eq('scheduled_date', today)

    const logMap = {}
    ;(existingLogs || []).forEach(log => {
      logMap[`${log.medicine_id}_${log.scheduled_time}`] = log
    })

    const schedule = []
    const toInsert = []

    for (const med of medicines) {
      for (const time of (med.times || [])) {
        const key = `${med.id}_${time}`
        const existing = logMap[key]

        if (existing) {
          schedule.push({
            log_id:      existing.id,
            medicine_id: med.id,
            name:        med.name,
            dosage:      med.dosage,
            info_note:   med.info_note || null,
            color:       med.color || '#1D9E75',
            icon:        med.icon  || 'ti-pill',
            time,
            status:      existing.status,
            taken_at:    existing.taken_at,
          })
        } else {
          toInsert.push({
            medicine_id:    med.id,
            elder_id:       elderId,
            scheduled_time: time,
            scheduled_date: today,
            status:         'pending',
          })
          schedule.push({
            log_id:      null,
            medicine_id: med.id,
            name:        med.name,
            dosage:      med.dosage,
            info_note:   med.info_note || null,
            color:       med.color || '#1D9E75',
            icon:        med.icon  || 'ti-pill',
            time,
            status:      'pending',
            taken_at:    null,
          })
        }
      }
    }

    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from('medicine_logs')
        .insert(toInsert)
        .select()

      inserted?.forEach(row => {
        const match = schedule.find(s =>
          s.medicine_id === row.medicine_id &&
          s.time === row.scheduled_time &&
          s.log_id === null
        )
        if (match) match.log_id = row.id
      })
    }

    schedule.sort((a, b) => a.time.localeCompare(b.time))
    return res.json({ success: true, schedule })
  } catch (e) {
    console.error('Today schedule error:', e)
    return res.status(500).json({ success: false, schedule: [] })
  }
})

/* ─────────────────────────────────────
   PUT /api/medicine/mark/:logId
   Mark a dose taken / missed / skipped
───────────────────────────────────── */
router.put('/mark/:logId', async (req, res) => {
  const { logId } = req.params
  const { status } = req.body

  if (!['taken', 'missed', 'skipped', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' })
  }

  try {
    const { data, error } = await supabase
      .from('medicine_logs')
      .update({
        status,
        taken_at: status === 'taken' ? new Date().toISOString() : null,
      })
      .eq('id', logId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, log: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────
   GET /api/medicine/next/:elderId
   Next upcoming dose (for ElderHome + AI context)
───────────────────────────────────── */
router.get('/next/:elderId', async (req, res) => {
  const { elderId } = req.params
  const today = todayIST()

  try {
    const istOffset = 5.5 * 60 * 60 * 1000
    const now = new Date(Date.now() + istOffset)
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

    const { data: medicines } = await supabase
      .from('medicines')
      .select('*')
      .eq('elder_id', elderId)
      .eq('is_active', true)

    const { data: logs } = await supabase
      .from('medicine_logs')
      .select('*')
      .eq('elder_id', elderId)
      .eq('scheduled_date', today)

    let nextMedicine = null
    let minDiff = Infinity

    ;(medicines || []).forEach(med => {
      ;(med.times || []).forEach(time => {
        const [h, m] = time.split(':').map(Number)
        const diff = (h * 60 + m) - currentMinutes
        if (diff <= 0) return

        const log = (logs || []).find(l =>
          l.medicine_id === med.id && l.scheduled_time === time
        )
        if (log?.status === 'taken' || log?.status === 'skipped') return

        if (diff < minDiff) {
          minDiff = diff
          nextMedicine = {
            id:          med.id,
            name:        med.name,
            dosage:      med.dosage,
            nextTime:    time,
            minutesUntil: diff,
            logId:       log?.id || null,
          }
        }
      })
    })

    return res.json({ success: true, nextMedicine })
  } catch (e) {
    return res.status(500).json({ success: true, nextMedicine: null })
  }
})

/* ─────────────────────────────────────
   GET /api/medicine/adherence/:elderId
   Adherence stats for last N days
───────────────────────────────────── */
router.get('/adherence/:elderId', async (req, res) => {
  const { elderId } = req.params
  const { days = 7 } = req.query

  try {
    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))
    const sinceStr = since.toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('medicine_logs')
      .select('*')
      .eq('elder_id', elderId)
      .gte('scheduled_date', sinceStr)

    const total   = logs?.length || 0
    const taken   = logs?.filter(l => l.status === 'taken').length  || 0
    const missed  = logs?.filter(l => l.status === 'missed').length || 0
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 100

    const byDate = {}
    ;(logs || []).forEach(log => {
      if (!byDate[log.scheduled_date]) {
        byDate[log.scheduled_date] = { taken: 0, total: 0 }
      }
      byDate[log.scheduled_date].total++
      if (log.status === 'taken') byDate[log.scheduled_date].taken++
    })

    const dailyBreakdown = Object.entries(byDate)
      .map(([date, v]) => ({
        date,
        taken:    v.taken,
        total:    v.total,
        complete: v.taken === v.total && v.total > 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return res.json({ success: true, total, taken, missed, percentage, dailyBreakdown })
  } catch (e) {
    return res.status(500).json({
      success: false, total: 0, taken: 0, missed: 0, percentage: 0, dailyBreakdown: [],
    })
  }
})

module.exports = router

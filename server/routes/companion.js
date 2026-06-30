const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { chatModel, fastModel } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────
   Build system prompt with elder context
───────────────────────────────────── */
function buildSystemPrompt(elderContext) {
  const {
    name, age, language, conditions,
    lastHealthLog, upcomingBookings,
    medicines, timeOfDay, healthAlerts
  } = elderContext

 const langInstruction = {
    hi: 'Respond ONLY in simple Hindi (Devanagari script). Use simple words an elderly person understands.',
    en: 'Respond ONLY in simple English. Use short sentences.',
    // IMPORTANT: Romanized (Roman/Latin script), NOT Gurmukhi script. This text is read
    // aloud by a Hindi text-to-speech voice (no Punjabi voice is available), and Hindi
    // voices cannot pronounce Gurmukhi characters at all. Romanized Punjabi (e.g. "Tussi
    // kivaen ho?" instead of "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?") is the only form that speaks correctly.
    pa: 'Respond ONLY in simple Punjabi, but written in ROMANIZED form using English/Latin letters (NOT Gurmukhi script). For example write "Tussi kiven ho" instead of "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ". Use easy, commonly understood Punjabi words. Mix Hindi words if needed so it sounds natural to an elderly Punjabi speaker.',
  }[language] || 'Respond in simple Hindi.'

  const conditionsText = conditions?.length
    ? `Health conditions: ${conditions.join(', ')}`
    : 'No known health conditions'

  const healthText = lastHealthLog
    ? `Last health reading: BP ${lastHealthLog.bp_systolic}/${lastHealthLog.bp_diastolic}, Sugar ${lastHealthLog.sugar_level} mg/dL, Mood: ${lastHealthLog.mood}`
    : 'No recent health data'

  const bookingText = upcomingBookings?.length
    ? `Upcoming booking: ${upcomingBookings[0].service_type} on ${new Date(upcomingBookings[0].scheduled_at).toLocaleDateString('en-IN')}`
    : 'No upcoming bookings'

  const medicineText = medicines?.length
    ? `Current medicines: ${medicines.map(m => m.name).join(', ')}`
    : 'No medicines recorded'

  const alertText = healthAlerts?.length
    ? `IMPORTANT: Recent concerning reading detected — ${healthAlerts[0].type === 'bp' ? 'blood pressure' : 'blood sugar'} was high recently. Gently check on them if relevant to the conversation, but do not be alarming.`
    : ''

  return `You are Sahara, a warm and caring AI companion for elderly people in India.
You are talking to ${name} ji, who is ${age || 'elderly'} years old.
${langInstruction}

IMPORTANT RULES:
1. Keep ALL responses SHORT — maximum 2-3 sentences
2. Speak naturally like a caring grandchild, not a robot
3. NEVER use bullet points, numbered lists, or markdown
4. NEVER use asterisks, bold, or any formatting symbols
5. Always address them as "${name} ji"
6. If they seem sad or lonely, respond with warmth
7. If they ask about health, give simple practical advice
8. If they want to book a service, confirm what you understood

ELDER CONTEXT:
Name: ${name}
Age: ${age || 'elderly'}
${conditionsText}
${healthText}
${bookingText}
${medicineText}
${alertText}
Time of day: ${timeOfDay}

SPECIAL ACTIONS — append ONE of these tags at the very end if clearly requested:
[ACTION:BOOK:service:time:date:duration_hours]
Examples:
- [ACTION:BOOK:maid:10:00:2024-01-15:2] (book maid at 10 AM on Jan 15 for 2 hours)
- [ACTION:BOOK:nurse:14:00:tomorrow:3] (book nurse at 2 PM tomorrow for 3 hours)
- [ACTION:BOOK:driver:09:00:today:1] (book driver at 9 AM today for 1 hour)
- [ACTION:BOOK:cook:11:00:tomorrow:1] when user says "1 ghante ke liye" or "ek ghanta"
Service type mapping: khaana/cook/chef/kook → cook, nurse/nursing → nurse, driver/car → driver, maid/safaai → maid, physiotherapy → physiotherapist, repair → repair
Duration mapping: 1/ek/एक → 1, 2/do/दो → 2, 3/teen/तीन → 3, 4/char/चार → 4, adha/adha ghanta → 1 (round up)
If time/date/duration are not specified, use defaults: time=09:00, date=tomorrow, duration=2
[ACTION:CALL_FAMILY]
[ACTION:SOS]
[ACTION:HEALTH_LOG]
[ACTION:MEDICINES]
[ACTION:MARK_TAKEN:medicine_name]
  Use this when the user says they have taken a medicine (e.g. "maine dawai le li", "I took my medicine", "maine subah wali dawai kha li").
  Replace medicine_name with the closest matching name from their current medicines list above.
  If they only have one active medicine, use that name automatically.
  If it is unclear which medicine or they have multiple medicines and don't specify, use the generic [ACTION:MEDICINES] tag instead.
  Examples:
  - User: "maine metformin le li" → [ACTION:MARK_TAKEN:Metformin]
  - User: "dawai kha li" (only one medicine in list) → [ACTION:MARK_TAKEN:that_medicine_name]
  - User: "dawai kha li" (multiple medicines, unclear which) → [ACTION:MEDICINES]

Only add an action tag when the user clearly requests it. Never add speculatively.

If the user mentions specific health numbers like blood pressure or sugar level in their message, append this additional tag (in addition to any ACTION tag) at the very end of your response:
[VITALS:systolic,diastolic,sugar,weight]
Use the word null for any value not mentioned.
Example: user says "meri BP 130 by 85 hai" → append [VITALS:130,85,null,null]
Only add this tag if numbers are clearly stated, never guess or assume values.`
}

/* ─────────────────────────────────────
   POST /api/companion/chat
───────────────────────────────────── */
router.post('/chat', async (req, res) => {
  const { message, conversation_history = [], elder_context } = req.body

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty' })
  }

  try {
    const systemPrompt = buildSystemPrompt(elder_context)

    const history = conversation_history.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    let rawResponse
    try {
      const chat = chatModel.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'model',
            parts: [{ text: 'Samajh gaya, main Sahara hoon aur is tarah jawaab dunga.' }]
          },
          ...history
        ]
      })

      const result = await chat.sendMessage(message)
      rawResponse = result.response.text() || ''
    } catch (geminiErr) {
      console.error('Gemini chat error:', geminiErr)
      if (geminiErr.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Sahara is busy right now. Please wait a moment and try again.'
        })
      }
      return res.status(500).json({
        success: false,
        error: 'Could not get response. Please try again.'
      })
    }
    console.log('RAW GEMINI RESPONSE:', rawResponse)

    // Extract action tag
    const actionMatch = rawResponse.match(/\[ACTION:([^\]]+)\]/)
    const action = actionMatch ? actionMatch[1] : null
    const cleanResponse = rawResponse
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .replace(/\[VITALS:[^\]]+\]/g, '')
      .trim()

    // Extract vitals tag
    const vitalsMatch = rawResponse.match(/\[VITALS:([^\]]+)\]/)
    let vitals = null
    if (vitalsMatch) {
      const [s, d, sugar, weight] = vitalsMatch[1].split(',').map(v => v.trim())
      vitals = {
        systolic:  s      !== 'null' ? parseInt(s)        : null,
        diastolic: d      !== 'null' ? parseInt(d)        : null,
        sugar:     sugar  !== 'null' ? parseInt(sugar)    : null,
        weight:    weight !== 'null' ? parseFloat(weight) : null,
      }
    }

    let actionData = null
    if (action) {
      if (action.startsWith('MARK_TAKEN:')) {
        const medName = action.split(':')[1]
        actionData = { type: 'MARK_TAKEN', medicineName: medName }
      } else if (action.startsWith('BOOK:')) {
        const parts = action.split(':')
        // Format: BOOK:service:HH:MM:date:duration
        // NOTE: time itself contains a colon (HH:MM), so a naive split(':') shifts
        // every field after time by one position. We rejoin parts[2] and parts[3]
        // back into the time value before reading date/duration.
        let service = parts[1] || 'maid'
        
        // Map service type variations to standard values
        const serviceMap = {
          'kook': 'cook',
          'cook': 'cook',
          'maid': 'maid',
          'nurse': 'nurse',
          'driver': 'driver',
          'physiotherapist': 'physiotherapist',
          'repair': 'repair'
        }
        service = serviceMap[service.toLowerCase()] || service
        
        let time = (parts[2] && parts[3]) ? `${parts[2]}:${parts[3]}` : (parts[2] || '09:00')
        let date = parts[4] || 'tomorrow'
        const duration = parts[5] || '2'
        
        // Normalize time format - convert single numbers to HH:MM
        if (/^\d$/.test(time)) {
          time = `0${time}:00`
        } else if (/^\d{2}$/.test(time)) {
          time = `${time}:00`
        }
        
        // Convert relative dates to actual dates
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

        if (date === 'today' || date === 'tomorrow') {
          date = resolveDateIST(date)
        }

        // Ensure date is in YYYY-MM-DD format, if not, default to tomorrow
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          date = resolveDateIST('tomorrow')
        }
        
        actionData = { 
          type: 'BOOK', 
          service, 
          time, 
          date, 
          duration 
        }
      } else {
        actionData = { type: action }
      }
    }

    return res.json({
      success: true,
      response: cleanResponse,
      action: actionData,
      vitals,
    })
  } catch (e) {
    console.error('Companion chat error:', e)
    throw e
  }
})

/* ─────────────────────────────────────
   POST /api/companion/greeting
───────────────────────────────────── */
router.post('/greeting', async (req, res) => {
  const { elder_context } = req.body
  try {
    const { name, language, timeOfDay } = elder_context

    const greetingPrompts = {
      hi: `Generate a warm, short greeting in simple Hindi (2 sentences max) for ${name} ji. It is ${timeOfDay}. Be like a caring grandchild. No formatting, no lists, no asterisks.`,
      en: `Generate a warm, short greeting in English (2 sentences max) for ${name} ji. It is ${timeOfDay}. Ask how they are feeling. Be caring and simple.`,
      pa: `Generate a warm, short greeting for ${name} ji in simple easy Punjabi words (2 sentences max). It is ${timeOfDay}. Mix Hindi if needed to sound natural. No formatting.`,
    }

    let greeting
    try {
      const promptText = greetingPrompts[language] || greetingPrompts.hi
      const result = await fastModel.generateContent(promptText)
      greeting = result.response.text().trim()
    } catch (geminiErr) {
      console.error('Gemini greeting error:', geminiErr)
      greeting = `Namaste ${elder_context?.name} ji! Aap kaise hain aaj?`
    }
    return res.json({ success: true, greeting })
  } catch (e) {
    return res.status(500).json({
      success: false,
      greeting: `Namaste ${elder_context?.name} ji! Aap kaise hain aaj?`,
    })
  }
})

/* ─────────────────────────────────────
   POST /api/companion/save-message
───────────────────────────────────── */
router.post('/save-message', async (req, res) => {
  const { elder_id, role, content, action } = req.body
  try {
    const { error } = await supabase.from('companion_messages').insert({
      elder_id, role, content,
      action: action || null,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.json({ success: false })
  }
})

/* ─────────────────────────────────────
   GET /api/companion/history/:elderId
───────────────────────────────────── */
router.get('/history/:elderId', async (req, res) => {
  const { elderId } = req.params
  try {
    const { data } = await supabase
      .from('companion_messages')
      .select('*')
      .eq('elder_id', elderId)
      .order('created_at', { ascending: false })
      .limit(20)
    return res.json({ success: true, messages: (data || []).reverse() })
  } catch (e) {
    return res.json({ success: true, messages: [] })
  }
})

module.exports = router

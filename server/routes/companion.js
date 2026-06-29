const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const Groq = require('groq-sdk')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

/* ─────────────────────────────────────
   Build system prompt with elder context
───────────────────────────────────── */
function buildSystemPrompt(elderContext) {
  const {
    name, age, language, conditions,
    lastHealthLog, upcomingBookings,
    medicines, timeOfDay
  } = elderContext

  const langInstruction = {
    hi: 'Respond ONLY in simple Hindi (Devanagari script). Use simple words an elderly person understands.',
    en: 'Respond ONLY in simple English. Use short sentences.',
    pa: 'Respond ONLY in simple Punjabi using easy words. Mix Hindi words if needed so it sounds natural.',
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

Only add an action tag when the user clearly requests it. Never add speculatively.`
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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.slice(-10),
      { role: 'user', content: message },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.7,
      messages,
    })

    const rawResponse = completion.choices[0]?.message?.content || ''

    // Extract action tag
    const actionMatch = rawResponse.match(/\[ACTION:([^\]]+)\]/)
    const action = actionMatch ? actionMatch[1] : null
    const cleanResponse = rawResponse.replace(/\[ACTION:[^\]]+\]/g, '').trim()

    let actionData = null
    if (action) {
      if (action.startsWith('BOOK:')) {
        const parts = action.split(':')
        // Format: BOOK:service:time:date:duration
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
        
        let time = parts[2] || '09:00'
        let date = parts[3] || 'tomorrow'
        const duration = parts[4] || '2'
        
        // Normalize time format - convert single numbers to HH:MM
        if (/^\d$/.test(time)) {
          time = `0${time}:00`
        } else if (/^\d{2}$/.test(time)) {
          time = `${time}:00`
        }
        
        // Convert relative dates to actual dates
        if (date === 'today') {
          date = new Date().toISOString().split('T')[0]
        } else if (date === 'tomorrow') {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          date = tomorrow.toISOString().split('T')[0]
        }
        
        // Ensure date is in YYYY-MM-DD format, if not, default to tomorrow
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          date = tomorrow.toISOString().split('T')[0]
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
      usage: completion.usage,
    })
  } catch (e) {
    console.error('Companion chat error:', e)
    return res.status(500).json({ success: false, error: 'Could not get response. Please try again.' })
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

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      temperature: 0.8,
      messages: [{ role: 'user', content: greetingPrompts[language] || greetingPrompts.hi }],
    })

    const greeting = completion.choices[0]?.message?.content?.trim()
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

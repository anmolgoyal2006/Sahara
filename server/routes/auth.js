const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Check if user exists and get their role
router.post('/check-user', async (req, res) => {
  const { user_id } = req.body
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, name, language')
      .eq('id', user_id)
      .single()
    if (error) return res.json({ exists: false })
    return res.json({ exists: true, ...data })
  } catch {
    return res.json({ exists: false })
  }
})

// Create a new user profile after OTP verification
router.post('/create-user', async (req, res) => {
  const {
    id, phone, name, role, language,
    age, conditions, elder_id,
    experience_years
  } = req.body

  try {
    const { error: userError } = await supabase
      .from('users')
      .insert({ id, phone: phone || null, name, role, language })
    if (userError) throw userError

    if (role === 'elder') {
      await supabase.from('elder_profiles').insert({
        id,
        age,
        conditions,
        preferred_language: language,
      })
    }

    if (role === 'worker') {
      await supabase.from('workers').insert({
        id,
        experience_years: experience_years || 0,
      })
    }

    if (role === 'family' && elder_id) {
      await supabase.from('users').update({ elder_id }).eq('id', id)
    }

    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// Find an elder by phone number (for family linking)
router.post('/find-elder', async (req, res) => {
  const { phone } = req.body
  try {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('phone', phone)
      .eq('role', 'elder')
      .single()
    if (data) return res.json({ found: true, elder: data })
    return res.json({ found: false })
  } catch {
    return res.json({ found: false })
  }
})

module.exports = router

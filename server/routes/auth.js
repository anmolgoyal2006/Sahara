const express = require('express')
// Restarted server
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

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

router.post('/create-user', async (req, res) => {
  const { id, name, role, language,
          age, conditions, elder_id,
          experience_years, skills, languages } = req.body
  try {
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is missing. Please sign in again.' })
    }

    console.log('Attempting to create user with id:', id)

    const { error: userError } = await supabase.from('users').upsert({
      id, name, role,
      language: language || 'hi',
      phone: null
    })
    if (userError) throw userError

    if (role === 'elder') {
      await supabase.from('elder_profiles').upsert({
        id,
        age: age || null,
        conditions: conditions || [],
        preferred_language: language || 'hi'
      })
    }
    if (role === 'worker') {
      await supabase.from('workers').upsert({
        id,
        experience_years: experience_years || 0,
        skills: skills || [],
        languages: languages || ['hi'],
        verified: false,
        available: true
      })
    }
    if (role === 'family' && elder_id) {
      await supabase.from('users').update({ elder_id }).eq('id', id)
    }

    return res.json({ success: true })
  } catch (e) {
    console.error('create-user error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})



module.exports = router

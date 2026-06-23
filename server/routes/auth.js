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
          experience_years } = req.body
  try {
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is missing. Please sign in again.' })
    }

    console.log('Attempting to create user with id:', id)
    // Now insert into users table
    const { error: userError } = await supabase
      .from('users')
      .insert({ id, name, role, language })
    if (userError) throw userError

    if (role === 'elder') {
      const { error: elderError } = await supabase.from('elder_profiles')
        .insert({ id, age, conditions, preferred_language: language })
      if (elderError) throw elderError
    }
    if (role === 'worker') {
      const { error: workerError } = await supabase.from('workers')
        .insert({ id, experience_years: experience_years || 0 })
      if (workerError) throw workerError
    }
    if (role === 'family' && elder_id) {
      const { error: updateError } = await supabase.from('users').update({ elder_id }).eq('id', id)
      if (updateError) throw updateError
    }
    return res.json({ success: true })
  } catch (e) {
    console.error('create-user error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})



module.exports = router

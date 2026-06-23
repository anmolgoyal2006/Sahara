import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const isValidIndianPhone = (phone) => {
  const clean = phone.replace(/\s|-/g, '')
  return /^[6-9]\d{9}$/.test(clean)
}

export const formatPhone = (phone) => {
  const clean = phone.replace(/\s|-/g, '')
  return '+91' + clean
}
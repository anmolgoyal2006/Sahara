'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FamilyDashboardPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('name').eq('id', user.id).single()
      setUserName(data?.name ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#F8FAF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-leaf" style={{ fontSize: '28px', color: '#1D9E75' }} aria-hidden="true" />
          <span style={{ fontSize: '26px', fontWeight: '700', color: '#1D9E75', fontFamily: 'inherit' }}>Sahara</span>
        </div>
        <div style={{ fontSize: '40px' }} aria-hidden="true">🌿</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1D9E75', textAlign: 'center', fontFamily: 'inherit' }}>
          Family Dashboard
        </h1>
        <p style={{ fontSize: '20px', color: '#555555', textAlign: 'center', fontFamily: 'inherit' }}>
          Logged in as: <strong>{userName}</strong>
        </p>
        <p style={{ fontSize: '16px', color: '#999999', textAlign: 'center', fontFamily: 'inherit' }}>
          Phase 9 will build the full dashboard
        </p>
        <div style={{ height: '32px' }} />
        <button
          type="button"
          onClick={handleLogout}
          className="sahara-focus"
          style={{
            width: '100%', height: '64px', backgroundColor: 'white',
            border: '2px solid #E24B4A', borderRadius: '12px',
            color: '#E24B4A', fontSize: '18px', fontWeight: '700',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: '18px' }} aria-hidden="true" />
          Log Out
        </button>
      </div>
    </div>
  )
}

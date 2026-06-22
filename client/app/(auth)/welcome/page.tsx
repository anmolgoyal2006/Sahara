'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'elder' | 'family' | 'worker'

const ROLE_CONFIG: Record<Role, { icon: string; badge: string; home: string; cta: string }> = {
  elder:  { icon: 'user',        badge: 'Senior Member',    home: '/elder/home',        cta: 'Go to My Home' },
  family: { icon: 'users',       badge: 'Family Guardian',  home: '/family/dashboard',  cta: 'Go to Family Dashboard' },
  worker: { icon: 'stethoscope', badge: 'Care Worker',      home: '/worker/jobs',        cta: 'Go to My Jobs' },
}

export default function WelcomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('elder')
  const [ready, setReady] = useState(false)
  const redirected = useRef(false)

  useEffect(() => {
    async function init() {
      // Try sessionStorage first (just registered)
      const storedName = sessionStorage.getItem('sahara_welcome_name')
      const storedRole = sessionStorage.getItem('sahara_welcome_role') as Role | null

      if (storedName && storedRole) {
        setName(storedName)
        setRole(storedRole)
        setReady(true)
        return
      }

      // Fallback: load from Supabase
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (data) {
        setName(data.name ?? '')
        setRole((data.role as Role) ?? 'elder')
        setReady(true)
      }
    }
    init()
  }, [router])

  // Auto-redirect after 5s
  useEffect(() => {
    if (!ready || redirected.current) return
    const config = ROLE_CONFIG[role]
    const timer = setTimeout(() => {
      if (!redirected.current) {
        redirected.current = true
        sessionStorage.removeItem('sahara_welcome_name')
        sessionStorage.removeItem('sahara_welcome_role')
        router.replace(config.home)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [ready, role, router])

  function goHome() {
    if (redirected.current) return
    redirected.current = true
    const config = ROLE_CONFIG[role]
    sessionStorage.removeItem('sahara_welcome_name')
    sessionStorage.removeItem('sahara_welcome_role')
    router.replace(config.home)
  }

  const config = ROLE_CONFIG[role]

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Auto-progress bar at top */}
      {ready && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '4px',
            backgroundColor: '#1D9E75',
            width: '0%',
          }}
          className="auto-progress-bar"
          role="progressbar"
          aria-label="Redirecting in 5 seconds"
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '440px',
          width: '100%',
        }}
        className="page-enter"
      >
        {/* Success circle */}
        <div
          className="success-pop"
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            border: '4px solid #1D9E75',
            backgroundColor: '#F0FBF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
          aria-hidden="true"
        >
          <i
            className="ti ti-check"
            style={{ fontSize: '44px', color: '#1D9E75' }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111111',
            marginBottom: '8px',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          Welcome to Sahara!
        </h1>

        {/* Personalised greeting */}
        <p
          style={{
            fontSize: '20px',
            color: '#555555',
            lineHeight: '1.5',
            marginBottom: '20px',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          {name ? `Namaste ${name} ji, your account is ready!` : 'Your account is ready!'}
        </p>

        {/* Role badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '50px',
            backgroundColor: '#F0FBF7',
            border: '2px solid #1D9E75',
            color: '#0F6E56',
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '28px',
            fontFamily: 'inherit',
          }}
          role="status"
          aria-label={`Your role: ${config.badge}`}
        >
          <i className={`ti ti-${config.icon}`} style={{ fontSize: '18px' }} aria-hidden="true" />
          {config.badge}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={goHome}
          className="sahara-focus"
          style={{
            width: '100%',
            maxWidth: '440px',
            height: '72px',
            backgroundColor: '#1D9E75',
            color: 'white',
            fontSize: '20px',
            fontWeight: '700',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F6E56')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1D9E75')
          }
        >
          <i className="ti ti-home" style={{ fontSize: '18px' }} aria-hidden="true" />
          {config.cta}
        </button>

        {/* Support text */}
        <p
          style={{
            fontSize: '16px',
            color: '#999999',
            textAlign: 'center',
            marginTop: '16px',
            fontFamily: 'inherit',
          }}
        >
          Need help? Call us: 1800-XXX-XXXX
        </p>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/layout/AuthCard'
import PhoneInput from '@/components/auth/PhoneInput'
import SaharaButton from '@/components/ui/SaharaButton'
import { createClient } from '@/lib/supabase/client'
import { isValidIndianPhone, cleanPhone } from '@/lib/utils/phone'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validatePhone(): string {
    const cleaned = cleanPhone(phone)
    if (!cleaned) return 'Please enter your mobile number'
    if (cleaned.length < 10) return 'Mobile number must be 10 digits'
    if (!isValidIndianPhone(cleaned)) return 'Please enter a valid Indian mobile number'
    return ''
  }

  async function handleSendOTP() {
    const validationError = validatePhone()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)
    const cleaned = cleanPhone(phone)

    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleaned}`,
        options: { channel: 'sms' },
      })

      if (otpError) {
        if (otpError.message.toLowerCase().includes('network') ||
            otpError.message.toLowerCase().includes('fetch')) {
          setError('No internet. Please check your connection.')
        } else {
          setError('Could not send OTP. Please try again.')
        }
        setLoading(false)
        return
      }

      sessionStorage.setItem('sahara_phone', cleaned)
      router.push('/verify')
    } catch {
      setError('Could not send OTP. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111111',
            marginBottom: '8px',
            fontFamily: 'inherit',
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: '#555555',
            marginBottom: '24px',
            fontFamily: 'inherit',
          }}
        >
          Enter your mobile number to continue
        </p>

        <PhoneInput
          value={phone}
          onChange={(val) => {
            setPhone(val)
            if (error) setError('')
          }}
          disabled={loading}
          error={error}
        />

        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <SaharaButton
            loading={loading}
            loadingText="Sending OTP..."
            onClick={handleSendOTP}
          >
            <i className="ti ti-send" style={{ fontSize: '18px' }} aria-hidden="true" />
            Send OTP
          </SaharaButton>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '0',
          }}
          aria-hidden="true"
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <span
            style={{
              fontSize: '16px',
              color: '#BBBBBB',
              padding: '0 12px',
              fontFamily: 'inherit',
            }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        {/* New user link */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '18px',
            color: '#555555',
            fontFamily: 'inherit',
          }}
        >
          New to Sahara?{' '}
          <Link
            href="/register"
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1D9E75',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.textDecoration = 'underline')
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.textDecoration = 'none')
            }
          >
            Create account
          </Link>
        </p>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: '14px',
            color: '#CCCCCC',
            textAlign: 'center',
            marginTop: '24px',
            fontFamily: 'inherit',
          }}
        >
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </AuthCard>
  )
}

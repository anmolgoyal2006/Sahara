'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/layout/AuthCard'
import OTPInput from '@/components/auth/OTPInput'
import SaharaButton from '@/components/ui/SaharaButton'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/utils/phone'

export default function VerifyPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shakeError, setShakeError] = useState(false)

  // Resend timer
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('sahara_phone')
    if (!stored) {
      router.replace('/login')
      return
    }
    setPhone(stored)
  }, [router])

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const triggerShake = useCallback(() => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 600)
  }, [])

  const isComplete = otp.every((d) => d !== '')

  async function handleVerify() {
    if (!isComplete) return

    setError('')
    setLoading(true)
    const token = otp.join('')

    try {
      const supabase = createClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token,
        type: 'sms',
      })

      if (verifyError) {
        let msg = 'The code you entered is wrong. Please try again.'
        const errMsg = verifyError.message.toLowerCase()
        if (errMsg.includes('expired')) {
          msg = 'This code has expired. Please request a new one.'
        } else if (errMsg.includes('too many') || errMsg.includes('rate')) {
          msg = 'Too many attempts. Please wait 10 minutes.'
        } else if (errMsg.includes('network') || errMsg.includes('fetch')) {
          msg = 'No internet. Please check your connection.'
        }
        setError(msg)
        triggerShake()
        setOtp(['', '', '', '', '', ''])
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('The code you entered is wrong. Please try again.')
        triggerShake()
        setOtp(['', '', '', '', '', ''])
        setLoading(false)
        return
      }

      // Check if existing user
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (userData?.role === 'elder') {
        router.replace('/elder/home')
      } else if (userData?.role === 'family') {
        router.replace('/family/dashboard')
      } else if (userData?.role === 'worker') {
        router.replace('/worker/jobs')
      } else {
        // New user — go to register
        sessionStorage.setItem('sahara_uid', data.user.id)
        router.replace('/register')
      }
    } catch {
      setError('The code you entered is wrong. Please try again.')
      triggerShake()
      setOtp(['', '', '', '', '', ''])
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!canResend) return
    setCanResend(false)
    setCountdown(30)
    setResendSuccess(false)

    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
        options: { channel: 'sms' },
      })
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch {
      setError('Could not send OTP. Please try again.')
    }
  }

  const timerLabel = `00:${String(countdown).padStart(2, '0')}`

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
          Enter OTP
        </h1>

        <p style={{ fontSize: '18px', color: '#555555', marginBottom: '4px', fontFamily: 'inherit' }}>
          We sent a 6-digit code to
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#111111',
              fontFamily: 'inherit',
            }}
          >
            +91 {formatPhone(phone)}
          </span>
          <a
            href="/login"
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#1D9E75',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={(e) => {
              e.preventDefault()
              router.replace('/login')
            }}
          >
            <i className="ti ti-edit" style={{ fontSize: '14px' }} aria-hidden="true" />
            Change number
          </a>
        </div>

        {/* OTP Boxes */}
        <OTPInput
          value={otp}
          onChange={(val) => {
            setOtp(val)
            if (error) setError('')
          }}
          disabled={loading}
          error={shakeError}
        />

        {/* Error area — always reserve space */}
        <div
          style={{ minHeight: '24px', marginBottom: '16px' }}
          role="alert"
          aria-live="polite"
        >
          {error && (
            <p
              style={{
                fontSize: '16px',
                color: '#E24B4A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit',
              }}
            >
              <i className="ti ti-alert-circle" style={{ fontSize: '16px' }} aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        {/* Verify button */}
        <SaharaButton
          loading={loading}
          loadingText="Verifying..."
          disabled={!isComplete}
          onClick={handleVerify}
          style={{
            backgroundColor: isComplete && !loading ? '#1D9E75' : '#9FE1CB',
            transition: 'background-color 0.2s ease',
          }}
        >
          <i className="ti ti-shield-check" style={{ fontSize: '18px' }} aria-hidden="true" />
          Verify &amp; Continue
        </SaharaButton>

        {/* Resend section */}
        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          <p style={{ fontSize: '16px', color: '#555555' }}>
            Didn&apos;t receive the code?
          </p>

          {resendSuccess ? (
            <p style={{ fontSize: '16px', color: '#1D9E75', fontWeight: '700', marginTop: '4px' }}>
              OTP sent!
            </p>
          ) : canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="sahara-focus"
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1D9E75',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                marginTop: '4px',
                fontFamily: 'inherit',
              }}
            >
              Resend OTP
            </button>
          ) : (
            <p style={{ fontSize: '16px', color: '#555555', marginTop: '4px' }}>
              Resend in{' '}
              <span style={{ fontWeight: '700', color: '#1D9E75' }}>
                {timerLabel}
              </span>
            </p>
          )}
        </div>
      </div>
    </AuthCard>
  )
}

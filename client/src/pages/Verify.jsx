import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import OTPInput from '../components/OTPInput'
import SaharaButton from '../components/SaharaButton'
import { supabase, formatPhone } from '../lib/supabase'

/* ── Left panel (desktop) ────────────────────────────────── */
function VerifyHero({ phone }) {
  return (
    <div style={{
      background: '#EBF4FF',
      padding: '40px 40px 48px',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #DDE8F5',
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>
        Almost there
      </h2>
      <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 32 }}>Ramesh ji</p>

      {/* Info cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div style={{
          background: 'white',
          border: '1px solid #DDE8F5',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#F0FBF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-device-mobile" style={{ fontSize: 18, color: '#1D9E75' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>
              Code sent to +91 {phone}
            </p>
            <p style={{ fontSize: 11, color: '#5A7A9A', margin: 0, marginTop: 2 }}>
              Check your SMS inbox
            </p>
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #DDE8F5',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#FAEEDA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-clock" style={{ fontSize: 18, color: '#BA7517' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>
              Expires in 5 minutes
            </p>
            <p style={{ fontSize: 11, color: '#5A7A9A', margin: 0, marginTop: 2 }}>
              Do not share with anyone
            </p>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div style={{
        background: '#EBF4FF',
        border: '1px solid #DDE8F5',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <i className="ti ti-shield-lock" style={{ fontSize: 16, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: '#185FA5', margin: 0, lineHeight: 1.5 }}>
          Sahara will never call you asking for your OTP code
        </p>
      </div>
    </div>
  )
}

/* ── Main Verify page ────────────────────────────────────── */
export default function Verify() {
  const navigate = useNavigate()
  const phone = sessionStorage.getItem('sahara_phone') || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasError, setHasError] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [resendToast, setResendToast] = useState(false)
  const timerRef = useRef(null)

  // Redirect if no phone
  useEffect(() => {
    if (!phone) navigate('/login')
  }, [phone, navigate])

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          setCanResend(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const isComplete = otp.every((d) => d !== '')

  async function handleVerify() {
    if (!isComplete) return
    setLoading(true)
    setError('')
    setHasError(false)

    const token = otp.join('')
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formatPhone(phone),
        token,
        type: 'sms',
      })

      if (verifyErr || !data.user) {
        const msg = verifyErr?.message?.toLowerCase() || ''
        if (msg.includes('expired')) {
          setError('Code expired. Please request a new one.')
        } else {
          setError('Wrong code. Please check and try again.')
        }
        setHasError(true)
        setLoading(false)
        return
      }

      // Check if user already registered
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id }),
      })
      const userData = await res.json()

      if (userData.exists) {
        sessionStorage.clear()
        if (userData.role === 'elder') navigate('/elder/home')
        else if (userData.role === 'family') navigate('/family/dashboard')
        else if (userData.role === 'worker') navigate('/worker/jobs')
      } else {
        sessionStorage.setItem('sahara_uid', data.user.id)
        navigate('/register')
      }
    } catch {
      setError('Wrong code. Please check and try again.')
      setHasError(true)
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!canResend) return
    setCanResend(false)
    setSeconds(30)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          setCanResend(true)
          return 0
        }
        return s - 1
      })
    }, 1000)

    await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
      options: { channel: 'sms' },
    })
    setResendToast(true)
    setTimeout(() => setResendToast(false), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>
      <Navbar activePage="home" showAuthButtons={false} />

      {/* Toast */}
      {resendToast && (
        <div style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1D9E75',
          color: 'white',
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 700,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <i className="ti ti-check" />
          OTP sent!
        </div>
      )}

      {/* Two-column grid */}
      <div className="verify-grid">
        <div className="verify-hero-col">
          <VerifyHero phone={phone} />
        </div>

        {/* Right: OTP form */}
        <div style={{
          background: 'white',
          padding: '40px 40px 48px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0A2540', margin: '0 0 8px' }}>
            Enter OTP
          </h2>
          <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 6 }}>
            We sent a 6-digit code to +91 {phone}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: '#1D9E75',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 24,
              fontFamily: 'inherit',
            }}
          >
            <i className="ti ti-edit" style={{ fontSize: 13 }} />
            Change number
          </button>

          <OTPInput
            value={otp}
            onChange={(v) => { setOtp(v); if (error) { setError(''); setHasError(false) } }}
            disabled={loading}
            hasError={hasError}
          />

          {/* Error area */}
          <div style={{ minHeight: 20, marginBottom: 16 }}>
            {error && (
              <p role="alert" style={{
                fontSize: 12,
                color: '#E24B4A',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                margin: 0,
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />
                {error}
              </p>
            )}
          </div>

          <SaharaButton
            variant="primary"
            fullWidth
            loading={loading}
            loadingText="Verifying..."
            onClick={handleVerify}
            disabled={!isComplete}
          >
            <i className="ti ti-shield-check" style={{ fontSize: 16 }} />
            Verify &amp; Continue
          </SaharaButton>

          {/* Resend section */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#7A96B0', marginBottom: 6 }}>
              Didn't receive it?
            </p>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1D9E75',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Resend OTP
              </button>
            ) : (
              <p style={{ fontSize: 12, color: '#7A96B0', margin: 0 }}>
                Resend in{' '}
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>
                  00:{String(seconds).padStart(2, '0')}
                </span>
              </p>
            )}
          </div>

          {/* Info box */}
          <div style={{
            background: '#EBF4FF',
            border: '1px solid #DDE8F5',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            gap: 8,
            marginTop: 24,
            alignItems: 'flex-start',
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 14, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 10, color: '#185FA5', margin: 0, lineHeight: 1.5 }}>
              Never share your OTP. Sahara will never call asking for this code.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .verify-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 56px);
        }
        .verify-hero-col { display: block; }

        @media (max-width: 767px) {
          .verify-grid { grid-template-columns: 1fr; }
          .verify-hero-col { display: none; }
          .verify-grid > div:last-child {
            padding: 24px 20px !important;
            min-height: unset !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1024px) {
          .verify-grid { grid-template-columns: 45% 55%; }
          .verify-grid > div { padding: 32px !important; }
        }
      `}</style>
    </div>
  )
}

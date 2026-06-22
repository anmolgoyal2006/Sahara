'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/layout/AuthCard'
import PhoneInput from '@/components/auth/PhoneInput'
import OTPInput from '@/components/auth/OTPInput'
import RoleCard from '@/components/auth/RoleCard'
import SaharaButton from '@/components/ui/SaharaButton'
import { createClient } from '@/lib/supabase/client'
import { isValidIndianPhone, cleanPhone, formatPhone } from '@/lib/utils/phone'

type Role = 'elder' | 'family' | 'worker'

const CONDITIONS = [
  'Diabetes', 'High BP', 'Heart Condition', 'Arthritis',
  'Knee Pain', 'Back Pain', 'Breathing Issues',
  'Kidney Issues', 'Memory Issues', 'Diabetes Type 2',
]

/* ── Step progress bar ──────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div
      style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-label={`Step ${step} of 3`}
    >
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          style={{
            flex: 1,
            height: '5px',
            borderRadius: '3px',
            backgroundColor:
              s < step ? '#1D9E75' : s === step ? '#9FE1CB' : '#E5E7EB',
            transition: 'background-color 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

/* ── Back button ────────────────────────────────────────── */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sahara-focus"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#1D9E75',
        fontSize: '16px',
        fontWeight: '600',
        padding: '10px 10px 10px 0',
        minWidth: '44px',
        minHeight: '44px',
        marginBottom: '16px',
        fontFamily: 'inherit',
      }}
      aria-label="Go back to previous step"
    >
      <i className="ti ti-arrow-left" style={{ fontSize: '22px' }} aria-hidden="true" />
      Back
    </button>
  )
}

/* ── Reusable text input ────────────────────────────────── */
interface FieldInputProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel'
  autoCapitalize?: string
  halfWidth?: boolean
  icon?: string
  rightContent?: React.ReactNode
}

function FieldInput({
  id, label, placeholder, value, onChange, error,
  type = 'text', inputMode, autoCapitalize, halfWidth, rightContent,
}: FieldInputProps) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0
  const hasError = !!error
  const borderColor = hasError ? '#E24B4A' : (focused || filled) ? '#1D9E75' : '#E5E7EB'
  const bg = hasError ? '#FFF0F0' : 'white'

  return (
    <div style={{ width: halfWidth ? '50%' : '100%' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block', fontSize: '18px', fontWeight: '700',
          color: '#333333', marginBottom: '8px', fontFamily: 'inherit',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoCapitalize={autoCapitalize}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={hasError}
          className="sahara-focus"
          style={{
            width: '100%', height: '72px',
            border: `2px solid ${borderColor}`,
            borderRadius: '12px', fontSize: '20px', color: '#111111',
            padding: rightContent ? '0 44px 0 16px' : '0 16px',
            backgroundColor: bg, outline: 'none',
            transition: 'border-color 0.15s ease',
            fontFamily: 'inherit',
          }}
        />
        {filled && !hasError && (
          <i
            className="ti ti-circle-check"
            aria-hidden="true"
            style={{
              position: 'absolute', right: '14px', top: '50%',
              transform: 'translateY(-50%)', fontSize: '20px', color: '#1D9E75',
            }}
          />
        )}
        {rightContent}
      </div>
      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{
            fontSize: '16px', color: '#E24B4A', marginTop: '6px',
            display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: '16px' }} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Step 1: Phone + OTP ────────────────────────────────── */
function Step1({
  onSuccess,
}: {
  onSuccess: (phone: string, uid: string) => void
}) {
  const [subStep, setSubStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [shakeError, setShakeError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const stored = sessionStorage.getItem('sahara_phone')
    const uid = sessionStorage.getItem('sahara_uid')
    // If we came from /verify, skip phone entry
    if (stored && uid) {
      onSuccess(stored, uid)
    }
  }, [onSuccess])

  useEffect(() => {
    if (subStep !== 'otp') return
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, subStep])

  async function sendOTP() {
    const cleaned = cleanPhone(phone)
    if (!cleaned) { setPhoneError('Please enter your mobile number'); return }
    if (cleaned.length < 10) { setPhoneError('Mobile number must be 10 digits'); return }
    if (!isValidIndianPhone(cleaned)) { setPhoneError('Please enter a valid Indian mobile number'); return }

    setPhoneError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${cleaned}`,
        options: { channel: 'sms' },
      })
      if (error) { setPhoneError('Could not send OTP. Please try again.'); setLoading(false); return }
      sessionStorage.setItem('sahara_phone', cleaned)
      setSubStep('otp')
      setCountdown(30)
      setCanResend(false)
    } catch {
      setPhoneError('Could not send OTP. Please try again.')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    if (!otp.every((d) => d)) return
    setOtpError('')
    setLoading(true)
    const token = otp.join('')
    const cleaned = cleanPhone(phone)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${cleaned}`,
        token,
        type: 'sms',
      })
      if (error || !data.user) {
        const msg = error?.message?.toLowerCase() ?? ''
        const errText = msg.includes('expired')
          ? 'This code has expired. Please request a new one.'
          : 'The code you entered is wrong. Please try again.'
        setOtpError(errText)
        setShakeError(true)
        setTimeout(() => setShakeError(false), 600)
        setOtp(['', '', '', '', '', ''])
        setLoading(false)
        return
      }
      // Check if already registered
      const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (userData?.role === 'elder') { router.replace('/elder/home'); return }
      if (userData?.role === 'family') { router.replace('/family/dashboard'); return }
      if (userData?.role === 'worker') { router.replace('/worker/jobs'); return }

      sessionStorage.setItem('sahara_uid', data.user.id)
      onSuccess(cleaned, data.user.id)
    } catch {
      setOtpError('The code you entered is wrong. Please try again.')
    }
    setLoading(false)
  }

  async function resendOTP() {
    if (!canResend) return
    setCanResend(false); setCountdown(30); setResendSuccess(false)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ phone: `+91${cleanPhone(phone)}`, options: { channel: 'sms' } })
    setResendSuccess(true)
    setTimeout(() => setResendSuccess(false), 3000)
  }

  if (subStep === 'phone') {
    return (
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '8px', fontFamily: 'inherit' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: '18px', color: '#555555', marginBottom: '24px', fontFamily: 'inherit' }}>
          Enter your mobile number to continue
        </p>
        <PhoneInput value={phone} onChange={(v) => { setPhone(v); if (phoneError) setPhoneError('') }} disabled={loading} error={phoneError} id="reg-phone" />
        <div style={{ marginTop: '20px' }}>
          <SaharaButton loading={loading} loadingText="Sending OTP..." onClick={sendOTP}>
            <i className="ti ti-send" style={{ fontSize: '18px' }} aria-hidden="true" />
            Send OTP
          </SaharaButton>
        </div>
      </div>
    )
  }

  const isOtpComplete = otp.every((d) => d !== '')
  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '8px', fontFamily: 'inherit' }}>Enter OTP</h2>
      <p style={{ fontSize: '18px', color: '#555555', marginBottom: '4px', fontFamily: 'inherit' }}>We sent a 6-digit code to</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#111111', fontFamily: 'inherit' }}>+91 {formatPhone(cleanPhone(phone))}</span>
        <button type="button" onClick={() => setSubStep('phone')} style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
          <i className="ti ti-edit" style={{ fontSize: '14px' }} aria-hidden="true" />Change number
        </button>
      </div>
      <OTPInput value={otp} onChange={(v) => { setOtp(v); if (otpError) setOtpError('') }} disabled={loading} error={shakeError} />
      <div style={{ minHeight: '24px', marginBottom: '16px' }} role="alert" aria-live="polite">
        {otpError && <p style={{ fontSize: '16px', color: '#E24B4A', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}><i className="ti ti-alert-circle" style={{ fontSize: '16px' }} aria-hidden="true" />{otpError}</p>}
      </div>
      <SaharaButton loading={loading} loadingText="Verifying..." disabled={!isOtpComplete} onClick={verifyOTP} style={{ backgroundColor: isOtpComplete && !loading ? '#1D9E75' : '#9FE1CB' }}>
        <i className="ti ti-shield-check" style={{ fontSize: '18px' }} aria-hidden="true" />Verify &amp; Continue
      </SaharaButton>
      <div style={{ marginTop: '20px', textAlign: 'center', fontFamily: 'inherit' }}>
        <p style={{ fontSize: '16px', color: '#555555' }}>Didn&apos;t receive the code?</p>
        {resendSuccess ? (
          <p style={{ fontSize: '16px', color: '#1D9E75', fontWeight: '700', marginTop: '4px' }}>OTP sent!</p>
        ) : canResend ? (
          <button type="button" onClick={resendOTP} className="sahara-focus" style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' }}>Resend OTP</button>
        ) : (
          <p style={{ fontSize: '16px', color: '#555555', marginTop: '4px' }}>Resend in <span style={{ fontWeight: '700', color: '#1D9E75' }}>00:{String(countdown).padStart(2, '0')}</span></p>
        )}
      </div>
    </div>
  )
}

/* ── Step 2: Role Selection ─────────────────────────────── */
function Step2({ onNext }: { onNext: (role: Role) => void }) {
  const [selected, setSelected] = useState<Role | null>(null)

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '8px', fontFamily: 'inherit' }}>
        Who are you?
      </h2>
      <p style={{ fontSize: '18px', color: '#555555', marginBottom: '24px', fontFamily: 'inherit' }}>
        This helps us personalise your experience
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} role="radiogroup" aria-label="Select your role">
        <RoleCard
          icon="user"
          title="I am a Senior"
          description="I need help with daily tasks, medicines and care"
          selected={selected === 'elder'}
          onSelect={() => setSelected('elder')}
        />
        <RoleCard
          icon="users"
          title="I am a Family Member"
          description="I want to watch over and care for my elderly parent"
          selected={selected === 'family'}
          onSelect={() => setSelected('family')}
        />
        <RoleCard
          icon="stethoscope"
          title="I am a Care Worker"
          description="I provide services like cooking, nursing or driving"
          selected={selected === 'worker'}
          onSelect={() => setSelected('worker')}
        />
      </div>

      <div style={{ marginTop: '24px' }}>
        <SaharaButton
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          style={{ backgroundColor: selected ? '#1D9E75' : '#9FE1CB' }}
        >
          Continue
        </SaharaButton>
      </div>
    </div>
  )
}

/* ── Step 3: Personal Details ───────────────────────────── */
function Step3({
  role,
  phone,
  uid,
  onSuccess,
}: {
  role: Role
  phone: string
  uid: string
  onSuccess: (name: string, role: Role) => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [language, setLanguage] = useState('hi')
  const [parentPhone, setParentPhone] = useState('')
  const [experience, setExperience] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  function toggleCondition(c: string) {
    setConditions((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Please enter your full name'
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    if (role === 'elder') {
      if (!age) errs.age = 'Please enter your age'
      else if (Number(age) < 50 || Number(age) > 110) errs.age = 'Please enter an age between 50 and 110'
    }
    if (role === 'worker') {
      if (experience === '') errs.experience = 'Please enter your years of experience'
      else if (Number(experience) < 0 || Number(experience) > 50) errs.experience = 'Please enter between 0 and 50 years'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setGlobalError('')
    setLoading(true)
    const supabase = createClient()
    try {
      // Insert into users
      const { error: userErr } = await supabase.from('users').insert({
        id: uid,
        phone: `+91${phone}`,
        name: name.trim(),
        role,
        language,
      })
      if (userErr) throw userErr

      if (role === 'elder') {
        await supabase.from('elder_profiles').insert({
          id: uid, age: Number(age), conditions, preferred_language: language,
        })
      }
      if (role === 'worker') {
        await supabase.from('workers').insert({
          id: uid, experience_years: Number(experience),
        })
      }
      if (role === 'family' && parentPhone) {
        const cleaned = cleanPhone(parentPhone)
        if (isValidIndianPhone(cleaned)) {
          const { data: parent } = await supabase.from('users').select('id').eq('phone', `+91${cleaned}`).single()
          if (parent) {
            await supabase.from('users').update({ elder_id: parent.id }).eq('id', uid)
          }
        }
      }

      sessionStorage.removeItem('sahara_phone')
      sessionStorage.removeItem('sahara_uid')
      onSuccess(name.trim(), role)
    } catch {
      setGlobalError('Could not create your account. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '8px', fontFamily: 'inherit' }}>
        Tell us about yourself
      </h2>
      <p style={{ fontSize: '18px', color: '#555555', marginBottom: '24px', fontFamily: 'inherit' }}>
        Step 3 of 3 — Almost done!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FieldInput id="reg-name" label="Your Full Name" placeholder="e.g. Ramesh Kumar"
          value={name} onChange={setName} error={errors.name}
          autoCapitalize="words" />

        {role === 'elder' && (
          <>
            <FieldInput id="reg-age" label="Your Age" placeholder="e.g. 68"
              value={age} onChange={(v) => setAge(v.replace(/\D/g, ''))}
              error={errors.age} type="tel" inputMode="numeric" halfWidth />

            {/* Health conditions chips */}
            <div>
              <label style={{ display: 'block', fontSize: '18px', fontWeight: '700', color: '#333333', marginBottom: '4px', fontFamily: 'inherit' }}>
                Your Health Conditions
              </label>
              <p style={{ fontSize: '16px', color: '#888888', marginBottom: '12px', fontFamily: 'inherit' }}>
                Select all that apply (optional)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label="Health conditions">
                {CONDITIONS.map((c) => {
                  const sel = conditions.includes(c)
                  return (
                    <button key={c} type="button" onClick={() => toggleCondition(c)}
                      aria-pressed={sel}
                      className="sahara-focus"
                      style={{
                        padding: '10px 18px', borderRadius: '30px', fontSize: '15px', fontWeight: '700',
                        border: `2px solid ${sel ? '#1D9E75' : '#E5E7EB'}`,
                        backgroundColor: sel ? '#1D9E75' : 'white',
                        color: sel ? 'white' : '#555555',
                        cursor: 'pointer', minHeight: '44px',
                        transition: 'all 0.15s ease', fontFamily: 'inherit',
                      }}
                    >{c}</button>
                  )
                })}
              </div>
            </div>

            {/* Language select */}
            <div>
              <label htmlFor="reg-lang" style={{ display: 'block', fontSize: '18px', fontWeight: '700', color: '#333333', marginBottom: '8px', fontFamily: 'inherit' }}>
                Preferred Language
              </label>
              <div style={{ position: 'relative' }}>
                <select id="reg-lang" value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="sahara-focus"
                  style={{
                    width: '100%', height: '72px', border: '2px solid #E5E7EB',
                    borderRadius: '12px', fontSize: '20px', color: '#111111',
                    padding: '0 44px 0 16px', backgroundColor: 'white',
                    appearance: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
                <i className="ti ti-chevron-down" aria-hidden="true"
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#555555', pointerEvents: 'none' }} />
              </div>
            </div>
          </>
        )}

        {role === 'family' && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111111', marginBottom: '8px', fontFamily: 'inherit' }}>
              Link to Your Parent
            </h3>
            <p style={{ fontSize: '16px', color: '#666666', lineHeight: '1.5', marginBottom: '12px', fontFamily: 'inherit' }}>
              Enter your parent&apos;s Sahara phone number to link your accounts. Your parent must already be registered.
            </p>
            <PhoneInput value={parentPhone} onChange={setParentPhone} id="reg-parent-phone" />
            <p style={{ fontSize: '14px', color: '#999999', marginTop: '6px', fontFamily: 'inherit' }}>
              Can&apos;t find them? You can link later from Settings
            </p>
          </div>
        )}

        {role === 'worker' && (
          <FieldInput id="reg-exp" label="Years of Experience" placeholder="e.g. 5"
            value={experience} onChange={(v) => setExperience(v.replace(/\D/g, ''))}
            error={errors.experience} type="tel" inputMode="numeric" halfWidth />
        )}
      </div>

      {globalError && (
        <p role="alert" style={{ fontSize: '16px', color: '#E24B4A', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: '16px' }} aria-hidden="true" />
          {globalError}
        </p>
      )}

      <div style={{ marginTop: '24px' }}>
        <SaharaButton loading={loading} loadingText="Creating your account..." onClick={handleCreate}>
          <i className="ti ti-check" style={{ fontSize: '18px' }} aria-hidden="true" />
          Create My Account
        </SaharaButton>
      </div>
    </div>
  )
}

/* ── Main Register Page ─────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [uid, setUid] = useState('')
  const [role, setRole] = useState<Role>('elder')

  function handleStep1Success(p: string, u: string) {
    setPhone(p)
    setUid(u)
    setStep(2)
  }

  function handleStep2Next(r: Role) {
    setRole(r)
    setStep(3)
  }

  function handleRegistered(name: string, r: Role) {
    sessionStorage.setItem('sahara_welcome_name', name)
    sessionStorage.setItem('sahara_welcome_role', r)
    router.push('/welcome')
  }

  return (
    <AuthCard>
      <div>
        <ProgressBar step={step} />

        {step > 1 && (
          <BackButton onClick={() => setStep((s) => s - 1)} />
        )}

        {step === 1 && (
          <Step1 onSuccess={handleStep1Success} />
        )}
        {step === 2 && (
          <Step2 onNext={handleStep2Next} />
        )}
        {step === 3 && (
          <Step3
            role={role}
            phone={phone}
            uid={uid}
            onSuccess={handleRegistered}
          />
        )}
      </div>
    </AuthCard>
  )
}

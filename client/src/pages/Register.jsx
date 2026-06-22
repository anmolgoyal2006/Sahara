import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import RoleCard from '../components/RoleCard'
import SaharaButton from '../components/SaharaButton'
import PhoneInput from '../components/PhoneInput'
import { supabase } from '../lib/supabase'
import { checkUser, createUser, findElder } from '../lib/api'

const CONDITIONS = [
  'Diabetes', 'High BP', 'Heart Condition', 'Arthritis',
  'Knee Pain', 'Back Pain', 'Breathing Issues',
  'Kidney Issues', 'Memory Issues',
]

/* ── Progress bar ──────────────────────────────────────── */
function ProgressBar({ step }) {
  // step 1 = Google (no bar), step 2 = role, step 3 = details
  // Show bar only for steps 2 and 3
  if (step === 1) return null
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 0 }}>
      {[2, 3].map((s) => (
        <div key={s} style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: s < step ? '#1D9E75' : s === step ? '#9FE1CB' : '#DDE8F5',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

/* ── Step 1: Google sign-in ────────────────────────────── */
function Step1({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If we returned from OAuth and sahara_uid is set, skip to step 2
  useEffect(() => {
    const uid = sessionStorage.getItem('sahara_uid')
    if (uid) onSuccess('', uid)
  }, [onSuccess])

  async function handleGoogle() {
    setLoading(true)
    setError('')
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
    })
    if (oauthErr) {
      setError('Could not sign in with Google. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0A2540', margin: '0 0 8px' }}>
        Create Your Account
      </h2>
      <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 28 }}>
        Sign in with Google to get started
      </p>
      <SaharaButton variant="blue" fullWidth loading={loading} loadingText="Redirecting..." onClick={handleGoogle}>
        <i className="ti ti-brand-google" style={{ fontSize: 16 }} /> Continue with Google
      </SaharaButton>
      {error && (
        <p role="alert" style={{ fontSize: 11, color: '#E24B4A', marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />{error}
        </p>
      )}
    </div>
  )
}

/* ── Step 2: Role selection ────────────────────────────── */
function Step2({ onNext }) {
  const [selected, setSelected] = useState(null)
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0A2540', margin: '0 0 8px' }}>Who are you?</h2>
      <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 24 }}>This helps us personalise your experience</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} role="radiogroup" aria-label="Select your role">
        <RoleCard icon="user" title="I am a Senior" description="I need help with daily tasks, medicines and care" selected={selected === 'elder'} onSelect={() => setSelected('elder')} />
        <RoleCard icon="users" title="I am a Family Member" description="I want to watch over and care for my elderly parent" selected={selected === 'family'} onSelect={() => setSelected('family')} />
        <RoleCard icon="stethoscope" title="I am a Care Worker" description="I provide services like cooking, nursing or driving" selected={selected === 'worker'} onSelect={() => setSelected('worker')} />
      </div>
      <div style={{ marginTop: 24 }}>
        <SaharaButton variant="primary" fullWidth disabled={!selected} onClick={() => selected && onNext(selected)}>
          Continue
        </SaharaButton>
      </div>
    </div>
  )
}

/* ── Left panel for Step 3 ─────────────────────────────── */
function Step3HeroPanel({ role }) {
  const features = {
    elder: [
      { icon: 'ti-user-check', title: 'Book Care Workers', sub: 'Verified maids, nurses, drivers' },
      { icon: 'ti-brain', title: 'AI Health Companion', sub: 'Available 24/7 in Hindi' },
      { icon: 'ti-heart-rate-monitor', title: 'Health Tracking', sub: 'BP, sugar, medicines' },
    ],
    family: [
      { icon: 'ti-eye', title: 'Monitor Remotely', sub: 'See health and bookings' },
      { icon: 'ti-bell', title: 'Get Alerts', sub: 'SOS and medicine reminders' },
      { icon: 'ti-video', title: 'Video Calls', sub: 'Stay connected with elders' },
    ],
    worker: [
      { icon: 'ti-briefcase', title: 'Find Jobs Near You', sub: 'Bookings from verified families' },
      { icon: 'ti-star', title: 'Build Your Rating', sub: 'Earn more with good reviews' },
      { icon: 'ti-map-pin', title: 'Location-Based Matching', sub: 'Work close to home' },
    ],
  }
  const list = features[role] || features.elder
  return (
    <div style={{ background: '#EBF4FF', padding: '40px 40px 48px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #DDE8F5' }}>
      <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>
        {role === 'elder' ? "What you'll get" : role === 'family' ? 'Stay connected' : 'Start earning'}
      </h3>
      <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 24 }}>As a {role === 'elder' ? 'senior' : role === 'family' ? 'family member' : 'care worker'}, here is what awaits you:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((f, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #DDE8F5', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: 16, color: '#1D9E75' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>{f.title}</p>
              <p style={{ fontSize: 10, color: '#7A96B0', margin: 0 }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Step 3: Personal details ──────────────────────────── */
function Step3({ role, phone, uid, onSuccess }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [conditions, setConditions] = useState([])
  const [language, setLanguage] = useState('hi')
  const [parentPhone, setParentPhone] = useState('')
  const [parentStatus, setParentStatus] = useState(null) // null | { found, name, id }
  const [experience, setExperience] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // Live parent lookup
  useEffect(() => {
    if (role !== 'family' || parentPhone.length !== 10) { setParentStatus(null); return }
    const timer = setTimeout(async () => {
      try {
        const data = await findElder('+91' + parentPhone)
        setParentStatus(data.found ? { found: true, name: data.elder.name, id: data.elder.id } : { found: false })
      } catch { setParentStatus(null) }
    }, 600)
    return () => clearTimeout(timer)
  }, [parentPhone, role])

  function toggleCondition(c) {
    setConditions((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])
  }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Please enter your full name'
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    if (role === 'elder') {
      if (!age) errs.age = 'Please enter your age'
      else if (Number(age) < 50 || Number(age) > 110) errs.age = 'Please enter an age between 50 and 110'
    }
    setErrors(errs); return Object.keys(errs).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setGlobalError(''); setLoading(true)
    try {
      const data = await createUser({
          id: uid,
          phone: '+91' + phone,
          name: name.trim(),
          role,
          language,
          age: role === 'elder' ? Number(age) : null,
          conditions: role === 'elder' ? conditions : [],
          elder_id: role === 'family' && parentStatus?.found ? parentStatus.id : null,
          experience_years: role === 'worker' ? Number(experience) || 0 : 0,
      })
      if (!data.success) throw new Error(data.error || 'Failed')
      sessionStorage.removeItem('sahara_phone')
      sessionStorage.removeItem('sahara_uid')
      onSuccess(name.trim(), role)
    } catch { setGlobalError('Could not create your account. Please try again.') }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0A2540', margin: '0 0 8px' }}>Tell us about yourself</h2>
      <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 24 }}>Step 3 of 3 — Almost done!</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Name */}
        <FieldInput id="name" label="FULL NAME" placeholder="e.g. Ramesh Kumar" value={name} onChange={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: '' })) }} error={errors.name} />
        {/* Elder fields */}
        {role === 'elder' && (
          <>
            <FieldInput id="age" label="YOUR AGE" placeholder="e.g. 68" value={age} onChange={(v) => { setAge(v.replace(/\D/g, '')); if (errors.age) setErrors((e) => ({ ...e, age: '' })) }} error={errors.age} halfWidth />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Health Conditions <span style={{ color: '#A0B8D0', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Health conditions">
                {CONDITIONS.map((c) => {
                  const sel = conditions.includes(c)
                  return <button key={c} type="button" onClick={() => toggleCondition(c)} aria-pressed={sel} style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, border: `1.5px solid ${sel ? '#0F6E56' : '#DDE8F5'}`, background: sel ? '#0F6E56' : '#F7FBFF', color: sel ? '#E1F5EE' : '#5A7A9A', cursor: 'pointer', minHeight: 36, transition: 'all 0.15s', fontFamily: 'inherit' }}>{c}</button>
                })}
              </div>
            </div>
            <LangSelect value={language} onChange={setLanguage} />
          </>
        )}
        {/* Family fields */}
        {role === 'family' && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Link to Your Parent</p>
            <p style={{ fontSize: 12, color: '#5A7A9A', lineHeight: 1.5, marginBottom: 12 }}>Your parent must already be registered on Sahara</p>
            <PhoneInput value={parentPhone} onChange={(v) => setParentPhone(v)} />
            {parentStatus && (
              <p style={{ fontSize: 11, marginTop: 6, color: parentStatus.found ? '#1D9E75' : '#A0B8D0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`ti ${parentStatus.found ? 'ti-circle-check' : 'ti-info-circle'}`} style={{ fontSize: 12 }} />
                {parentStatus.found ? `Parent found: ${parentStatus.name}` : 'Parent not registered yet, you can link later'}
              </p>
            )}
          </div>
        )}
        {/* Worker fields */}
        {role === 'worker' && (
          <FieldInput id="exp" label="YEARS OF EXPERIENCE" placeholder="e.g. 5" value={experience} onChange={(v) => setExperience(v.replace(/\D/g, ''))} halfWidth />
        )}
      </div>
      {globalError && <p role="alert" style={{ fontSize: 12, color: '#E24B4A', marginTop: 16, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 13 }} />{globalError}</p>}
      <div style={{ marginTop: 24 }}>
        <SaharaButton variant="primary" fullWidth loading={loading} loadingText="Creating your account..." onClick={handleCreate}>
          <i className="ti ti-check" style={{ fontSize: 16 }} /> Create My Account
        </SaharaButton>
      </div>
    </div>
  )
}

/* ── Helper: text field ────────────────────────────────── */
function FieldInput({ id, label, placeholder, value, onChange, error, halfWidth }) {
  const [focused, setFocused] = useState(false)
  const valid = !error && value.length >= 1
  return (
    <div style={{ width: halfWidth ? 160 : '100%' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          aria-describedby={error ? `${id}-err` : undefined} aria-invalid={!!error}
          style={{
            width: '100%', height: 48, border: `1.5px solid ${error ? '#E24B4A' : focused || valid ? '#1D9E75' : '#DDE8F5'}`, borderRadius: 10,
            fontSize: 14, color: '#0A2540', padding: '0 40px 0 14px',
            background: error ? '#FFF0F0' : 'white', outline: 'none',
            boxShadow: focused && !error ? '0 0 0 3px rgba(29,158,117,0.1)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
          }}
        />
        {valid && !error && <i className="ti ti-circle-check" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#1D9E75' }} />}
      </div>
      {error && <p id={`${id}-err`} role="alert" style={{ fontSize: 11, color: '#E24B4A', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }} />{error}</p>}
    </div>
  )
}

/* ── Helper: language select ───────────────────────────── */
function LangSelect({ value, onChange }) {
  return (
    <div>
      <label htmlFor="lang" style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>PREFERRED LANGUAGE</label>
      <div style={{ position: 'relative' }}>
        <select id="lang" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', height: 48, border: '1.5px solid #DDE8F5', borderRadius: 10, fontSize: 14, color: '#0A2540', padding: '0 40px 0 14px', background: 'white', appearance: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="en">English</option>
          <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
        </select>
        <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#5A7A9A', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

/* ── Main Register Page ────────────────────────────────── */
export default function Register() {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [uid, setUid] = useState('')
  const [role, setRole] = useState('elder')
  const navigate = useNavigate()

  function handleStep1(p, u) { setPhone(p); setUid(u); setStep(2) }
  function handleStep2(r) { setRole(r); setStep(3) }
  function handleRegistered(name, r) {
    sessionStorage.setItem('sahara_welcome_name', name)
    sessionStorage.setItem('sahara_welcome_role', r)
    navigate('/welcome')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>
      <Navbar activePage="home" showAuthButtons={false} />
      {/* Progress bar — full width below navbar */}
      <ProgressBar step={step} />

      {step === 1 && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
          <Step1 onSuccess={handleStep1} />
        </div>
      )}

      {step === 2 && (
        <div className="register-grid">
          <div className="register-hero-col">
            <div style={{ background: '#EBF4FF', padding: '48px 40px', minHeight: 'calc(100vh - 61px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #DDE8F5' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>Choose your role</h3>
              <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 24, lineHeight: 1.5 }}>Sahara is built for seniors, their families, and dedicated care workers. Pick what describes you best.</p>
              {[{ icon: 'ti-user', title: 'Senior / Elder', desc: 'Get care, AI companionship, health tracking' }, { icon: 'ti-users', title: 'Family Member', desc: 'Monitor and stay connected with your parent' }, { icon: 'ti-stethoscope', title: 'Care Worker', desc: 'Find jobs, build ratings, earn regularly' }].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${r.icon}`} style={{ fontSize: 15, color: '#1D9E75' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2540', margin: 0 }}>{r.title}</p>
                    <p style={{ fontSize: 10, color: '#7A96B0', margin: 0 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'white', padding: '48px 40px', minHeight: 'calc(100vh - 61px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <button type="button" onClick={() => setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1D9E75', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back
            </button>
            <Step2 onNext={handleStep2} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="register-grid">
          <div className="register-hero-col"><Step3HeroPanel role={role} /></div>
          <div style={{ background: 'white', padding: '48px 40px', minHeight: 'calc(100vh - 61px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <button type="button" onClick={() => setStep(2)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1D9E75', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back
            </button>
            <Step3 role={role} phone={phone} uid={uid} onSuccess={handleRegistered} />
          </div>
        </div>
      )}

      <style>{`
        .register-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: calc(100vh - 61px); }
        .register-hero-col { display: block; }
        @media (max-width: 767px) {
          .register-grid { grid-template-columns: 1fr; }
          .register-hero-col { display: none; }
          .register-grid > div:last-child { padding: 24px 20px !important; min-height: unset !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .register-grid { grid-template-columns: 45% 55%; }
          .register-grid > div { padding: 32px !important; }
        }
      `}</style>
    </div>
  )
}

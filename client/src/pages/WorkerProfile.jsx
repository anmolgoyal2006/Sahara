import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import WorkerLayout from '../components/layout/WorkerLayout'
import SkillsSelector, { SKILLS, LANGUAGES } from '../components/worker/SkillsSelector'

function FieldInput({ id, label, placeholder, value, onChange, error, halfWidth, hint }) {
  const [focused, setFocused] = useState(false)
  const valid = !error && value?.length >= 1
  return (
    <div style={{ width: halfWidth ? 180 : '100%' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type="text" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', height: 48,
            border: `1.5px solid ${error ? '#E24B4A' : focused || valid ? '#1D9E75' : '#DDE8F5'}`,
            borderRadius: 10, fontSize: 14, color: '#0A2540', padding: '0 40px 0 14px',
            background: error ? '#FFF0F0' : 'white', outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {valid && !error && <i className="ti ti-circle-check" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#1D9E75' }} />}
      </div>
      {hint && <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 4 }}>{hint}</p>}
      {error && <p role="alert" style={{ fontSize: 11, color: '#E24B4A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }} />{error}</p>}
    </div>
  )
}

export default function WorkerProfile() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)

  const [userId, setUserId]       = useState(null)
  const [workerUser, setWorkerUser] = useState(null)
  const [worker, setWorker]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const [saveError, setSaveError] = useState('')

  // Editable fields
  const [photoUrl, setPhotoUrl]       = useState('')
  const [skills, setSkills]           = useState([])
  const [langs, setLangs]             = useState([])
  const [experience, setExperience]   = useState('')
  const [aadhaar, setAadhaar]         = useState('')
  const [area, setArea]               = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [errors, setErrors]           = useState({})

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const res = await fetch(`${API_URL}/api/worker/profile/${uid}`)
      const data = await res.json()
      if (data.success) {
        setWorkerUser(data.user)
        setWorker(data.worker)
        setPhotoUrl(data.worker?.photo_url || '')
        setSkills(data.worker?.skills || [])
        setLangs(data.worker?.languages || [])
        setExperience(String(data.worker?.experience_years ?? ''))
        // Mask aadhaar if already saved
        const saved = data.worker?.aadhaar_number || ''
        setAadhaar(saved ? saved.replace(/(\d{4})(?=\d)/g, '$1 ') : '')
        setArea(data.worker?.area || '')
        setIsAvailable(data.worker?.available ?? true)
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleAadhaar(val) {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    setAadhaar(digits.replace(/(\d{4})(?=\d)/g, '$1 '))
    if (errors.aadhaar) setErrors(e => ({ ...e, aadhaar: '' }))
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhotoUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function toggleAvailability() {
    const next = !isAvailable
    setIsAvailable(next)
    await fetch(`${API_URL}/api/worker/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: next }),
    }).catch(() => {})
  }

  function validate() {
    const errs = {}
    if (skills.length === 0) errs.skills = 'Please select at least 1 skill'
    if (langs.length === 0) errs.langs = 'Please select at least 1 language'
    const exp = Number(experience)
    if (experience === '' || isNaN(exp) || exp < 0 || exp > 50) errs.experience = 'Enter years of experience (0–50)'
    const digits = aadhaar.replace(/\s/g, '')
    if (digits.length > 0 && digits.length !== 12) errs.aadhaar = 'Aadhaar must be exactly 12 digits'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true); setSaveError('')
    try {
      const res = await fetch(`${API_URL}/api/worker/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills,
          languages: langs,
          experience_years: Number(experience),
          aadhaar_number: aadhaar.replace(/\s/g, '') || undefined,
          photo_url: photoUrl || undefined,
          area,
          available: isAvailable,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      showToast('Profile updated!')
    } catch (e) {
      setSaveError('Could not save profile. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexDirection: 'column' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const initials = workerUser?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'W'

  return (
    <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Section 1 — Photo + Basic info */}
        <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 24, marginBottom: 20 }}>

          {/* Photo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: '#F0FBF7', border: '3px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photoUrl
                  ? <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 32, fontWeight: 800, color: '#1D9E75' }}>{initials}</span>
                }
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                <i className="ti ti-camera" style={{ fontSize: 13, color: 'white' }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2540', marginBottom: 4 }}>{workerUser?.name}</p>
              <p style={{ fontSize: 12, color: '#1D9E75', cursor: 'pointer', fontWeight: 600 }} onClick={() => fileRef.current?.click()}>Change Photo</p>
              <p style={{ fontSize: 11, color: '#A0B8D0', marginTop: 2 }}>To change name, contact support</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
          </div>

          {/* Verification status */}
          {worker?.verified ? (
            <div style={{ background: '#F0FBF7', border: '1.5px solid #9FE1CB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 20, color: '#166534' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56', marginBottom: 2 }}>Profile Verified ✓</p>
                <p style={{ fontSize: 12, color: '#5A7A9A' }}>You can receive bookings from elders near you</p>
              </div>
            </div>
          ) : (
            <div style={{ background: '#FAEEDA', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-clock" style={{ fontSize: 20, color: '#BA7517' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#BA7517', marginBottom: 2 }}>Verification Pending</p>
                <p style={{ fontSize: 12, color: '#92400E' }}>We verify all workers within 24 hours. You'll be notified when approved.</p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2 — Editable details */}
        <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 20 }}>Profile Details</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <SkillsSelector label="SKILLS" options={SKILLS} selected={skills}
              onChange={v => { setSkills(v); if (errors.skills) setErrors(e => ({ ...e, skills: '' })) }}
              error={errors.skills} />

            <SkillsSelector label="LANGUAGES YOU SPEAK" options={LANGUAGES} selected={langs}
              onChange={v => { setLangs(v); if (errors.langs) setErrors(e => ({ ...e, langs: '' })) }}
              error={errors.langs} />

            <FieldInput id="exp" label="YEARS OF EXPERIENCE" placeholder="e.g. 5" value={experience}
              onChange={v => { setExperience(v.replace(/\D/g, '')); if (errors.experience) setErrors(e => ({ ...e, experience: '' })) }}
              error={errors.experience} halfWidth />

            <div>
              <label htmlFor="aadhaar" style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>AADHAAR NUMBER</label>
              <input
                id="aadhaar" type="tel" value={aadhaar} placeholder="XXXX XXXX XXXX"
                onChange={e => handleAadhaar(e.target.value)}
                style={{ width: '100%', height: 48, border: `1.5px solid ${errors.aadhaar ? '#E24B4A' : '#DDE8F5'}`, borderRadius: 10, fontSize: 16, letterSpacing: 2, color: '#0A2540', padding: '0 14px', background: errors.aadhaar ? '#FFF0F0' : 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 4 }}>Verified by Sahara team</p>
              {errors.aadhaar && <p role="alert" style={{ fontSize: 11, color: '#E24B4A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }} />{errors.aadhaar}</p>}
            </div>

            <FieldInput id="area" label="YOUR CITY / AREA" placeholder="e.g. Chandigarh, Sector 22" value={area}
              onChange={setArea} hint="Which city/area do you work in?" />

            {/* Availability toggle */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>AVAILABILITY</p>
              <div
                onClick={toggleAvailability}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${isAvailable ? '#9FE1CB' : '#DDE8F5'}`, background: isAvailable ? '#F0FBF7' : '#F7F8FA', cursor: 'pointer' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: isAvailable ? '#1D9E75' : '#A0B8D0', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isAvailable ? '#0F6E56' : '#5A7A9A', marginBottom: 2 }}>
                    {isAvailable ? 'I am available for bookings' : 'I am not available today'}
                  </p>
                  <p style={{ fontSize: 11, color: '#A0B8D0' }}>{isAvailable ? 'Elders can book you right now' : 'You won\'t receive new bookings'}</p>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: isAvailable ? '#1D9E75' : '#DDE8F5', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: isAvailable ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <p role="alert" style={{ fontSize: 12, color: '#E24B4A', marginTop: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />{saveError}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: saving ? '#9FE1CB' : '#1D9E75', color: 'white', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <i className="ti ti-device-floppy" style={{ fontSize: 18 }} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          <i className="ti ti-circle-check" style={{ marginRight: 8 }} />{toast}
        </div>
      )}
    </WorkerLayout>
  )
}

import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const HOW_TO_STEPS = [
  'Ask your parent to open Sahara on their phone',
  'They tap their name at the top of the home screen',
  'They share the 4-word Sahara Code with you',
  'Enter that code here to connect',
]

export default function LinkElderCard({ familyUserId, onLinked }) {
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [linked,  setLinked]  = useState(null)
  const [focused, setFocused] = useState(false)

  // The code is the elder's Supabase UUID — 36 chars with dashes
  // But we also accept the short display version if we add that later.
  // For now just require non-empty.
  const isValid = code.trim().length >= 10

  function handleChange(e) {
    setCode(e.target.value)
    if (error) setError(null)
  }

  async function handleSubmit() {
    if (!isValid) {
      setError('Please enter a valid Sahara Code')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/family/link-elder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_user_id: familyUserId,
          elder_code: code.trim(),
        }),
      })
      const data = await res.json()

      if (data.success) {
        setLinked(data.elder)
        setTimeout(() => onLinked(), 2000)
      } else {
        setError(data.error || 'Could not link account. Please check the code and try again.')
      }
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (linked) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #9FE1CB',
        borderRadius: 20, padding: '32px 24px',
        textAlign: 'center', fontFamily: 'Noto Sans, sans-serif',
      }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FBF7', border: '2px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#1D9E75' }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#1D9E75', margin: '0 0 8px' }}>
          Linked to {linked.name}!
        </p>
        <p style={{ fontSize: 14, color: '#5A7A9A', margin: 0, lineHeight: 1.6 }}>
          You can now monitor their health, bookings, and receive emergency alerts.
        </p>
      </div>
    )
  }

  // ── Default state ────────────────────────────────────────────────────────
  const borderColor = error ? '#E24B4A' : focused ? '#1D9E75' : '#DDE8F5'

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 20, padding: '32px 24px',
      textAlign: 'center', fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Icon */}
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EBF4FF', border: '1.5px solid #DDE8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <i className="ti ti-users" style={{ fontSize: 36, color: '#185FA5' }} />
      </div>

      {/* Heading */}
      <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: '0 0 10px' }}>
        Link to Your Parent
      </p>
      <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px', lineHeight: 1.6 }}>
        Enter the <strong>Sahara Code</strong> from your parent's Sahara app to connect with their account.
      </p>

      {/* Code input */}
      <div style={{ textAlign: 'left', marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Sahara Code
        </label>
        <input
          type="text"
          value={code}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={loading}
          placeholder="Paste your parent's Sahara Code"
          aria-label="Sahara Code"
          style={{
            width: '100%', height: 52, borderRadius: 10,
            border: `1.5px solid ${borderColor}`,
            fontSize: 14, color: '#0A2540', padding: '0 14px',
            background: 'white', outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
            boxShadow: focused && !error ? '0 0 0 3px rgba(29,158,117,0.12)' : error ? '0 0 0 3px rgba(226,75,74,0.12)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />

        {error ? (
          <p style={{ fontSize: 12, color: '#E24B4A', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />
            {error}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: '#A0B8D0', margin: '5px 0 0' }}>
            Ask your parent to share their Sahara Code from the home screen
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !isValid}
        style={{
          width: '100%', height: 52, borderRadius: 12,
          border: 'none',
          background: loading || !isValid ? '#A0B8D0' : '#1D9E75',
          color: 'white', fontSize: 16, fontWeight: 700,
          cursor: loading || !isValid ? 'not-allowed' : 'pointer',
          fontFamily: 'Noto Sans, sans-serif',
          transition: 'background 0.15s',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'linkSpin 0.7s linear infinite' }} />
            Searching...
          </span>
        ) : 'Link Account'}
      </button>

      {/* How-to steps */}
      <div style={{
        marginTop: 28, background: '#F8FAFD',
        border: '1px solid #EEF4FB', borderRadius: 12,
        padding: '16px 18px', textAlign: 'left',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#5A7A9A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          How to get the Sahara Code
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HOW_TO_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EBF4FF', border: '1px solid #DDE8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#185FA5' }}>{i + 1}</span>
              </div>
              <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes linkSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

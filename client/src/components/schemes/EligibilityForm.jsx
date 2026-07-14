/**
 * EligibilityForm — Phase 14C (fixed: fully controlled state)
 * All radio groups are controlled via useState so selections
 * visually update on click. No uncontrolled inputs.
 */
import { useState } from 'react'
import { useSchemeStates } from '../../hooks/useSchemes'

const fieldStyle = {
  width: '100%', height: 44, borderRadius: 10,
  border: '1.5px solid #DDE8F5', fontSize: 15,
  padding: '0 12px', fontFamily: 'Noto Sans, sans-serif',
  color: '#0A2540', background: 'white', boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  fontSize: 13, fontWeight: 700, color: '#5A7A9A',
  marginBottom: 6, display: 'block',
}

function RadioGroup ({ name, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(([val, label]) => {
        const active = value === val
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            style={{
              flex: 1, minHeight: 40, borderRadius: 10,
              border: `1.5px solid ${active ? '#185FA5' : '#DDE8F5'}`,
              background: active ? '#EBF4FF' : 'white',
              color: active ? '#185FA5' : '#5A7A9A',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', padding: '8px 4px',
              fontFamily: 'Noto Sans, sans-serif',
              transition: 'all 0.15s',
              lineHeight: 1.3,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function EligibilityForm ({ onSubmit, loading }) {
  const states = useSchemeStates()

  const [age,     setAge]     = useState('')
  const [gender,  setGender]  = useState('')
  const [state,   setState]   = useState('')
  const [bpl,     setBpl]     = useState('')
  const [aadhaar, setAadhaar] = useState('')
  const [bank,    setBank]    = useState('')
  const [income,  setIncome]  = useState('')

  function handleSubmit (e) {
    e.preventDefault()
    onSubmit({
      age:              age     ? parseInt(age)     : null,
      gender:           gender  || null,
      state:            state   || null,
      bpl:              bpl     === 'yes' ? true  : bpl     === 'no' ? false : null,
      has_aadhaar:      aadhaar === 'yes' ? true  : aadhaar === 'no' ? false : null,
      has_bank_account: bank    === 'yes' ? true  : bank    === 'no' ? false : null,
      monthly_income:   income  ? parseInt(income) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Age */}
      <div>
        <label style={labelStyle}>Your age</label>
        <input
          type="number" min="0" max="120"
          placeholder="e.g. 65"
          value={age}
          onChange={e => setAge(e.target.value)}
          style={fieldStyle}
        />
      </div>

      {/* Gender */}
      <div>
        <label style={labelStyle}>Gender</label>
        <RadioGroup
          name="gender"
          options={[['male','Male'],['female','Female'],['other','Other']]}
          value={gender}
          onChange={setGender}
        />
      </div>

      {/* State */}
      <div>
        <label style={labelStyle}>State / UT</label>
        <select
          value={state}
          onChange={e => setState(e.target.value)}
          style={{ ...fieldStyle, appearance: 'none', WebkitAppearance: 'none' }}
        >
          <option value="">Select state (optional)</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* BPL */}
      <div>
        <label style={labelStyle}>BPL (Below Poverty Line) card?</label>
        <RadioGroup
          name="bpl"
          options={[['yes','Yes, I have BPL'],['no','No'],['unknown','Not sure']]}
          value={bpl}
          onChange={setBpl}
        />
      </div>

      {/* Aadhaar */}
      <div>
        <label style={labelStyle}>Do you have Aadhaar?</label>
        <RadioGroup
          name="aadhaar"
          options={[['yes','Yes'],['no','No'],['unknown','Not sure']]}
          value={aadhaar}
          onChange={setAadhaar}
        />
      </div>

      {/* Bank account */}
      <div>
        <label style={labelStyle}>Do you have a bank account?</label>
        <RadioGroup
          name="bank"
          options={[['yes','Yes'],['no','No'],['unknown','Not sure']]}
          value={bank}
          onChange={setBank}
        />
      </div>

      {/* Monthly income */}
      <div>
        <label style={labelStyle}>Monthly income (₹) — optional</label>
        <input
          type="number" min="0"
          placeholder="Leave blank if unknown"
          value={income}
          onChange={e => setIncome(e.target.value)}
          style={fieldStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          height: 52, borderRadius: 14, border: 'none',
          background: loading ? '#A0C8F0' : '#185FA5',
          color: 'white', fontSize: 16, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Noto Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 18, height: 18,
              border: '2px solid rgba(255,255,255,0.4)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            Checking schemes…
          </>
        ) : (
          <><i className="ti ti-search" />Check My Eligibility</>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </form>
  )
}

import { useState } from 'react'

export default function PhoneInput({ value, onChange, disabled, error, onSubmit }) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? '#E24B4A'
    : focused
    ? '#1D9E75'
    : '#DDE8F5'

  const shadowStyle = focused && !error
    ? '0 0 0 3px rgba(29,158,117,0.12)'
    : error
    ? '0 0 0 3px rgba(226,75,74,0.12)'
    : 'none'

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) onSubmit()
  }

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    onChange(raw)
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 10,
          overflow: 'hidden',
          background: disabled ? '#F7FBFF' : 'white',
          boxShadow: shadowStyle,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          height: 52,
        }}
      >
        {/* Flag + code box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 12px',
            background: '#EBF4FF',
            borderRight: `1.5px solid ${borderColor}`,
            height: '100%',
            flexShrink: 0,
            transition: 'border-color 0.15s',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>🇮🇳</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#185FA5', letterSpacing: 0.3 }}>+91</span>
        </div>

        {/* Input */}
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Enter 10-digit number"
          aria-label="Phone number"
          style={{
            flex: 1,
            height: '100%',
            padding: '0 14px',
            fontSize: 15,
            color: '#0A2540',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            letterSpacing: 0.5,
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          style={{
            fontSize: 11,
            color: '#E24B4A',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
          {error}
        </p>
      )}

      {/* Hint */}
      {!error && (
        <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 5 }}>
          Enter your 10-digit Indian mobile number
        </p>
      )}
    </div>
  )
}

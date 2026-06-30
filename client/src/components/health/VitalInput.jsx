import { useState } from 'react'

export default function VitalInput({
  label, unit, value, onChange,
  placeholder, icon, iconColor,
  min, max, step = 1, type = 'number'
}) {
  const [focused, setFocused] = useState(false)

  // Light tint for the icon background
  const tintMap = {
    '#E24B4A': '#FDECEA',
    '#BA7517': '#FEF3DC',
    '#185FA5': '#E0EEFF',
  }
  const iconBg = tintMap[iconColor] || '#F0FBF7'

  function adjust(delta) {
    const current = parseFloat(value) || 0
    const next = Math.round((current + delta) * 100) / 100
    if (min !== undefined && next < min) return
    if (max !== undefined && next > max) return
    onChange(String(next))
  }

  return (
    <div style={{
      background: 'white',
      border: `1.5px solid ${focused ? '#1D9E75' : '#DDE8F5'}`,
      borderRadius: 16,
      padding: 16,
      transition: 'border-color 0.15s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 17, color: iconColor }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          style={{
            flex: 1,
            fontSize: 32,
            fontWeight: 700,
            color: '#0A2540',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: 14, color: '#A0B8D0', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {unit}
        </span>
        {/* Minus */}
        <button
          onClick={() => adjust(-(step))}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1.5px solid #DDE8F5', background: 'white',
            fontSize: 18, fontWeight: 700, color: '#5A7A9A',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontFamily: 'inherit', lineHeight: 1,
          }}
          type="button"
        >−</button>
        {/* Plus */}
        <button
          onClick={() => adjust(step)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1.5px solid #DDE8F5', background: 'white',
            fontSize: 18, fontWeight: 700, color: '#5A7A9A',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontFamily: 'inherit', lineHeight: 1,
          }}
          type="button"
        >+</button>
      </div>
    </div>
  )
}

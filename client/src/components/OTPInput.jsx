import { useRef, useEffect } from 'react'

export default function OTPInput({ value, onChange, disabled, hasError }) {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  // Focus first input on mount
  useEffect(() => {
    if (refs[0].current) refs[0].current.focus()
  }, [])

  const handleChange = (index, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const newVal = [...value]
    newVal[index] = digit
    onChange(newVal)
    if (digit && index < 5) {
      refs[index + 1].current.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        const newVal = [...value]
        newVal[index] = ''
        onChange(newVal)
      } else if (index > 0) {
        refs[index - 1].current.focus()
        const newVal = [...value]
        newVal[index - 1] = ''
        onChange(newVal)
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      onChange(text.split(''))
      refs[5].current.focus()
    }
  }

  const borderColor = hasError ? '#E24B4A' : '#DDE8F5'

  return (
    <div
      className={hasError ? 'shake' : ''}
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 8,
      }}
      onPaste={handlePaste}
    >
      {value.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          style={{
            width: 46,
            height: 54,
            border: `2px solid ${digit ? '#1D9E75' : borderColor}`,
            borderRadius: 10,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#0A2540',
            background: hasError ? '#FFF0F0' : digit ? '#F0FBF7' : 'white',
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
            fontFamily: 'inherit',
            flex: '1 1 0',
            maxWidth: 54,
          }}
        />
      ))}
    </div>
  )
}

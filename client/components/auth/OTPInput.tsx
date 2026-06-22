'use client'

import React, { useRef, useEffect } from 'react'

interface OTPInputProps {
  value: string[]
  onChange: (val: string[]) => void
  disabled?: boolean
  error?: boolean
}

export default function OTPInput({
  value,
  onChange,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first box on mount
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  // Shake effect
  useEffect(() => {
    if (error) {
      const container = document.getElementById('otp-container')
      if (container) {
        container.classList.remove('otp-shake')
        // Force reflow
        void container.offsetWidth
        container.classList.add('otp-shake')
      }
    }
  }, [error])

  const handleChange = (index: number, inputVal: string) => {
    // Only allow numeric
    const digit = inputVal.replace(/\D/g, '').slice(-1)
    const newVal = [...value]
    newVal[index] = digit
    onChange(newVal)

    // Auto-advance
    if (digit && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        // Clear current
        const newVal = [...value]
        newVal[index] = ''
        onChange(newVal)
      } else if (index > 0) {
        // Move to previous
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      onChange(pasted.split(''))
      refs.current[5]?.focus()
    }
  }

  const getBoxStyle = (index: number, focused: boolean): React.CSSProperties => {
    const filled = !!value[index]
    const borderColor = error
      ? '#E24B4A'
      : filled || focused
      ? '#1D9E75'
      : '#E5E7EB'
    const bg = error ? '#FFF0F0' : filled ? '#F0FBF7' : 'white'
    const boxShadow =
      focused && !error ? '0 0 0 3px #E1F5EE' : undefined

    return {
      width: 'calc((100% - 40px) / 6)',
      minWidth: '44px',
      maxWidth: '52px',
      height: '64px',
      border: `2px solid ${borderColor}`,
      borderRadius: '10px',
      fontSize: '24px',
      fontWeight: '700',
      color: error ? '#E24B4A' : filled ? '#1D9E75' : '#111111',
      textAlign: 'center',
      backgroundColor: bg,
      boxShadow,
      outline: 'none',
      transition: 'border-color 0.15s ease, background-color 0.15s ease',
      fontFamily: 'inherit',
      caretColor: 'transparent',
    }
  }

  return (
    <div
      id="otp-container"
      style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
      onPaste={handlePaste}
      role="group"
      aria-label="6-digit OTP input"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={2}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => {
            // Re-apply focused style
            Object.assign(e.currentTarget.style, getBoxStyle(i, true))
          }}
          onBlur={(e) => {
            Object.assign(e.currentTarget.style, getBoxStyle(i, false))
          }}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          aria-required="true"
          aria-invalid={error}
          style={getBoxStyle(i, false)}
          className="sahara-focus"
        />
      ))}
    </div>
  )
}

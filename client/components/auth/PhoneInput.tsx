'use client'

import React, { useState } from 'react'
import { isValidIndianPhone } from '@/lib/utils/phone'

interface PhoneInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  error?: string
  id?: string
}

export { isValidIndianPhone }

export default function PhoneInput({
  value,
  onChange,
  disabled = false,
  error,
  id = 'phone-input',
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false)
  const hasError = !!error

  const borderColor = hasError
    ? '#E24B4A'
    : focused
    ? '#1D9E75'
    : '#E5E7EB'

  const bgColor = hasError ? '#FFF0F0' : 'white'

  const prefixBorderRight = hasError
    ? '2px solid #E24B4A'
    : focused
    ? '2px solid #1D9E75'
    : '2px solid #E5E7EB'

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '18px',
          fontWeight: '700',
          color: '#333333',
          marginBottom: '8px',
          fontFamily: 'inherit',
        }}
      >
        Mobile number
      </label>

      {/* Input wrapper */}
      <div
        style={{
          display: 'flex',
          height: '72px',
          border: `2px solid ${borderColor}`,
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: bgColor,
          transition: 'border-color 0.15s ease',
        }}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {/* +91 Prefix */}
        <div
          style={{
            width: '80px',
            height: '100%',
            backgroundColor: '#F0FBF7',
            borderRight: prefixBorderRight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'border-color 0.15s ease',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '16px' }}>🇮🇳</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0F6E56',
              fontFamily: 'inherit',
            }}
          >
            +91
          </span>
        </div>

        {/* Number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '')
            onChange(val)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="98765 43210"
          aria-label="Mobile number without country code"
          aria-describedby={`${id}-hint ${id}-error`}
          aria-invalid={hasError}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            outline: 'none',
            fontSize: '20px',
            color: '#111111',
            padding: '0 16px',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Hint */}
      <p
        id={`${id}-hint`}
        style={{
          fontSize: '16px',
          color: '#999999',
          marginTop: '8px',
          marginBottom: '0',
          fontFamily: 'inherit',
        }}
      >
        We will send a 6-digit OTP to this number
      </p>

      {/* Error */}
      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{
            fontSize: '16px',
            color: '#E24B4A',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: '16px' }} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

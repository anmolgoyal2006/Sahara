'use client'

import React from 'react'

interface SaharaButtonProps {
  loading?: boolean
  disabled?: boolean
  loadingText?: string
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'outline'
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
  className?: string
}

export default function SaharaButton({
  loading = false,
  disabled = false,
  loadingText,
  onClick,
  variant = 'primary',
  children,
  type = 'button',
  style,
  className,
}: SaharaButtonProps) {
  const isDisabled = disabled || loading

  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '72px',
    borderRadius: '12px',
    fontSize: '20px',
    fontWeight: '700',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    outline: 'none',
    ...style,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: isDisabled ? '#9FE1CB' : '#1D9E75',
      color: 'white',
    },
    danger: {
      backgroundColor: 'white',
      color: '#E24B4A',
      border: '2px solid #E24B4A',
    },
    outline: {
      backgroundColor: 'white',
      color: '#1D9E75',
      border: '2px solid #1D9E75',
    },
  }

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`sahara-focus ${className ?? ''}`}
      style={{ ...baseStyles, ...variantStyles[variant] }}
      onMouseEnter={(e) => {
        if (!isDisabled && variant === 'primary') {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
            '#0F6E56'
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && variant === 'primary') {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
            '#1D9E75'
        }
      }}
    >
      {loading && <span className="sahara-spinner" aria-hidden="true" />}
      {loading ? (loadingText ?? 'Loading...') : children}
    </button>
  )
}

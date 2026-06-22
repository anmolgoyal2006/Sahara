'use client'

import React from 'react'

interface AuthCardProps {
  children: React.ReactNode
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div
      className="auth-card-wrapper"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: '#F8FAF9',
      }}
    >
      <div
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'white',
          padding: '32px 24px',
        }}
      >
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            <i
              className="ti ti-leaf"
              style={{ fontSize: '28px', color: '#1D9E75' }}
              aria-hidden="true"
            />
            <span
              style={{
                fontSize: '26px',
                fontWeight: '700',
                color: '#1D9E75',
                letterSpacing: '-0.3px',
                fontFamily: 'inherit',
              }}
            >
              Sahara
            </span>
          </div>
          <p
            style={{
              fontSize: '16px',
              color: '#888888',
              marginTop: '4px',
              fontFamily: 'inherit',
            }}
          >
            Aapka Sahara, Hamesha
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}

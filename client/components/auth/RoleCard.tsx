'use client'

import React from 'react'

interface RoleCardProps {
  icon: string
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}

export default function RoleCard({
  icon,
  title,
  description,
  selected,
  onSelect,
}: RoleCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="sahara-focus"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minHeight: '110px',
        width: '100%',
        padding: '16px',
        border: `2px solid ${selected ? '#1D9E75' : '#E5E7EB'}`,
        borderRadius: '14px',
        backgroundColor: selected ? '#F0FBF7' : 'white',
        boxShadow: selected ? '0 0 0 3px #E1F5EE' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: selected ? '#1D9E75' : '#F5F5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.2s ease',
        }}
        aria-hidden="true"
      >
        <i
          className={`ti ti-${icon}`}
          style={{
            fontSize: '24px',
            color: selected ? 'white' : '#888888',
            transition: 'color 0.2s ease',
          }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#111111',
            fontFamily: 'inherit',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: '#666666',
            lineHeight: '1.4',
            marginTop: '4px',
            fontFamily: 'inherit',
          }}
        >
          {description}
        </div>
      </div>

      {/* Radio indicator */}
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: `2.5px solid ${selected ? '#1D9E75' : '#E5E7EB'}`,
          backgroundColor: selected ? '#1D9E75' : 'white',
          boxShadow: selected ? 'inset 0 0 0 4px white' : 'none',
          flexShrink: 0,
          marginLeft: 'auto',
          transition: 'all 0.15s ease',
        }}
        aria-hidden="true"
      />
    </button>
  )
}

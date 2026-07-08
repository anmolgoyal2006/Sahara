/**
 * IncomingCallModal — full-screen overlay shown to elder when a call comes in.
 *
 * Props:
 *   call       — video_calls row (has id, room_url, room_name)
 *   elderName  — elder's display name
 *   onAnswer() — navigate to call page
 *   onDecline() — end the call
 */
import { useEffect } from 'react'

export default function IncomingCallModal({ call, elderName, onAnswer, onDecline }) {
  /* ── Gentle beep ringtone via Web Audio API ────────────────────────────── */
  useEffect(() => {
    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()

        oscillator.connect(gain)
        gain.connect(ctx.destination)

        oscillator.frequency.value = 440
        oscillator.type = 'sine'

        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)

        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.5)

        // Close context after tone finishes to free resources
        setTimeout(() => ctx.close().catch(() => {}), 800)
      } catch (_) {
        // Audio not available or blocked — silent fail
      }
    }

    // Play immediately, then repeat every 1.5s
    playBeep()
    const interval = setInterval(playBeep, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    /* ── Backdrop ── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 37, 64, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Inter, Noto Sans, sans-serif'
      }}
    >
      {/* ── Card ── */}
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '40px 32px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)'
        }}
      >
        {/* ── Pulsing phone icon ── */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#F0FBF7',
            border: '3px solid #1D9E75',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            animation: 'icm-pulse 1.5s ease-in-out infinite'
          }}
        >
          <i className="ti ti-phone-incoming" style={{ fontSize: 36, color: '#1D9E75' }} />
        </div>

        {/* ── Label ── */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1D9E75',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: '20px 0 4px 0'
          }}
        >
          Incoming Video Call
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0A2540', margin: '0 0 4px 0' }}>
          Your Family
        </h2>
        <p style={{ fontSize: 15, color: '#5A7A9A', margin: '0 0 32px 0' }}>
          wants to video call you
        </p>

        {/* ── Action buttons ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            alignItems: 'flex-start'
          }}
        >
          {/* Decline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onDecline}
              aria-label="Decline call"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#FFF0F0',
                border: '2px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <i className="ti ti-phone-off" style={{ fontSize: 28, color: '#E24B4A' }} />
            </button>
            <p style={{ fontSize: 12, color: '#E24B4A', fontWeight: 600, margin: 0 }}>Decline</p>
          </div>

          {/* Answer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onAnswer}
              aria-label="Answer call"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#1D9E75',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                animation: 'icm-pulse 1.5s ease-in-out infinite',
                transition: 'transform 0.15s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <i className="ti ti-phone" style={{ fontSize: 28, color: 'white' }} />
            </button>
            <p style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, margin: 0 }}>Answer</p>
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes icm-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
      `}</style>
    </div>
  )
}

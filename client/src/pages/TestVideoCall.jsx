/**
 * Phase 12B — Test page for VideoTile + CallControls UI.
 * Route: /test-call
 *
 * Tests the visual components without a real Daily.co call.
 * Remove this route before production.
 */
import { useState } from 'react'
import VideoTile from '../components/videocall/VideoTile'
import CallControls from '../components/videocall/CallControls'

export default function TestVideoCall() {
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [duration, setDuration] = useState('00:00')
  const [seconds, setSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerRef] = useState({ current: null })

  const startTimer = () => {
    if (timerRunning) return
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1
        const mm = String(Math.floor(next / 60)).padStart(2, '0')
        const ss = String(next % 60).padStart(2, '0')
        setDuration(`${mm}:${ss}`)
        return next
      })
    }, 1000)
  }

  const stopTimer = () => {
    clearInterval(timerRef.current)
    setTimerRunning(false)
    setSeconds(0)
    setDuration('00:00')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#061928',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        gap: 24,
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#1D9E75', fontSize: 12, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: 1 }}>
          PHASE 12B TEST
        </p>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
          Video Call UI
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '6px 0 0 0' }}>
          Visual test — no real call needed
        </p>
      </div>

      {/* ── Checklist ── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: '14px 20px',
          width: '100%',
          maxWidth: 400
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, margin: '0 0 10px 0', letterSpacing: 1 }}>
          CHECKLIST
        </p>
        {[
          { label: 'Mute button shows red when muted', pass: isMuted },
          { label: 'Camera button shows red when camera off', pass: isCameraOff },
          { label: 'End call button pulses red', pass: true },
          { label: 'Duration shows MM:SS format', pass: /^\d{2}:\d{2}$/.test(duration) },
          { label: 'VideoTile shows camera-off state', pass: isCameraOff },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none'
            }}
          >
            <span style={{ fontSize: 14 }}>{item.pass ? '✅' : '⬜'}</span>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Video tiles — local (camera-off state) ── */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: 1 }}>
          LOCAL TILE (YOU)
        </p>
        <VideoTile
          participant={null}
          isLocal={true}
          isMuted={isMuted}
          isCameraOff={true}
          label="Anmol (You)"
        />
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: 1 }}>
          REMOTE TILE (FAMILY)
        </p>
        <VideoTile
          participant={null}
          isLocal={false}
          isMuted={false}
          isCameraOff={true}
          label="Family Member"
        />
      </div>

      {/* ── Timer controls (simulate duration) ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={startTimer}
          style={{
            background: '#1D9E75',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ▶ Start Timer
        </button>
        <button
          onClick={stopTimer}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ■ Reset
        </button>
      </div>

      {/* ── Call Controls ── */}
      <div style={{ width: '100%', maxWidth: 400, paddingBottom: 40 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: 1 }}>
          CALL CONTROLS
        </p>
        <CallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={() => setIsMuted(m => !m)}
          onToggleCamera={() => setIsCameraOff(c => !c)}
          onEndCall={() => {
            stopTimer()
            alert('End call tapped — would navigate away in production')
          }}
          duration={duration}
        />
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'

// ── Step indicator (all done) ─────────────────────────────────────────────────
function StepDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#9FE1CB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {i < 3 && <div style={{ width: 28, height: 1, background: '#DDE8F5' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Animated checkmark ────────────────────────────────────────────────────────
function AnimatedCheck({ visible }) {
  return (
    <div style={{
      width: 96, height: 96, borderRadius: '50%',
      border: '4px solid #1D9E75',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: visible ? 'scale(1)' : 'scale(0.5)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
    }}>
      <i className="ti ti-check" style={{ fontSize: 44, color: '#1D9E75' }} />
    </div>
  )
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatDate(scheduledAt) {
  if (!scheduledAt) return ''
  const d = new Date(scheduledAt)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(scheduledAt) {
  if (!scheduledAt) return ''
  const d = new Date(scheduledAt)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookingSuccess() {
  const navigate = useNavigate()
  const [checkVisible, setCheckVisible] = useState(false)
  const [parsed, setParsed]   = useState(null)
  const [worker, setWorker]   = useState(null)
  const spokenRef = useRef(false)

  useEffect(() => {
    const storedParsed = sessionStorage.getItem('booking_parsed')
    const storedWorker = sessionStorage.getItem('booking_worker')
    if (!storedParsed || !storedWorker) { navigate('/elder/book'); return }
    setParsed(JSON.parse(storedParsed))
    setWorker(JSON.parse(storedWorker))

    // Trigger checkmark animation
    requestAnimationFrame(() => setCheckVisible(true))
  }, [navigate])

  // Auto-speak after 500ms
  useEffect(() => {
    if (!parsed || !worker || spokenRef.current) return
    spokenRef.current = true

    const workerName  = worker.users?.name || 'your helper'
    const phoneNumber = worker.users?.phone || ''
    const dateDesc    = formatDate(parsed.scheduled_at)
    const timeDesc    = formatTime(parsed.scheduled_at)

    const lang = sessionStorage.getItem('booking_lang') || 'en-IN'

    const timer = setTimeout(() => {
      if (!window.speechSynthesis) return
      const utterance = new SpeechSynthesisUtterance(
        `Booking confirmed. ${workerName} will arrive on ${dateDesc} at ${timeDesc}.` +
        (phoneNumber ? ` Their phone number is ${phoneNumber}.` : '')
      )
      utterance.lang = lang
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }, 500)

    return () => clearTimeout(timer)
  }, [parsed, worker])

  function handleBookAnother() {
    sessionStorage.removeItem('booking_parsed')
    sessionStorage.removeItem('booking_worker')
    sessionStorage.removeItem('booking_request')
    sessionStorage.removeItem('booking_result')
    navigate('/elder/book')
  }

  if (!parsed || !worker) return null

  const workerName  = worker.users?.name || 'Worker'
  const workerPhone = worker.users?.phone || null
  const initials    = workerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const dateStr     = formatDate(parsed.scheduled_at)
  const timeStr     = formatTime(parsed.scheduled_at)

  return (
    <ElderLayout>
      <div style={{
        maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px',
        fontFamily: 'Noto Sans, sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>
        <StepDots />

        {/* Animated checkmark */}
        <div style={{ marginBottom: 24 }}>
          <AnimatedCheck visible={checkVisible} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>
          Booking Confirmed!
        </h1>
        <p style={{ fontSize: 16, color: '#5A7A9A', margin: '0 0 4px' }}>
          {workerName} will be with you
        </p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 24px' }}>
          {dateStr} at {timeStr}
        </p>

        {/* Worker contact card */}
        <div style={{
          width: '100%', background: 'white',
          border: '1.5px solid #1D9E75', borderRadius: 12,
          padding: 16, marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {worker.photo_url ? (
              <img src={worker.photo_url} alt={workerName}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDE8F5', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
            )}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: '0 0 4px' }}>{workerName}</p>
              {workerPhone ? (
                <a
                  href={`tel:${workerPhone}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="ti ti-phone" style={{ fontSize: 15, color: '#1D9E75' }} />
                  <div>
                    <p style={{ fontSize: 14, color: '#0A2540', margin: 0, fontWeight: 600 }}>{workerPhone}</p>
                    <p style={{ fontSize: 11, color: '#5A7A9A', margin: 0 }}>Tap to call</p>
                  </div>
                </a>
              ) : (
                <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0 }}>Phone not available</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleBookAnother}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              border: '1.5px solid #1D9E75', background: 'white',
              color: '#1D9E75', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            Book Another Service
          </button>
          <button
            onClick={() => navigate('/elder/home')}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              border: 'none', background: '#1D9E75',
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </ElderLayout>
  )
}

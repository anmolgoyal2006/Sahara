import { useState, useEffect, useRef } from 'react'
import { speakWithElevenLabs } from '../../lib/voiceService'

const LANG_MAP = { hi: 'hi-IN', en: 'en-IN', pa: 'hi-IN' }

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: 'Good Morning',   icon: 'ti-sun',        color: '#F59E0B' }
  if (h >= 12 && h < 17) return { text: 'Good Afternoon', icon: 'ti-sun-high',   color: '#EAB308' }
  if (h >= 17 && h < 21) return { text: 'Good Evening',   icon: 'ti-moon',       color: '#93C5FD' }
  return                         { text: 'Good Night',     icon: 'ti-moon-stars', color: '#A78BFA' }
}

function getFormattedDate(language) {
  const now = new Date()
  if (language === 'hi') {
    return now.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  return now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GreetingCard({ user, profile, userId }) {
  const hasSpoken = useRef(false)

  const greeting   = getTimeGreeting()
  const conditions = profile?.conditions || []
  const language   = user?.language || 'hi'
  const name       = user?.name || ''

  const [copied, setCopied] = useState(false)

  function handleCopyCode() {
    if (!userId) return
    navigator.clipboard.writeText(userId).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = userId
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!name || hasSpoken.current) return
    hasSpoken.current = true
    const timer = setTimeout(() => {
      if (language === 'hi') {
        speakWithElevenLabs(`Namaste ${name} ji. Aapka sahara yahan hai. Aaj aap kaisa mehsoos kar rahe hain?`, LANG_MAP[language])
      } else if (language === 'pa') {
        speakWithElevenLabs(`Sat Sri Akal ${name} ji. Sahara te jee aayan nu.`, LANG_MAP[language])
      } else {
        speakWithElevenLabs(`Namaste ${name} ji. Welcome to Sahara. How are you feeling today?`, LANG_MAP[language])
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [name, language])

  function handleSpeak() {
    if (language === 'hi') {
      speakWithElevenLabs(`Namaste ${name} ji. Aapka sahara yahan hai.`, LANG_MAP[language])
    } else {
      speakWithElevenLabs(`Namaste ${name} ji. Welcome to Sahara.`, LANG_MAP[language])
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)',
      borderRadius: 16, marginBottom: 24, padding: '28px',
      color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      {/* LEFT */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <i className={`ti ${greeting.icon}`} style={{ fontSize: 16, color: greeting.color }} />
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>{greeting.text}</span>
        </div>

        <p style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Namaste, {name} ji!
        </p>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 }}>
          {getFormattedDate(language)}
        </p>

        {conditions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {conditions.slice(0, 3).map((c, i) => (
              <span key={i} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', fontSize: 11, color: 'white' }}>{c}</span>
            ))}
            {conditions.length > 3 && (
              <span style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', fontSize: 11, color: 'white' }}>+{conditions.length - 3} more</span>
            )}
          </div>
        )}

        <button
          onClick={handleSpeak}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 20, padding: '6px 14px', color: 'white',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-volume" style={{ fontSize: 13 }} />
          Speak greeting
        </button>

        {/* Sahara Code — for linking family members */}
        {userId && (
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Your Sahara Code
              </p>
              <p style={{
                fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)',
                fontWeight: 700, margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 200,
              }}>
                {userId}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              title="Copy Sahara Code to share with family"
              style={{
                height: 28, padding: '0 10px', borderRadius: 8, flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.4)',
                background: copied ? 'rgba(29,158,117,0.5)' : 'rgba(255,255,255,0.15)',
                color: 'white', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 0.2s',
              }}
            >
              <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 12 }} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — decorative, desktop only */}
      <div className="greeting-deco" style={{
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginLeft: 24,
      }}>
        <img src="/logo.jpeg" alt="Sahara Logo" style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover' }} />
      </div>

      <style>{`@media (max-width: 767px) { .greeting-deco { display: none !important; } }`}</style>
    </div>
  )
}

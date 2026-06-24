import { useEffect, useRef } from 'react'
import { useSpeech } from '../../hooks/useSpeech'

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

export default function GreetingCard({ user, profile }) {
  const { speak } = useSpeech()
  const hasSpoken = useRef(false)

  const greeting   = getTimeGreeting()
  const conditions = profile?.conditions || []
  const language   = user?.language || 'hi'
  const name       = user?.name || ''

  useEffect(() => {
    if (!name || hasSpoken.current) return
    hasSpoken.current = true
    const timer = setTimeout(() => {
      if (language === 'hi') {
        speak(`Namaste ${name} ji. Aapka sahara yahan hai. Aaj aap kaisa mehsoos kar rahe hain?`, 'hi-IN')
      } else if (language === 'pa') {
        speak(`Sat Sri Akal ${name} ji. Sahara te jee aayan nu.`, 'pa-IN')
      } else {
        speak(`Namaste ${name} ji. Welcome to Sahara. How are you feeling today?`, 'en-IN')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [name, language, speak])

  function handleSpeak() {
    if (language === 'hi') {
      speak(`Namaste ${name} ji. Aapka sahara yahan hai.`, 'hi-IN')
    } else {
      speak(`Namaste ${name} ji. Welcome to Sahara.`, 'en-IN')
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
      </div>

      {/* RIGHT — decorative, desktop only */}
      <div className="greeting-deco" style={{
        width: 110, height: 110, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginLeft: 24,
      }}>
        <i className="ti ti-leaf" style={{ fontSize: 48, color: 'rgba(255,255,255,0.6)' }} />
      </div>

      <style>{`@media (max-width: 767px) { .greeting-deco { display: none !important; } }`}</style>
    </div>
  )
}

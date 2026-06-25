import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import VoiceInput from '../../components/booking/VoiceInput'
import QuickRequestChips from '../../components/booking/QuickRequestChips'
import { supabase, API_URL } from '../../lib/supabase'

// ── Welcome messages per language ────────────────────────────────────────────
// Punjabi speech uses Hindi romanized text + hi-IN voice — pa-IN has no browser TTS voice
// and reads Gurmukhi letter-by-letter which is unrecognizable. Hindi voice sounds natural
// to Punjabi speakers since the languages are mutually intelligible.
const WELCOME = {
  'hi-IN': {
    text: 'नमस्ते! मैं साहारा हूँ। आपको किस सेवा की जरूरत है? आप बोल सकते हैं, टाइप कर सकते हैं, या नीचे से चुन सकते हैं।',
    lang: 'hi-IN',
  },
  'en-IN': {
    text: 'Hello! I am Sahara. What kind of help do you need today? You can speak, type, or choose from the options below.',
    lang: 'en-IN',
  },
  'pa-IN': {
    // Spoken in Hindi voice — mutually intelligible, clear to Punjabi speakers
    text: 'Sat Sri Akal! Main Sahara haan. Tussi ki seva chahundi ho? Tusi bol sakte ho, type kar sakte ho, ya neeche to chun sakte ho.',
    lang: 'hi-IN',
  },
}

function speak(text, voiceLang) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voiceLang
  u.rate = 0.88
  u.pitch = 1.05
  window.speechSynthesis.speak(u)
}

function speakForLanguage(lang) {
  const entry = WELCOME[lang] || WELCOME['hi-IN']
  speak(entry.text, entry.lang)
}

// ── Service definitions ──────────────────────────────────────────────────────
const SERVICES = [
  { key: 'maid',             icon: 'ti-home',          label: 'Maid',            defaultRequest: 'I need a maid tomorrow morning' },
  { key: 'nurse',            icon: 'ti-stethoscope',   label: 'Nurse',           defaultRequest: 'I need a nurse tomorrow' },
  { key: 'driver',           icon: 'ti-car',           label: 'Driver',          defaultRequest: 'I need a driver tomorrow' },
  { key: 'cook',             icon: 'ti-tools-kitchen', label: 'Cook',            defaultRequest: 'I need a cook tomorrow morning' },
  { key: 'physiotherapist',  icon: 'ti-run',           label: 'Physio',          defaultRequest: 'I need a physiotherapist tomorrow' },
  { key: 'repair',           icon: 'ti-tool',          label: 'Repair',          defaultRequest: 'I need a home repair person' },
]

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: s < step ? '#9FE1CB' : s === step ? '#1D9E75' : '#DDE8F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}>
            {s < step && (
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {i < 3 && <div style={{ width: 28, height: 1, background: '#DDE8F5' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Parsed result preview card ────────────────────────────────────────────────
function ParsedCard({ parsed, onEdit }) {
  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    if (d.getTime() === today.getTime()) return 'Today'
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatTime(timeStr) {
    if (!timeStr) return '—'
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const display = hour % 12 || 12
    return `${display}:${m} ${ampm}`
  }

  const rows = [
    { icon: 'ti-tools', label: 'Service', value: parsed.service_type?.charAt(0).toUpperCase() + parsed.service_type?.slice(1) },
    { icon: 'ti-calendar', label: 'Date', value: formatDate(parsed.date) },
    { icon: 'ti-clock', label: 'Time', value: formatTime(parsed.time) },
    { icon: 'ti-hourglass', label: 'Duration', value: `${Number(parsed.duration_hours) || 2} hour${(Number(parsed.duration_hours) || 2) !== 1 ? 's' : ''}` },
  ]

  return (
    <div style={{
      background: '#F0FBF7', border: '1.5px solid #9FE1CB',
      borderRadius: 14, padding: '16px 18px', marginBottom: 16,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        ✓ AI understood your request
      </p>
      {rows.map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`ti ${row.icon}`} style={{ fontSize: 15, color: '#1D9E75' }} />
            <span style={{ fontSize: 13, color: '#5A7A9A', fontFamily: 'Noto Sans, sans-serif' }}>{row.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2540', fontFamily: 'Noto Sans, sans-serif' }}>{row.value}</span>
            <button
              onClick={() => onEdit(row.label.toLowerCase())}
              style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Noto Sans, sans-serif', textDecoration: 'underline' }}
            >
              Edit
            </button>
          </div>
        </div>
      ))}
      {parsed.urgency === 'urgent' && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-urgent" style={{ fontSize: 14, color: '#BA7517' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#BA7517', fontFamily: 'Noto Sans, sans-serif' }}>Urgent request</span>
        </div>
      )}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ field, parsed, onSave, onClose }) {
  const [val, setVal] = useState(() => {
    if (field === 'service') return parsed.service_type
    if (field === 'date') return parsed.date
    if (field === 'time') return parsed.time
    if (field === 'duration') return String(parsed.duration_hours)
    return ''
  })

  function save() { onSave(field, val); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#0A2540', textTransform: 'capitalize' }}>Edit {field}</h3>

        {field === 'service' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {SERVICES.map(s => (
              <button key={s.key} onClick={() => setVal(s.key)} style={{
                padding: '10px 8px', borderRadius: 10, border: '1.5px solid',
                borderColor: val === s.key ? '#1D9E75' : '#DDE8F5',
                background: val === s.key ? '#F0FBF7' : 'white',
                color: val === s.key ? '#0F6E56' : '#5A7A9A',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
              }}>
                <i className={`ti ${s.icon}`} style={{ marginRight: 6 }} />{s.label}
              </button>
            ))}
          </div>
        )}
        {field === 'date' && (
          <input type="date" value={val} onChange={e => setVal(e.target.value)}
            style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #DDE8F5', padding: '0 12px', fontSize: 15, marginBottom: 20, fontFamily: 'Noto Sans, sans-serif', boxSizing: 'border-box' }} />
        )}
        {field === 'time' && (
          <input type="time" value={val} onChange={e => setVal(e.target.value)}
            style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #DDE8F5', padding: '0 12px', fontSize: 15, marginBottom: 20, fontFamily: 'Noto Sans, sans-serif', boxSizing: 'border-box' }} />
        )}
        {field === 'duration' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1,2,3,4,6,8].map(h => (
              <button key={h} onClick={() => setVal(String(h))} style={{
                flex: 1, height: 40, borderRadius: 8, border: '1.5px solid',
                borderColor: val === String(h) ? '#1D9E75' : '#DDE8F5',
                background: val === String(h) ? '#F0FBF7' : 'white',
                color: val === String(h) ? '#0F6E56' : '#5A7A9A',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
              }}>{h}h</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>Cancel</button>
          <button onClick={save} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#1D9E75', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ElderBook() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselectedService = searchParams.get('service')

  const [request, setRequest] = useState('')
  const [selectedService, setSelectedService] = useState(preselectedService || null)
  const [language, setLanguage] = useState('hi-IN')
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [editField, setEditField] = useState(null)
  const hasSpokenWelcome = useRef(false)

  // Speak welcome on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      speakForLanguage(language)
      hasSpokenWelcome.current = true
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-speak welcome when language is switched
  function handleLanguageChange(lang) {
    setLanguage(lang)
    speakForLanguage(lang)
  }

  // Pre-fill request text from URL service param
  useEffect(() => {
    if (preselectedService) {
      const svc = SERVICES.find(s => s.key === preselectedService)
      if (svc) setRequest(svc.defaultRequest)
    }
  }, [preselectedService])

  function handleServiceTile(svc) {
    if (selectedService === svc.key) {
      // Tap again to deselect
      setSelectedService(null)
      setRequest('')
    } else {
      setSelectedService(svc.key)
      setRequest(svc.defaultRequest)
    }
    setParsed(null)
    setParseError(null)
  }

  function handleTranscript(text) {
    setRequest(text)
    setSelectedService(null) // Clear selected service when user types/speaks
    setParsed(null)
    setParseError(null)
  }

  function handleChipSelect(text) {
    setRequest(text)
    setSelectedService(null) // Clear selected service when user picks a chip
    setParsed(null)
    setParseError(null)
  }

  async function handleParse() {
    // If user just selected a service tile without typing/speaking, create default parsed object
    if (!request.trim() && selectedService) {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      const timeStr = '09:00'
      setParsed({
        service_type: selectedService,
        date: dateStr,
        time: timeStr,
        duration_hours: 2,
        urgency: 'normal',
        confidence: 1,
        scheduled_at: `${dateStr}T${timeStr}:00`,
      })
      return
    }

    if (!request.trim()) return
    setLoading(true)
    setParseError(null)
    setParsed(null)
    try {
      const res = await fetch(`${API_URL}/api/booking/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: request.trim(), language }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      // Normalize — Groq sometimes returns numbers as strings
      const p = data.parsed
      p.duration_hours = parseInt(p.duration_hours) || 2
      p.confidence = parseFloat(p.confidence) || 1
      // If user had a service tile selected, override service_type
      if (selectedService) p.service_type = selectedService
      setParsed(p)
    } catch (e) {
      setParseError('Could not understand. Please try again or describe differently.')
    } finally {
      setLoading(false)
    }
  }

  function handleEditSave(field, value) {
    setParsed(prev => {
      const next = { ...prev }
      if (field === 'service') next.service_type = value
      if (field === 'date') {
        next.date = value
        next.scheduled_at = `${value}T${next.time}:00`
      }
      if (field === 'time') {
        next.time = value
        next.scheduled_at = `${next.date}T${value}:00`
      }
      if (field === 'duration') next.duration_hours = parseInt(value)
      return next
    })
  }

  async function handleContinue() {
    // Store parsed data in sessionStorage for next steps
    sessionStorage.setItem('booking_parsed', JSON.stringify(parsed))
    sessionStorage.setItem('booking_request', request)
    // Cache elder_id now while session is fresh
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) sessionStorage.setItem('booking_elder_id', session.user.id)
    } catch (_) {}
    navigate('/elder/book/workers')
  }

  return (
    <ElderLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        <StepDots step={1} />

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 4px', fontFamily: 'Noto Sans, sans-serif' }}>
          What do you need help with?
        </h1>
        <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px', fontFamily: 'Noto Sans, sans-serif' }}>
          Speak, type or choose below
        </p>

        {/* Service tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {SERVICES.map(svc => {
            const active = selectedService === svc.key
            return (
              <button
                key={svc.key}
                onClick={() => handleServiceTile(svc)}
                style={{
                  height: 72,
                  borderRadius: 12,
                  border: '1.5px solid',
                  borderColor: active ? '#1D9E75' : '#DDE8F5',
                  background: active ? '#F0FBF7' : 'white',
                  color: active ? '#0F6E56' : '#5A7A9A',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`ti ${svc.icon}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{svc.label}</span>
              </button>
            )
          })}
        </div>

        {/* Voice input */}
        <VoiceInput
          onTranscript={handleTranscript}
          language={language}
          onLanguageChange={handleLanguageChange}
          placeholder="Tap the mic and speak, or type your request here..."
        />

        {/* Quick chips */}
        <QuickRequestChips onSelect={handleChipSelect} language={language} />

        {/* Parse button */}
        <button
          onClick={handleParse}
          disabled={!request.trim() && !selectedService || loading}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: (!request.trim() && !selectedService) ? '#DDE8F5' : '#1D9E75',
            color: (!request.trim() && !selectedService) ? '#A0B8D0' : 'white',
            fontSize: 16, fontWeight: 700, cursor: (!request.trim() && !selectedService) ? 'not-allowed' : 'pointer',
            marginTop: 20, fontFamily: 'Noto Sans, sans-serif',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'AI is understanding your request...' : 'Find Helpers →'}
        </button>

        {/* Parse error */}
        {parseError && (
          <p style={{ marginTop: 10, fontSize: 13, color: '#E24B4A', textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>
            {parseError}
          </p>
        )}

        {/* Parsed result card */}
        {parsed && (
          <div style={{ marginTop: 20 }}>
            <ParsedCard parsed={parsed} onEdit={setEditField} />
            <button
              onClick={handleContinue}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: 'none',
                background: '#185FA5', color: 'white',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Continue to Worker Selection →
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editField && (
        <EditModal
          field={editField}
          parsed={parsed}
          onSave={handleEditSave}
          onClose={() => setEditField(null)}
        />
      )}
    </ElderLayout>
  )
}

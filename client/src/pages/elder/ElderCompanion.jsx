import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import ChatBubble from '../../components/companion/ChatBubble'
import TypingIndicator from '../../components/companion/TypingIndicator'
import QuickChips from '../../components/companion/QuickChips'
import ChatInput from '../../components/companion/ChatInput'
import { useElderContext } from '../../hooks/useElderContext'
import { useVoiceInput } from '../../hooks/useVoiceInput'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const LANG_OPTIONS = [{ key: 'hi', label: 'हि' }, { key: 'en', label: 'En' }, { key: 'pa', label: 'ਪੰ' }]
const FONT_SIZES = [14, 16, 18]
const SPEECH_RATES = [{ label: '🐢', value: 0.7 }, { label: 'N', value: 0.9 }, { label: '🐇', value: 1.1 }]

function getLangCode(lang) { return { hi: 'hi-IN', en: 'en-IN', pa: 'hi-IN' }[lang] || 'hi-IN' }

function getDefaultGreeting(name, lang) {
  if (lang === 'pa') return `Sat Sri Akal ${name} ji! Tussi kivaen ho aaj?`
  if (lang === 'en') return `Hello ${name} ji! How are you feeling today?`
  return `Namaste ${name} ji! Aap aaj kaisa mehsoos kar rahe hain?`
}

function speakText(text, lang, rate = 1.0) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang; u.rate = rate; u.pitch = 1.0
  window.speechSynthesis.speak(u)
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({ action, onConfirm, onDismiss }) {
  const configs = {
    BOOK:        { icon: 'ti-calendar-plus',      color: '#1D9E75', bg: '#F0FBF7', title: `Book a ${action.service}?`,    desc: `Sahara understood you need a ${action.service}.`, confirmLabel: 'Yes, Book Now',    confirmColor: '#1D9E75' },
    CALL_FAMILY: { icon: 'ti-phone',              color: '#185FA5', bg: '#EBF4FF', title: 'Call your family?',            desc: 'Open a video call with your family.',            confirmLabel: 'Yes, Call',        confirmColor: '#185FA5' },
    SOS:         { icon: 'ti-urgent',             color: '#E24B4A', bg: '#FFF0F0', title: 'Send Emergency Alert?',        desc: 'This will alert your family immediately.',       confirmLabel: 'Yes, Send Alert',  confirmColor: '#E24B4A' },
    HEALTH_LOG:  { icon: 'ti-heart-rate-monitor', color: '#1D9E75', bg: '#F0FBF7', title: 'Log your health?',             desc: 'Record your health readings now.',               confirmLabel: 'Log Now',          confirmColor: '#1D9E75' },
    MEDICINES:   { icon: 'ti-pill',               color: '#BA7517', bg: '#FAEEDA', title: 'View your medicines?',         desc: 'See your medicine schedule.',                    confirmLabel: 'Yes, View',        confirmColor: '#BA7517' },
  }
  const cfg = configs[action.type]
  if (!cfg) return null
  return (
    <div style={{ margin: '0 16px 12px', background: 'white', border: '2px solid #1D9E75', borderRadius: 14, padding: '16px 20px', boxShadow: '0 4px 16px rgba(29,158,117,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${cfg.icon}`} style={{ fontSize: 20, color: cfg.color }} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0, fontFamily: 'Noto Sans, sans-serif' }}>{cfg.title}</p>
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, fontFamily: 'Noto Sans, sans-serif' }}>{cfg.desc}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onConfirm} style={{ flex: 2, height: 42, borderRadius: 10, border: 'none', background: cfg.confirmColor, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>{cfg.confirmLabel}</button>
        <button onClick={onDismiss} style={{ flex: 1, height: 42, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>Not now</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ElderCompanion() {
  const navigate = useNavigate()
  const { context, userId, loading } = useElderContext()

  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState('hi')
  const [pendingAction, setPendingAction] = useState(null)
  const [voiceToast, setVoiceToast] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [onlineToast, setOnlineToast] = useState(null)
  const [lastFailedMsg, setLastFailedMsg] = useState(null)
  const [retryCountdown, setRetryCountdown] = useState(null)
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('sahara_companion_font_size') || '16'))
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('sahara_speech_rate') || '0.85'))

  const messagesEndRef = useRef(null)
  const hasGreeted = useRef(false)
  const autoSendTimer = useRef(null)
  const retryTimer = useRef(null)

  const { isListening, transcript, error: voiceError, startListening, stopListening, resetTranscript } =
    useVoiceInput(getLangCode(language))

  function changeFontSize(sz) { setFontSize(sz); localStorage.setItem('sahara_companion_font_size', String(sz)) }
  function changeSpeechRate(r) { setSpeechRate(r); localStorage.setItem('sahara_speech_rate', String(r)) }
  function speakMsg(text, lang) { speakText(text, lang, speechRate) }

  // Online/offline
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); setOnlineToast('Connection restored'); setTimeout(() => setOnlineToast(null), 3000) }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  // Save to Supabase (non-critical)
  async function saveMsg(role, content, action) {
    if (!userId) return
    try {
      await fetch(`${API_URL}/api/companion/save-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elder_id: userId, role, content, action: action || null }),
      })
    } catch { /* ignore */ }
  }

  // Load history
  async function loadHistory() {
    if (!userId) return false
    try {
      const res = await fetch(`${API_URL}/api/companion/history/${userId}`)
      const data = await res.json()
      if (data.success && data.messages.length > 0) {
        setMessages(data.messages.map(m => ({ id: m.id, role: m.role, content: m.content, action: m.action, timestamp: new Date(m.created_at) })))
        return true
      }
    } catch { /* fresh */ }
    return false
  }

  // Voice auto-send
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      clearTimeout(autoSendTimer.current)
      autoSendTimer.current = setTimeout(() => { sendMessage(transcript.trim()); resetTranscript() }, 600)
    }
    return () => clearTimeout(autoSendTimer.current)
  }, [isListening]) // eslint-disable-line

  useEffect(() => {
    if (voiceError) { setVoiceToast('Microphone error. Please type instead.'); setTimeout(() => setVoiceToast(null), 3000) }
  }, [voiceError])

  // Init
  useEffect(() => {
    if (!context || !userId || hasGreeted.current) return
    hasGreeted.current = true
    setLanguage(context.language || 'hi')
    async function init() {
      const hadHistory = await loadHistory()
      if (hadHistory) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: context.language === 'en' ? `Welcome back ${context.name} ji!` : `Wapas aaiye ${context.name} ji!`, action: null, timestamp: new Date() }])
        return
      }
      try {
        const res = await fetch(`${API_URL}/api/companion/greeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elder_context: context }) })
        const data = await res.json()
        const text = data.success ? data.greeting : getDefaultGreeting(context.name, context.language)
        addMsg('assistant', text)
        await saveMsg('assistant', text, null)
        setTimeout(() => speakMsg(text, getLangCode(context.language || 'hi')), 600)
      } catch {
        addMsg('assistant', getDefaultGreeting(context.name, context.language || 'hi'))
      }
    }
    init()
  }, [context, userId]) // eslint-disable-line

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  function addMsg(role, content, action = null, isError = false) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content, action, isError, timestamp: new Date() }])
  }

  function startRetryCountdown(secs, onDone) {
    setRetryCountdown(secs)
    let rem = secs
    retryTimer.current = setInterval(() => {
      rem -= 1; setRetryCountdown(rem)
      if (rem <= 0) { clearInterval(retryTimer.current); setRetryCountdown(null); onDone?.() }
    }, 1000)
  }

  const sendMessage = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || isLoading) return
    if (!isOnline) { setVoiceToast('No internet. Check your connection.'); setTimeout(() => setVoiceToast(null), 3000); return }
    setLastFailedMsg(null)
    addMsg('user', trimmed)
    saveMsg('user', trimmed, null)
    setIsTyping(true); setIsLoading(true)
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(`${API_URL}/api/companion/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversation_history: history, elder_context: { ...context, language } }),
      })
      const data = await res.json()
      setIsTyping(false)
      if (data.success) {
        addMsg('assistant', data.response, data.action)
        saveMsg('assistant', data.response, data.action)
        speakMsg(data.response, getLangCode(language))
        if (data.action) setTimeout(() => setPendingAction(data.action), 1000)
      } else {
        addMsg('assistant', 'Sahara is not available right now. Trying again...', null, true)
        startRetryCountdown(5, () => sendMessage(trimmed))
      }
    } catch {
      setIsTyping(false)
      setLastFailedMsg(trimmed)
      addMsg('assistant', 'Connection lost. Check your internet and try again.', null, true)
    } finally { setIsLoading(false); setIsTyping(false) }
  }, [messages, context, language, isLoading, isOnline, userId, speechRate]) // eslint-disable-line

  async function handleClearConfirmed() {
    setShowClearConfirm(false); setMessages([]); hasGreeted.current = false
    clearInterval(retryTimer.current); setRetryCountdown(null)
    try {
      const res = await fetch(`${API_URL}/api/companion/greeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elder_context: context }) })
      const data = await res.json()
      const text = data.success ? data.greeting : getDefaultGreeting(context.name, language)
      setMessages([{ id: Date.now(), role: 'assistant', content: text, action: null, timestamp: new Date() }])
      speakMsg(text, getLangCode(language))
    } catch {
      setMessages([{ id: Date.now(), role: 'assistant', content: getDefaultGreeting(context?.name || 'Friend', language), action: null, timestamp: new Date() }])
    }
  }

  function handleActionConfirm(action) {
    setPendingAction(null)
    if (action.type === 'BOOK') {
      const params = new URLSearchParams()
      if (action.service) params.set('service', action.service)
      if (action.time) params.set('time', action.time)
      if (action.date) params.set('date', action.date)
      if (action.duration) params.set('duration', action.duration)
      navigate(`/elder/book?${params.toString()}`)
    }
    else if (action.type === 'CALL_FAMILY') navigate('/family/dashboard')
    else if (action.type === 'SOS') navigate('/elder/sos')
    else if (action.type === 'HEALTH_LOG') navigate('/elder/health')
    else if (action.type === 'MEDICINES') navigate('/elder/medicines')
  }

  if (loading) {
    return (
      <ElderLayout>
        <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </ElderLayout>
    )
  }

  return (
    <ElderLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 88px)', background: '#EBF4FF', fontFamily: 'Noto Sans, sans-serif', margin: '-20px -16px -88px' }}>

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #EEF4FB', padding: '0 12px', height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigate('/elder/home')} style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #DDE8F5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 15, color: '#5A7A9A' }} />
            </button>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0A2540', margin: 0 }}>AI Companion</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#1D9E75' : '#F59E0B' }} />
                <span style={{ fontSize: 10, color: '#5A7A9A' }}>{isOnline ? 'Online · Sahara AI' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap' }}>
            {/* Font size */}
            {FONT_SIZES.map(sz => (
              <button key={sz} onClick={() => changeFontSize(sz)} style={{ width: 24, height: 24, borderRadius: 6, border: fontSize === sz ? 'none' : '1px solid #DDE8F5', background: fontSize === sz ? '#1D9E75' : 'white', color: fontSize === sz ? 'white' : '#A0B8D0', fontSize: sz - 4, fontWeight: 700, cursor: 'pointer', padding: 0 }}>A</button>
            ))}
            <div style={{ width: 1, height: 18, background: '#EEF4FB', margin: '0 2px' }} />
            {/* Speech rate */}
            {SPEECH_RATES.map(r => (
              <button key={r.value} onClick={() => changeSpeechRate(r.value)} style={{ width: 24, height: 24, borderRadius: 6, border: speechRate === r.value ? 'none' : '1px solid #DDE8F5', background: speechRate === r.value ? '#185FA5' : 'white', color: speechRate === r.value ? 'white' : '#A0B8D0', fontSize: 11, cursor: 'pointer', padding: 0 }}>{r.label}</button>
            ))}
            <div style={{ width: 1, height: 18, background: '#EEF4FB', margin: '0 2px' }} />
            {/* Language */}
            {LANG_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => { setLanguage(opt.key); if (isListening) stopListening() }} style={{ height: 24, padding: '0 8px', borderRadius: 20, border: language === opt.key ? 'none' : '1px solid #DDE8F5', background: language === opt.key ? '#1D9E75' : 'white', color: language === opt.key ? 'white' : '#A0B8D0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{opt.label}</button>
            ))}
            {/* Clear */}
            <button onClick={() => setShowClearConfirm(true)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #DDE8F5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
              <i className="ti ti-trash" style={{ fontSize: 13, color: '#A0B8D0' }} />
            </button>
          </div>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div style={{ background: '#FEF3C7', borderBottom: '1px solid #F5C77A', padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-wifi-off" style={{ fontSize: 14, color: '#BA7517' }} />
            <span style={{ fontSize: 13, color: '#BA7517', fontWeight: 600 }}>No internet connection — Offline mode</span>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0 8px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <i className="ti ti-leaf" style={{ fontSize: 32, color: '#1D9E75' }} />
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>Meet Your AI Companion</p>
              <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 16px', lineHeight: 1.6 }}>I can help you book services, remind you about medicines, and always listen.</p>
              <p style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, margin: '0 0 24px' }}>Tap the microphone to start talking</p>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'emptyPulse 2s infinite' }}>
                <i className="ti ti-microphone" style={{ fontSize: 28, color: 'white' }} />
              </div>
              <style>{`@keyframes emptyPulse { 0%{box-shadow:0 0 0 0 rgba(29,158,117,0.4)} 70%{box-shadow:0 0 0 16px rgba(29,158,117,0)} 100%{box-shadow:0 0 0 0 rgba(29,158,117,0)} }`}</style>
            </div>
          )}

          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              fontSize={fontSize}
              onActionClick={(a) => setPendingAction(a)}
              onReplay={(content) => speakMsg(content, getLangCode(language))}
            />
          ))}

          {retryCountdown !== null && (
            <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: '#5A7A9A' }}>
              Retrying in {retryCountdown}s...
            </div>
          )}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending action */}
        {pendingAction && (
          <ActionCard action={pendingAction} onConfirm={() => handleActionConfirm(pendingAction)} onDismiss={() => setPendingAction(null)} />
        )}

        {/* Retry bar */}
        {lastFailedMsg && !isLoading && (
          <div style={{ padding: '8px 16px', background: 'white', borderTop: '1px solid #EEF4FB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#5A7A9A' }}>Last message failed</span>
            <button onClick={() => { setLastFailedMsg(null); sendMessage(lastFailedMsg) }} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <i className="ti ti-refresh" style={{ fontSize: 12, marginRight: 4 }} />Retry
            </button>
          </div>
        )}

        {/* Quick chips */}
        <QuickChips language={language} onChipSelect={(t) => sendMessage(t)} />

        {/* Chat input */}
        <ChatInput
          onSend={sendMessage}
          onVoiceStart={startListening}
          onVoiceStop={stopListening}
          isListening={isListening}
          isLoading={isLoading || !isOnline}
          transcript={transcript}
          onTranscriptChange={() => {}}
        />

        {/* Toasts */}
        {voiceToast && (
          <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#E24B4A', color: 'white', borderRadius: 24, padding: '10px 20px', fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>{voiceToast}</div>
        )}
        {onlineToast && (
          <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', borderRadius: 24, padding: '10px 20px', fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>{onlineToast}</div>
        )}

        {/* Clear confirm */}
        {showClearConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 24 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>
              <i className="ti ti-trash" style={{ fontSize: 32, color: '#E24B4A', display: 'block', marginBottom: 12 }} />
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0A2540', margin: '0 0 8px' }}>Clear this conversation?</p>
              <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 24px' }}>This cannot be undone</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, height: 44, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleClearConfirmed} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#E24B4A', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Clear</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ElderLayout>
  )
}

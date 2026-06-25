import { useState, useEffect } from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

const LANG_OPTIONS = [
  { label: 'Hindi', code: 'hi-IN' },
  { label: 'English', code: 'en-IN' },
  { label: 'Punjabi', code: 'pa-IN' },
]

export default function VoiceInput({ 
  onTranscript, 
  placeholder = 'Tap the mic and speak your request...',
  language = 'hi-IN',
  onLanguageChange 
}) {
  const { isListening, transcript, error, startListening, stopListening, resetTranscript } =
    useVoiceInput(language)
  const [localText, setLocalText] = useState('')

  // Sync voice transcript into local text
  useEffect(() => {
    if (transcript) setLocalText(transcript)
  }, [transcript])

  // When listening stops and we have text, fire onTranscript
  useEffect(() => {
    if (!isListening && localText.trim()) {
      onTranscript?.(localText.trim())
    }
  }, [isListening, localText, onTranscript])

  function handleMicClick() {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      setLocalText('')
      startListening()
    }
  }

  function handleTextChange(e) {
    setLocalText(e.target.value)
    onTranscript?.(e.target.value)
  }

  function handleLangChange(code) {
    if (isListening) stopListening()
    if (onLanguageChange) {
      onLanguageChange(code)
    }
  }

  return (
    <div style={{
      width: '100%',
      background: '#fff',
      border: '1.5px solid #DDE8F5',
      borderRadius: 14,
      padding: 20,
      boxSizing: 'border-box',
    }}>

      {/* Part 1 — Text display / input area */}
      <div style={{
        minHeight: 80,
        background: error ? '#FFF0F0' : '#F7FBFF',
        border: error ? '2px solid #E24B4A' : '1.5px solid #DDE8F5',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 20,
      }}>
        <textarea
          value={localText}
          onChange={handleTextChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            minHeight: 52,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: 16,
            color: localText ? '#0A2540' : '#A0B8D0',
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Part 2 — Mic button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={handleMicClick}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: isListening ? '#E24B4A' : '#1D9E75',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isListening ? 'pulse 1s infinite' : 'none',
            boxShadow: isListening ? '0 0 0 8px rgba(226,75,74,0.15)' : '0 4px 16px rgba(29,158,117,0.25)',
            transition: 'background 0.2s',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="9" y1="22" x2="15" y2="22" />
          </svg>
        </button>

        <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: isListening ? '#E24B4A' : '#5A7A9A', fontFamily: 'Noto Sans, sans-serif' }}>
          {isListening ? 'Listening...' : 'Tap to speak'}
        </span>
        {isListening && (
          <span style={{ fontSize: 11, color: '#A0B8D0', fontFamily: 'Noto Sans, sans-serif' }}>Tap to stop</span>
        )}
        {error && !isListening && (
          <span style={{ marginTop: 6, fontSize: 12, color: '#E24B4A', textAlign: 'center', fontFamily: 'Noto Sans, sans-serif' }}>{error}</span>
        )}
      </div>

      {/* Part 3 — Language toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {LANG_OPTIONS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLangChange(lang.code)}
            type="button"
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 30,
              border: language === lang.code ? 'none' : '1.5px solid #DDE8F5',
              background: language === lang.code ? '#1D9E75' : '#fff',
              color: language === lang.code ? '#fff' : '#A0B8D0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Noto Sans, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

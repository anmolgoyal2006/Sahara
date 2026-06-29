import { useState, useRef, useEffect } from 'react'

export default function ChatInput({
  onSend,
  onVoiceStart,
  onVoiceStop,
  isListening = false,
  isLoading = false,
  transcript = '',
  onTranscriptChange,
}) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Sync incoming voice transcript into text box
  useEffect(() => {
    if (transcript) {
      setText(transcript)
      onTranscriptChange?.(transcript)
    }
  }, [transcript]) // eslint-disable-line react-hooks/exhaustive-deps

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleChange(e) {
    setText(e.target.value)
    onTranscriptChange?.(e.target.value)
    autoResize()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = '44px'
  }

  const canSend = text.trim().length > 0 && !isLoading

  return (
    <div style={{ background: 'white', borderTop: '1px solid #EEF4FB', padding: '12px 16px', fontFamily: 'Noto Sans, sans-serif' }}>

      {/* Listening indicator */}
      {isListening && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FFF0F0', border: '1px solid #FECACA',
          borderRadius: 8, padding: '6px 12px', marginBottom: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#E24B4A',
            animation: 'listeningPulse 1s infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: '#E24B4A', fontWeight: 600 }}>
            Listening... tap mic to stop
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type or speak your message..."
          rows={1}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            border: '1.5px solid #DDE8F5',
            borderRadius: 22,
            padding: '11px 16px',
            fontSize: 16,
            color: '#0A2540',
            resize: 'none',
            overflowY: 'auto',
            lineHeight: 1.4,
            outline: 'none',
            fontFamily: 'Noto Sans, sans-serif',
            background: 'white',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.target.style.borderColor = '#1D9E75'
            e.target.style.boxShadow = '0 0 0 3px #E1F5EE'
          }}
          onBlur={e => {
            e.target.style.borderColor = '#DDE8F5'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={isListening ? onVoiceStop : onVoiceStart}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: 'none', cursor: 'pointer', flexShrink: 0,
            background: isListening ? '#E24B4A' : '#1D9E75',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isListening ? 'listeningPulse 1s infinite' : 'none',
            transition: 'background 0.2s',
          }}
        >
          <i className={`ti ${isListening ? 'ti-microphone-off' : 'ti-microphone'}`}
            style={{ fontSize: 20, color: 'white' }} />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: 'none', flexShrink: 0,
            background: canSend ? '#1D9E75' : '#DDE8F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          <i className="ti ti-send" style={{ fontSize: 18, color: canSend ? 'white' : '#A0B8D0' }} />
        </button>
      </div>

      <style>{`
        @keyframes listeningPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

import { useState, useRef } from 'react'

const ACTION_META = {
  BOOK:        { icon: 'ti-calendar-plus',       color: '#1D9E75', bg: '#F0FBF7', border: '#9FE1CB' },
  CALL_FAMILY: { icon: 'ti-phone',               color: '#185FA5', bg: '#EBF4FF', border: '#DDE8F5' },
  SOS:         { icon: 'ti-urgent',              color: '#E24B4A', bg: '#FFF0F0', border: '#FECACA' },
  HEALTH_LOG:  { icon: 'ti-heart-rate-monitor',  color: '#1D9E75', bg: '#F0FBF7', border: '#9FE1CB' },
  MEDICINES:   { icon: 'ti-pill',                color: '#BA7517', bg: '#FAEEDA', border: '#F5C77A' },
}

function ActionLabel({ type, service }) {
  if (type === 'BOOK') return `Booking ${service}`
  if (type === 'CALL_FAMILY') return 'Calling family'
  if (type === 'SOS') return 'Emergency alert'
  if (type === 'HEALTH_LOG') return 'Log health'
  if (type === 'MEDICINES') return 'Medicines'
  return ''
}

function ActionLink({ type }) {
  if (type === 'BOOK') return 'Tap to book →'
  if (type === 'CALL_FAMILY') return 'Opening call...'
  if (type === 'SOS') return 'Tap to confirm'
  if (type === 'HEALTH_LOG') return 'Open health log →'
  if (type === 'MEDICINES') return 'View medicines →'
  return ''
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Reaction row ─────────────────────────────────────────────────────────────
const FEEDBACK_OPTIONS = ['Wrong language', 'Did not understand', 'Wrong action']

function ReactionRow({ onThumbsUp, onThumbsDown, onReplay, showFeedback, onFeedbackSelect, onFeedbackDismiss }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { emoji: '👍', onClick: onThumbsUp, title: 'Good response' },
          { emoji: '👎', onClick: onThumbsDown, title: 'Not helpful' },
          { emoji: '🔊', onClick: onReplay, title: 'Replay speech' },
        ].map(btn => (
          <button key={btn.emoji} onClick={btn.onClick} title={btn.title} style={{
            background: 'white', border: '1px solid #DDE8F5',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 16, cursor: 'pointer', lineHeight: 1,
          }}>{btn.emoji}</button>
        ))}
      </div>
      {showFeedback && (
        <div style={{
          marginTop: 6, background: 'white', border: '1px solid #DDE8F5',
          borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <p style={{ fontSize: 11, color: '#5A7A9A', margin: '0 0 4px', fontWeight: 600, fontFamily: 'Noto Sans, sans-serif' }}>
            What was wrong?
          </p>
          {FEEDBACK_OPTIONS.map(opt => (
            <button key={opt} onClick={() => onFeedbackSelect(opt)} style={{
              background: '#F7FBFF', border: '1px solid #DDE8F5', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: '#185FA5', fontWeight: 600,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'Noto Sans, sans-serif',
            }}>{opt}</button>
          ))}
          <button onClick={onFeedbackDismiss} style={{
            background: 'none', border: 'none', fontSize: 11, color: '#A0B8D0',
            cursor: 'pointer', textAlign: 'left', padding: '2px 0', fontFamily: 'Noto Sans, sans-serif',
          }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatBubble({ message, onActionClick, onReplay, fontSize = 16 }) {
  const { role, content, timestamp, action } = message
  const isUser = role === 'user'
  const meta = action ? (ACTION_META[action.type] || ACTION_META.BOOK) : null

  const [showReactions, setShowReactions] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const longPressTimer = useRef(null)

  function handleLongPressStart() {
    if (isUser) return
    longPressTimer.current = setTimeout(() => setShowReactions(r => !r), 500)
  }
  function handleLongPressEnd() {
    clearTimeout(longPressTimer.current)
  }

  function handleThumbsDown() {
    setShowFeedback(true)
  }
  function handleFeedbackSelect(opt) {
    console.log('Feedback:', opt) // save silently
    setShowFeedback(false)
    setShowReactions(false)
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16, padding: '0 16px',
        userSelect: 'none',
      }}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
    >
      {/* Sahara label */}
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: '#1D9E75',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', fontFamily: 'Noto Sans, sans-serif' }}>Sahara</span>
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: isUser ? '75%' : '80%',
        background: isUser ? '#1D9E75' : 'white',
        color: isUser ? 'white' : '#0A2540',
        border: isUser ? 'none' : '1px solid #DDE8F5',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '12px 16px',
        fontSize,
        lineHeight: 1.5,
        fontFamily: 'Noto Sans, sans-serif',
        wordBreak: 'break-word',
        cursor: isUser ? 'default' : 'pointer',
      }}>
        {content}
      </div>

      {/* Action card */}
      {action && meta && (
       <div onClick={() => { console.log('ChatBubble action clicked:', action); onActionClick?.(action) }} style={{
          marginTop: 6, maxWidth: '80%',
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <i className={`ti ${meta.icon}`} style={{ fontSize: 18, color: meta.color, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: meta.color, margin: 0, fontFamily: 'Noto Sans, sans-serif' }}>
              <ActionLabel type={action.type} service={action.service} />
            </p>
            <p style={{ fontSize: 11, color: meta.color, margin: 0, opacity: 0.75, fontFamily: 'Noto Sans, sans-serif' }}>
              <ActionLink type={action.type} />
            </p>
          </div>
        </div>
      )}

      {/* Reactions */}
      {showReactions && !isUser && (
        <ReactionRow
          onThumbsUp={() => { setShowReactions(false) }}
          onThumbsDown={handleThumbsDown}
          onReplay={() => { onReplay?.(content); setShowReactions(false) }}
          showFeedback={showFeedback}
          onFeedbackSelect={handleFeedbackSelect}
          onFeedbackDismiss={() => setShowFeedback(false)}
        />
      )}

      {/* Timestamp */}
      <span style={{
        fontSize: 10, marginTop: 4,
        color: isUser ? 'rgba(0,0,0,0.4)' : '#A0B8D0',
        fontFamily: 'Noto Sans, sans-serif',
      }}>
        {formatTime(timestamp)}
      </span>
    </div>
  )
}

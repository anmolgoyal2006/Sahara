/**
 * CallHistoryPage — Phase 12E
 * Shows past video calls for elder or family member.
 *
 * Routes:
 *   /elder/call-history   → role="elder"
 *   /family/call-history  → role="family"
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ElderLayout from '../components/layout/ElderLayout'
import FamilyLayout from '../components/layout/FamilyLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/* ── Duration helpers ────────────────────────────────────────── */
function fmtDuration(secs) {
  if (!secs && secs !== 0) return '—'
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}

/* ── Individual call card ─────────────────────────────────────── */
function CallCard({ call, role }) {
  const declined = !call.duration_seconds || call.duration_seconds < 10
  const otherName = role === 'family'
    ? (call.elder?.name || 'Elder')
    : (call.family?.name || 'Family')

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #DDE8F5',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }}>
      {/* Icon */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: declined ? '#FAEEDA' : '#F0FBF7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <i
          className="ti ti-video"
          style={{ fontSize: 20, color: declined ? '#BA7517' : '#1D9E75' }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px 0' }}>
          Video Call
        </p>
        <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 2px 0' }}>
          {otherName}
        </p>
        <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>
          {fmtDate(call.created_at)}
        </p>
      </div>

      {/* Duration / status */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {declined ? (
          <span style={{
            display: 'inline-block',
            background: '#FAEEDA',
            color: '#BA7517',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700
          }}>
            Declined
          </span>
        ) : (
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75', margin: 0 }}>
            {fmtDuration(call.duration_seconds)}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center'
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#EBF4FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20
      }}>
        <i className="ti ti-video-off" style={{ fontSize: 36, color: '#A0B8D0' }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 8px 0' }}>
        No calls yet
      </p>
      <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, lineHeight: 1.6 }}>
        Start a video call with your family!
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════ */
export default function CallHistoryPage({ role = 'elder' }) {
  const navigate = useNavigate()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      setUserName(session.user.user_metadata?.name || null)

      try {
        const res = await fetch(
          `${API_URL}/api/videocall/history/${uid}?role=${role}`
        )
        const data = await res.json()
        if (data.success) setCalls(data.calls || [])
      } catch (e) {
        console.error('Call history fetch error:', e)
      } finally {
        setLoading(false)
      }
    })
  }, [role, navigate])

  const backRoute = role === 'family' ? '/family/dashboard' : '/elder/home'

  const content = (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: '20px 16px 80px',
      fontFamily: 'Inter, Noto Sans, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(backRoute)}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border: '1.5px solid #DDE8F5',
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 16, color: '#5A7A9A' }} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: 0 }}>
            Call History
          </h1>
          <p style={{ fontSize: 14, color: '#5A7A9A', margin: 0 }}>
            Your past video calls
          </p>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid #EBF4FF',
            borderTop: '3px solid #1D9E75',
            borderRadius: '50%',
            animation: 'ch-spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes ch-spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : calls.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Count badge */}
          <p style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#A0B8D0',
            margin: '0 0 4px 0',
            letterSpacing: 0.5
          }}>
            {calls.length} {calls.length === 1 ? 'CALL' : 'CALLS'}
          </p>

          {calls.map(call => (
            <CallCard key={call.id} call={call} role={role} />
          ))}
        </div>
      )}
    </div>
  )

  if (role === 'family') {
    return <FamilyLayout userName={userName}>{content}</FamilyLayout>
  }
  return <ElderLayout>{content}</ElderLayout>
}

/**
 * Phase 12C — VideoCallPage
 * Route: /call/:callId
 *
 * Standalone full-screen page. No Layout wrapper.
 * Query params:
 *   ?role=elder|family
 *   ?roomUrl=encoded_url
 *   ?roomName=room_name
 *   ?userName=encoded_name
 *   ?isOwner=true|false
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useVideoCall } from '../hooks/useVideoCall'
import VideoTile from '../components/videocall/VideoTile'
import CallControls from '../components/videocall/CallControls'

/* ─────────────────────────────────────────────────────────────
   Spinner
───────────────────────────────────────────────────────────── */
function Spinner({ size = 36, color = '#1D9E75' }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `3px solid rgba(255,255,255,0.15)`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'sahara-spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes sahara-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Animated waiting dots  ●○○ → ○●○ → ○○●
───────────────────────────────────────────────────────────── */
function WaitingDots() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 3), 600)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i === active ? 'white' : 'rgba(255,255,255,0.25)',
          transition: 'background 0.3s'
        }} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Ringing duration counter  "Ringing 00:23"
───────────────────────────────────────────────────────────── */
function RingDuration() {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return (
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
      Ringing {mm}:{ss}
    </p>
  )
}

/* ─────────────────────────────────────────────────────────────
   Draggable PiP wrapper (touch + mouse)
───────────────────────────────────────────────────────────── */
function DraggablePiP({ children }) {
  const ref = useRef(null)
  const drag = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  const [pos, setPos] = useState({ right: 16, bottom: 148 })

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    drag.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origRight: window.innerWidth - rect.right,
      origBottom: window.innerHeight - rect.bottom
    }
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!drag.current.dragging) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    setPos({
      right: Math.max(8, drag.current.origRight - dx),
      bottom: Math.max(8, drag.current.origBottom - dy)
    })
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current.dragging = false
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        right: pos.right,
        bottom: pos.bottom,
        width: 120,
        height: 90,
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid white',
        zIndex: 10,
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      {children}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   Main Page
═════════════════════════════════════════════════════════════ */
export default function VideoCallPage() {
  const navigate = useNavigate()
  const { callId } = useParams()
  const location = useLocation()

  // URL params
  const searchParams = new URLSearchParams(location.search)
  const role = searchParams.get('role') || 'elder'
  const roomUrl = decodeURIComponent(searchParams.get('roomUrl') || '')
  const roomName = searchParams.get('roomName') || ''
  const userName = decodeURIComponent(searchParams.get('userName') || 'User')
  const isOwner = searchParams.get('isOwner') === 'true'
  const otherName = decodeURIComponent(searchParams.get('otherName') || (role === 'family' ? 'Elder' : 'Family'))

  // Permission state
  const [permCamera, setPermCamera] = useState(false)
  const [permMic, setPermMic] = useState(false)
  const [permDenied, setPermDenied] = useState(false)
  const [permChecked, setPermChecked] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)

  // Call hook
  const {
    callState,
    error,
    isMuted,
    isCameraOff,
    formattedDuration,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    getParticipantTracks
  } = useVideoCall()

  const homeRoute = role === 'family' ? '/family/dashboard' : '/elder/home'

  /* ── Auth guard ──────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login')
    })
  }, [navigate])

  /* ── Request permissions, then auto-join ─────────────────── */
  useEffect(() => {
    async function requestPerms() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        // Immediately stop the test stream — Daily.co manages its own
        stream.getTracks().forEach(t => t.stop())
        setPermCamera(true)
        setPermMic(true)
        setPermChecked(true)
      } catch (e) {
        console.error('Permission error:', e)
        // Try audio-only to give more specific feedback
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          aStream.getTracks().forEach(t => t.stop())
          setPermMic(true)
        } catch (_) {}
        setPermDenied(true)
        setPermChecked(true)
      }
    }
    requestPerms()
  }, [])

  /* ── Auto-join once permissions granted ──────────────────── */
  useEffect(() => {
    if (permCamera && permMic && !hasJoined && roomUrl && roomName && callId) {
      setHasJoined(true)
      joinCall({ roomUrl, roomName, userName, callId, isOwner })
    }
  }, [permCamera, permMic, hasJoined, roomUrl, roomName, callId, joinCall, userName, isOwner])

  /* ── Participants ─────────────────────────────────────────── */
  const allParticipants = getParticipantTracks()
  const localParticipant = allParticipants?.local
  const remoteParticipant = Object.values(allParticipants || {}).find(p => !p.local)

  /* ── End call handler ─────────────────────────────────────── */
  const handleEndCall = useCallback(async () => {
    await leaveCall(callId)
  }, [leaveCall, callId])

  /* ── Retry handler ────────────────────────────────────────── */
  const handleRetry = useCallback(() => {
    if (roomUrl && roomName && callId) {
      joinCall({ roomUrl, roomName, userName, callId, isOwner })
    }
  }, [joinCall, roomUrl, roomName, callId, userName, isOwner])

  /* ════════════════════════════════════════════════════════════
     SCREEN: Permission check
  ════════════════════════════════════════════════════════════ */
  if (!permChecked || (permChecked && !permCamera && !permDenied)) {
    return (
      <FullDark>
        <LeafIcon size={48} />
        <h2 style={styles.heading}>Setting up your call</h2>
        <p style={styles.subtext}>Please allow camera and microphone</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <PermRow label="Camera" granted={permCamera} />
          <PermRow label="Microphone" granted={permMic} />
        </div>

        {!permChecked && (
          <div style={{ marginTop: 24 }}>
            <Spinner />
          </div>
        )}
      </FullDark>
    )
  }

  /* ════════════════════════════════════════════════════════════
     SCREEN: Permission denied
  ════════════════════════════════════════════════════════════ */
  if (permDenied) {
    return (
      <FullDark>
        <div style={{ ...styles.iconCircle, background: '#FFF0F0', border: '3px solid #E24B4A', marginBottom: 20 }}>
          <i className="ti ti-camera-off" style={{ fontSize: 32, color: '#E24B4A' }} />
        </div>
        <h2 style={styles.heading}>Camera or microphone blocked</h2>
        <p style={{ ...styles.subtext, marginBottom: 20 }}>
          Please allow access in your browser settings
        </p>

        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 18px', width: '100%', maxWidth: 320 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: 1 }}>
            BROWSER INSTRUCTIONS
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 6px 0' }}>
            <strong>Chrome:</strong> Click the camera icon in the address bar
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>
            <strong>Safari:</strong> Settings → Safari → Camera → Allow
          </p>
        </div>

        <button onClick={() => navigate(homeRoute)} style={styles.outlineBtn}>
          Back to Home
        </button>
      </FullDark>
    )
  }

  /* ════════════════════════════════════════════════════════════
     SCREEN: Error
  ════════════════════════════════════════════════════════════ */
  if (callState === 'error') {
    return (
      <FullDark>
        <div style={{ ...styles.iconCircle, background: '#FFF0F0', border: '3px solid #E24B4A', marginBottom: 20 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 32, color: '#E24B4A' }} />
        </div>
        <h2 style={{ ...styles.heading, color: 'white' }}>Call failed</h2>
        <p style={{ ...styles.subtext, marginBottom: 24, maxWidth: 280, textAlign: 'center' }}>
          {error || 'Something went wrong. Please try again.'}
        </p>
        <button onClick={handleRetry} style={styles.greenBtn}>
          Try Again
        </button>
        <button onClick={() => navigate(homeRoute)} style={{ ...styles.outlineBtn, marginTop: 10 }}>
          Back to Home
        </button>
      </FullDark>
    )
  }

  /* ════════════════════════════════════════════════════════════
     SCREEN: Call ended
  ════════════════════════════════════════════════════════════ */
  if (callState === 'ended') {
    return (
      <FullDark light>
        <div style={{ ...styles.iconCircle, background: '#F0FBF7', border: '3px solid #1D9E75', marginBottom: 20 }}>
          <i className="ti ti-phone-off" style={{ fontSize: 32, color: '#1D9E75' }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: 0 }}>
          Call ended
        </h2>
        <p style={{ fontSize: 16, color: '#5A7A9A', margin: '8px 0 32px 0' }}>
          Call duration: {formattedDuration}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          {role === 'family' && (
            <button
              onClick={() => navigate(`/family/dashboard`)}
              style={styles.greenBtn}
            >
              <i className="ti ti-phone" style={{ marginRight: 6 }} />
              Call Again
            </button>
          )}
          <button
            onClick={() => navigate(homeRoute)}
            style={role === 'family' ? { ...styles.outlineBtn, border: '2px solid #DDE8F5', color: '#5A7A9A' } : styles.greenBtn}
          >
            Back to Home
          </button>
        </div>
      </FullDark>
    )
  }

  /* ════════════════════════════════════════════════════════════
     SCREEN: Active call (connecting | waiting | active)
  ════════════════════════════════════════════════════════════ */
  const isWaiting = callState === 'waiting' || callState === 'creating' || callState === 'idle'
  const isConnecting = callState === 'active' && !remoteParticipant

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0A2540',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, Noto Sans, sans-serif'
    }}>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes sahara-leaf-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>

      {/* ── WAITING STATE — full overlay ── */}
      {(isWaiting || isConnecting) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: '#0A2540',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16
        }}>
          <div style={{ animation: 'sahara-leaf-pulse 2s ease-in-out infinite' }}>
            <LeafIcon size={64} />
          </div>
          <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center' }}>
            Waiting for {otherName} to join...
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
            Calling {otherName}...
          </p>
          <WaitingDots />
          <RingDuration />
        </div>
      )}

      {/* ── REMOTE VIDEO — fills screen ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ width: '100%', height: '100%' }}>
          <VideoTile
            participant={remoteParticipant}
            isLocal={false}
            isMuted={false}
            isCameraOff={!remoteParticipant}
            label={otherName}
          />
        </div>

        {/* ── Duration badge (top-center) ── */}
        {callState === 'active' && (
          <div style={{
            position: 'absolute', top: 20,
            left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.45)',
            borderRadius: 20, padding: '6px 16px',
            zIndex: 5
          }}>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
              {formattedDuration}
            </p>
          </div>
        )}

        {/* ── Other participant name ── */}
        {callState === 'active' && remoteParticipant && (
          <div style={{
            position: 'absolute', top: 56,
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 5
          }}>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: 0, whiteSpace: 'nowrap' }}>
              {otherName}
            </p>
          </div>
        )}

        {/* ── LOCAL PiP ── */}
        <DraggablePiP>
          <VideoTile
            participant={localParticipant}
            isLocal={true}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            label={userName}
          />
        </DraggablePiP>
      </div>

      {/* ── CALL CONTROLS (pinned bottom) ── */}
      <div style={{ position: 'relative', zIndex: 15, paddingBottom: 24 }}>
        <CallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={handleEndCall}
          duration={callState === 'active' ? formattedDuration : '00:00'}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Helper components
───────────────────────────────────────────────────────────── */

function FullDark({ children, light }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: light ? '#F5F9FF' : '#0A2540',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 12,
      fontFamily: 'Inter, Noto Sans, sans-serif'
    }}>
      {children}
    </div>
  )
}

function LeafIcon({ size = 48 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: 'rgba(29,158,117,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <i className="ti ti-leaf" style={{ fontSize: size * 0.55, color: '#1D9E75' }} />
    </div>
  )
}

function PermRow({ label, granted }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 10, padding: '10px 16px',
      minWidth: 220
    }}>
      <span style={{ fontSize: 22 }}>{granted ? '✅' : '⏳'}</span>
      <p style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>{label}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Shared styles
───────────────────────────────────────────────────────────── */
const styles = {
  heading: {
    color: 'white',
    fontSize: 20,
    fontWeight: 800,
    margin: '12px 0 4px 0',
    textAlign: 'center'
  },
  subtext: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    margin: 0,
    textAlign: 'center'
  },
  iconCircle: {
    width: 80, height: 80,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  greenBtn: {
    height: 52,
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    border: 'none',
    background: '#1D9E75',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, Noto Sans, sans-serif'
  },
  outlineBtn: {
    height: 52,
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    border: '2px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, Noto Sans, sans-serif'
  }
}

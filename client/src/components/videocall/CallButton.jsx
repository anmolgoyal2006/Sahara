/**
 * CallButton — "Video Call [Name]" button shown on Family Dashboard.
 *
 * Props:
 *   userId      — family member's Supabase user ID
 *   elderId     — elder's Supabase user ID
 *   elderName   — elder's display name
 *   userName    — family member's display name (for token)
 *   onCallCreated(callData) — callback after room is ready
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function CallButton({
  userId,
  elderId,
  elderName = 'Elder',
  userName = 'Family',
  onCallCreated
}) {
  const navigate = useNavigate()
  const [state, setState] = useState('idle') // idle | creating | error

  const handleCall = async () => {
    if (state === 'creating') return
    setState('creating')

    try {
      // Step 1 — Create room
      const createRes = await fetch(`${API_URL}/api/videocall/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_by: userId,
          elder_id: elderId,
          family_id: userId
        })
      })
      const createData = await createRes.json()
      if (!createData.success) throw new Error(createData.error || 'Failed to create call')

      const { call, roomUrl, roomName } = createData
      const callId = call.id

      // Step 2 — Notify parent so it can trigger elder polling
      if (onCallCreated) onCallCreated(call)

      // Step 3 — Navigate to call page
      const params = new URLSearchParams({
        role: 'family',
        roomUrl: encodeURIComponent(roomUrl),
        roomName,
        userName: encodeURIComponent(userName),
        otherName: encodeURIComponent(elderName),
        isOwner: 'true'
      })
      navigate(`/call/${callId}?${params.toString()}`)
    } catch (e) {
      console.error('CallButton error:', e)
      setState('error')
      // Reset to idle after 2.5s
      setTimeout(() => setState('idle'), 2500)
    }
  }

  const isCreating = state === 'creating'
  const isError = state === 'error'

  return (
    <button
      type="button"
      onClick={handleCall}
      disabled={isCreating}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        width: '100%',
        borderRadius: 12,
        border: 'none',
        background: isError ? '#E24B4A' : '#1D9E75',
        color: 'white',
        fontSize: 15,
        fontWeight: 700,
        cursor: isCreating ? 'not-allowed' : 'pointer',
        opacity: isCreating ? 0.8 : 1,
        transition: 'background 0.2s, opacity 0.2s',
        fontFamily: 'inherit',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      aria-label={`Video call ${elderName}`}
    >
      {isCreating ? (
        <>
          <Spinner />
          <span>Setting up call...</span>
        </>
      ) : isError ? (
        <>
          <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} />
          <span>Failed — tap to retry</span>
        </>
      ) : (
        <>
          <i className="ti ti-video" style={{ fontSize: 18 }} />
          <span>Video Call {elderName}</span>
        </>
      )}
    </button>
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 18,
        height: 18,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'cb-spin 0.7s linear infinite',
        flexShrink: 0
      }} />
      <style>{`@keyframes cb-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

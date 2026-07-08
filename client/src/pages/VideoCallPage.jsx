/**
 * VideoCallPage — Phase 12 (Jitsi)
 * Route: /call/:callId
 *
 * This page is now just a redirect launcher.
 * When someone lands here (e.g. from a cached link or elder answering),
 * it reads the roomUrl param and opens Jitsi, then redirects home.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function VideoCallPage() {
  const navigate = useNavigate()
  const { callId } = useParams()
  const location = useLocation()
  const [status, setStatus] = useState('launching') // launching | done | error

  const searchParams = new URLSearchParams(location.search)
  const role = searchParams.get('role') || 'elder'
  const roomUrl = decodeURIComponent(searchParams.get('roomUrl') || '')
  const userName = decodeURIComponent(searchParams.get('userName') || 'User')
  const homeRoute = role === 'family' ? '/family/dashboard' : '/elder/home'

  useEffect(() => {
    async function launch() {
      // Auth check
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      if (roomUrl && roomUrl.includes('jit.si')) {
        // Mark call active
        fetch(`${API_URL}/api/videocall/start/${callId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {})

        // Open Jitsi
        const jitsiUrl = `${roomUrl}#userInfo.displayName="${encodeURIComponent(userName)}"`
        window.open(jitsiUrl, '_blank', 'noopener')
        setStatus('done')

        // Go home after short delay
        setTimeout(() => navigate(homeRoute), 1500)
      } else {
        // No valid room URL — try to fetch it from DB
        try {
          const res = await fetch(`${API_URL}/api/videocall/active/${session.user.id}`)
          const data = await res.json()
          if (data.hasActiveCall && data.call?.room_url) {
            const jitsiUrl = `${data.call.room_url}#userInfo.displayName="${encodeURIComponent(userName)}"`
            window.open(jitsiUrl, '_blank', 'noopener')
            setStatus('done')
            setTimeout(() => navigate(homeRoute), 1500)
          } else {
            setStatus('error')
          }
        } catch {
          setStatus('error')
        }
      }
    }
    launch()
  }, []) // eslint-disable-line

  if (status === 'done') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A2540',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'Inter, sans-serif', padding: 24
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#F0FBF7', border: '3px solid #1D9E75',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className="ti ti-video" style={{ fontSize: 32, color: '#1D9E75' }} />
        </div>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: 0 }}>
          Call opened!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0, textAlign: 'center' }}>
          Jitsi Meet opened in a new tab.<br />Returning to home...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A2540',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'Inter, sans-serif', padding: 24
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#FFF0F0', border: '3px solid #E24B4A',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 32, color: '#E24B4A' }} />
        </div>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: 0 }}>
          Call not found
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
          The call may have ended or expired.
        </p>
        <button
          onClick={() => navigate(homeRoute)}
          style={{
            height: 48, padding: '0 28px', borderRadius: 12,
            border: 'none', background: '#1D9E75', color: 'white',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginTop: 8
          }}
        >
          Back to Home
        </button>
      </div>
    )
  }

  // Launching state
  return (
    <div style={{
      minHeight: '100vh', background: '#0A2540',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid rgba(255,255,255,0.15)',
        borderTop: '3px solid #1D9E75',
        borderRadius: '50%',
        animation: 'vcp-spin 0.8s linear infinite'
      }} />
      <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: 0 }}>
        Opening call...
      </p>
      <style>{`@keyframes vcp-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

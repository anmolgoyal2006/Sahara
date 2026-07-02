import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import { useSOSNotifications } from '../hooks/useSOSNotifications'
import SOSAlertCard from '../components/sos/SOSAlertCard'
import SOSHistoryList from '../components/sos/SOSHistoryList'

function relativeTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 2)  return 'Just now'
  if (mins < 60) return `${mins} minutes ago`
  if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function OverviewCard({ icon, iconColor, iconBg, label, value, sub, link, onLink }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 18, color: iconColor }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: sub ? 2 : 8 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#A0B8D0', marginBottom: 8 }}>{sub}</p>}
      {link && (
        <span onClick={onLink} style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, cursor: 'pointer' }}>{link}</span>
      )}
    </div>
  )
}

export default function FamilyDashboard() {
  const navigate = useNavigate()
  const [elderName, setElderName]     = useState(null)
  const [elderId, setElderId]         = useState(null)
  const [userId, setUserId]           = useState(null)
  const [healthLog, setHealthLog]     = useState(null)
  const [nextBooking, setNextBooking] = useState(null)
  const [lastActive, setLastActive]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [toast, setToast]             = useState('')
  const [sosAlerts, setSosAlerts]     = useState([])
  const [showNotifBanner, setShowNotifBanner] = useState(
    'Notification' in window && Notification.permission === 'default'
  )

  // Poll for SOS alerts from the linked elder
  useSOSNotifications(userId)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }

      const uid = session.user.id
      setUserId(uid)

      // Note: Notification.requestPermission() must be called from a user gesture.
      // FamilyDashboard doesn't currently have a permission banner, so we skip
      // the automatic request here — permission will be granted when the elder
      // triggers it via the NotificationPermissionBanner on ElderHome.

      // Get family user's elder_id
      const { data: familyUser } = await supabase
        .from('users')
        .select('elder_id')
        .eq('id', uid)
        .single()

      if (!familyUser?.elder_id) { setLoading(false); return }

      const eid = familyUser.elder_id
      setElderId(eid)

      const [elderRes, healthRes, bookingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/elder/profile/${eid}`).then(r => r.json()),
        fetch(`${API_URL}/api/elder/health/today/${eid}`).then(r => r.json()),
        fetch(`${API_URL}/api/elder/bookings/upcoming/${eid}`).then(r => r.json()),
      ])

      if (elderRes.status === 'fulfilled' && elderRes.value.success) {
        setElderName(elderRes.value.user?.name || null)
        setLastActive(elderRes.value.user?.updated_at || null)
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.success) {
        setHealthLog(healthRes.value.log)
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.success) {
        setNextBooking(bookingsRes.value.bookings?.[0] || null)
      }

      // Fetch SOS alert history for this elder
      fetch(`${API_URL}/api/sos/family-alerts/${uid}`)
        .then(r => r.json())
        .then(data => { if (data.success) setSosAlerts(data.alerts) })
        .catch(() => {})

      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    navigate('/login')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const SERVICE_LABEL = { maid: 'Maid', nurse: 'Nurse', driver: 'Driver', cook: 'Cook', physiotherapist: 'Physio', repair: 'Repair' }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A2540 0%, #185FA5 100%)', padding: '32px 24px 28px' }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>Family Dashboard</p>
        {elderName
          ? <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>Monitoring <strong>{elderName}</strong></p>
          : <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>No elder linked yet</p>
        }
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>

        {/* Notification permission banner for SOS alerts */}
        {showNotifBanner && (
          <div style={{ background: '#EBF4FF', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DDE8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-bell" style={{ fontSize: 18, color: '#185FA5' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>Enable SOS alert notifications?</p>
              <p style={{ fontSize: 11, color: '#5A7A9A', margin: '2px 0 0' }}>Get notified instantly if your family member needs help</p>
            </div>
            <button
              onClick={async () => { await Notification.requestPermission(); setShowNotifBanner(false) }}
              style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >Enable</button>
            <button
              onClick={() => setShowNotifBanner(false)}
              style={{ height: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#5A7A9A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >Not now</button>
          </div>
        )}

        {/* Active Emergency — shown above everything when there's an unresolved alert */}
        {sosAlerts.filter(a => !a.resolved).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Emergency</p>
            {sosAlerts.filter(a => !a.resolved).map(alert => (
              <SOSAlertCard
                key={alert.id}
                alert={alert}
                onResolve={async (sosId) => {
                  await fetch(`${API_URL}/api/sos/resolve/${sosId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resolved_by: 'family', notes: 'Marked safe by family member' }),
                  })
                  setSosAlerts(prev => prev.map(a =>
                    a.id === sosId ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a
                  ))
                }}
              />
            ))}
          </div>
        )}

        {/* No elder linked state */}
        {!elderId && (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 24, textAlign: 'center', marginBottom: 24 }}>
            <i className="ti ti-users" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>No elder account linked</p>
            <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 16, lineHeight: 1.5 }}>
              Ask your parent to register on Sahara and link your account
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#0F6E56', cursor: 'pointer' }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13 }} />Learn how to link
            </span>
          </div>
        )}

        {/* 2x2 overview cards */}
        {elderId && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <OverviewCard
              icon="ti-heart-rate-monitor" iconColor="#1D9E75" iconBg="#F0FBF7"
              label="Last Health Log"
              value={healthLog ? new Date(healthLog.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Not logged today'}
              sub={healthLog ? `BP: ${healthLog.bp_systolic || '—'}/${healthLog.bp_diastolic || '—'}` : null}
              link="View Health →"
              onLink={() => navigate('/family/health')}
            />
            <OverviewCard
              icon="ti-calendar" iconColor="#185FA5" iconBg="#EBF4FF"
              label="Upcoming Booking"
              value={nextBooking ? (SERVICE_LABEL[nextBooking.service_type] || nextBooking.service_type) : 'None scheduled'}
              sub={nextBooking ? new Date(nextBooking.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : null}
              link="View Bookings →"
              onLink={() => navigate('/family/bookings')}
            />
            <OverviewCard
              icon="ti-pill" iconColor="#BA7517" iconBg="#FAEEDA"
              label="Medicines Today"
              value="Check with elder"
              sub="Medicine tracking in Phase 5"
              link="View Medicines →"
              onLink={() => navigate('/family/medicines')}
            />
            <OverviewCard
              icon="ti-map-pin" iconColor="#1D9E75" iconBg="#F0FBF7"
              label="Last Active"
              value={lastActive ? relativeTime(lastActive) : 'Unknown'}
              sub={lastActive ? new Date(lastActive).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null}
              link="View Location →"
              onLink={() => navigate('/family/location')}
            />
          </div>
        )}

        {/* Video call button */}
        <button
          onClick={() => showToast('Video calling coming in Phase 9')}
          style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: '#1D9E75', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}
        >
          <i className="ti ti-video" style={{ fontSize: 18 }} />Video Call Parent
        </button>

        {/* SOS History */}
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Emergency History</p>
          <SOSHistoryList alerts={sosAlerts} />
        </div>

        {/* Logout */}
        <div style={{ textAlign: 'center' }}>
          <span onClick={handleLogout} style={{ fontSize: 13, color: '#A0B8D0', cursor: 'pointer', fontWeight: 600 }}>
            <i className="ti ti-logout" style={{ fontSize: 13, marginRight: 4 }} />Sign out
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0A2540', color: 'white', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

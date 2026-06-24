import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import WorkerLayout from '../components/layout/WorkerLayout'

const SERVICE_META = {
  maid:            { icon: 'ti-home-2',      bg: '#F0FBF7', color: '#1D9E75', label: 'Maid' },
  nurse:           { icon: 'ti-stethoscope', bg: '#FFF0F0', color: '#E24B4A', label: 'Nurse' },
  driver:          { icon: 'ti-car',         bg: '#EBF4FF', color: '#185FA5', label: 'Driver' },
  cook:            { icon: 'ti-chef-hat',    bg: '#FAEEDA', color: '#BA7517', label: 'Cook' },
  physiotherapist: { icon: 'ti-run',         bg: '#F3EFFE', color: '#7C3AED', label: 'Physio' },
  repair:          { icon: 'ti-tools',       bg: '#FFF7ED', color: '#EA580C', label: 'Repair' },
}

const STATUS_BADGE = {
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#DCFCE7', color: '#166534', label: 'Confirmed' },
  active:    { bg: '#EBF4FF', color: '#185FA5', label: 'In Progress' },
  done:      { bg: '#F3F4F6', color: '#6B7280', label: 'Completed' },
}

function formatTime(dt) {
  const d = new Date(dt)
  const now = new Date()
  const tom = new Date(); tom.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (d.toDateString() === now.toDateString()) return `Today at ${time}`
  if (d.toDateString() === tom.toDateString()) return `Tomorrow at ${time}`
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` at ${time}`
}

function ServiceIcon({ type }) {
  const m = SERVICE_META[type] || SERVICE_META.maid
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={`ti ${m.icon}`} style={{ fontSize: 20, color: m.color }} />
    </div>
  )
}

export default function WorkerJobs() {
  const navigate = useNavigate()
  const [userId, setUserId]               = useState(null)
  const [worker, setWorker]               = useState(null)
  const [workerUser, setWorkerUser]       = useState(null)
  const [bookings, setBookings]           = useState([])
  const [available, setAvailable]         = useState([])
  const [isAvailable, setIsAvailable]     = useState(true)
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState('')
  const [accepting, setAccepting]         = useState(null)
  const [completing, setCompleting]       = useState(null)
  const [confirmAccept, setConfirmAccept] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const [profileRes, bookingsRes, availRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/worker/profile/${uid}`).then(r => r.json()),
        fetch(`${API_URL}/api/worker/bookings/${uid}`).then(r => r.json()),
        fetch(`${API_URL}/api/worker/available-bookings/${uid}`).then(r => r.json()),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setWorker(profileRes.value.worker)
        setWorkerUser(profileRes.value.user)
        setIsAvailable(profileRes.value.worker?.available ?? true)
      }
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.bookings || [])
      if (availRes.status === 'fulfilled') setAvailable(availRes.value.bookings || [])

      // Update location silently
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          fetch(`${API_URL}/api/worker/location/${uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {})
        })
      }

      setLoading(false)
    }
    load()
  }, [navigate])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleAccept(bookingId) {
    setAccepting(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/worker/accept-booking/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: userId }),
      })
      const data = await res.json()
      if (data.success) {
        const accepted = available.find(b => b.id === bookingId)
        setAvailable(p => p.filter(b => b.id !== bookingId))
        if (accepted) setBookings(p => [{ ...accepted, status: 'confirmed', worker_id: userId }, ...p])
        showToast('Booking accepted!')
      }
    } catch {}
    setAccepting(null)
    setConfirmAccept(null)
  }

  async function handleComplete(bookingId) {
    setCompleting(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/worker/complete-booking/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: userId }),
      })
      const data = await res.json()
      if (data.success) {
        setBookings(p => p.map(b => b.id === bookingId ? { ...b, status: 'done' } : b))
        showToast('Booking marked as done!')
      }
    } catch {}
    setCompleting(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, background: '#1D9E75', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-leaf" style={{ color: 'white', fontSize: 24 }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540' }}>Loading your jobs...</p>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <WorkerLayout
      workerName={workerUser?.name}
      workerId={userId}
      available={isAvailable}
      onAvailabilityChange={setIsAvailable}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Verification banner */}
        {worker?.verified ? (
          <div style={{ background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 18, color: '#1D9E75', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F6E56' }}>Profile Verified — You can now receive bookings</p>
          </div>
        ) : (
          <div style={{ background: '#FAEEDA', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <i className="ti ti-clock" style={{ fontSize: 16, color: '#BA7517', flexShrink: 0 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#BA7517' }}>Your profile is under review</p>
            </div>
            <p style={{ fontSize: 11, color: '#92400E' }}>We verify all workers within 24 hours. You will be notified when approved.</p>
          </div>
        )}

        {/* Section 1 — My Bookings */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>My Bookings</p>
          <p style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 16 }}>Bookings assigned to you</p>

          {bookings.length === 0 ? (
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
              <i className="ti ti-calendar-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No bookings yet</p>
              <p style={{ fontSize: 12, color: '#A0B8D0' }}>Complete your profile to start receiving work</p>
            </div>
          ) : (
            bookings.map(b => {
              const svc = SERVICE_META[b.service_type] || SERVICE_META.maid
              const st  = STATUS_BADGE[b.status] || STATUS_BADGE.pending
              return (
                <div key={b.id} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ServiceIcon type={b.service_type} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>{b.users?.name || 'Elder'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ background: svc.bg, color: svc.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{svc.label}</span>
                        <span style={{ fontSize: 13, color: '#5A7A9A' }}>{formatTime(b.scheduled_at)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#A0B8D0' }}>Duration: {b.duration_hours || 2} hrs</p>
                      {b.notes && <p style={{ fontSize: 12, color: '#7A96B0', fontStyle: 'italic' }}>{b.notes}</p>}
                    </div>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{st.label}</span>
                  </div>

                  {b.status === 'confirmed' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {b.users?.phone && (
                        <a href={`tel:${b.users.phone}`} style={{ flex: 1, height: 40, borderRadius: 9, border: '1.5px solid #1D9E75', background: 'white', color: '#1D9E75', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                          <i className="ti ti-phone" style={{ fontSize: 14 }} />Call Elder
                        </a>
                      )}
                      <button
                        onClick={() => handleComplete(b.id)}
                        disabled={completing === b.id}
                        style={{ flex: 1, height: 40, borderRadius: 9, border: 'none', background: '#1D9E75', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {completing === b.id ? 'Saving...' : 'Mark Done'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Section 2 — Available Jobs (only if verified) */}
        {worker?.verified && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>Available Jobs</p>
            <p style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 16 }}>Open bookings near you</p>

            {available.length === 0 ? (
              <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
                <i className="ti ti-search-off" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
                <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No open jobs right now</p>
                <p style={{ fontSize: 12, color: '#A0B8D0' }}>Check back later for new bookings</p>
              </div>
            ) : (
              available.map(b => {
                const svc = SERVICE_META[b.service_type] || SERVICE_META.maid
                return (
                  <div key={b.id} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <ServiceIcon type={b.service_type} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ background: svc.bg, color: svc.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{svc.label}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 2 }}>{formatTime(b.scheduled_at)}</p>
                        <p style={{ fontSize: 12, color: '#A0B8D0', marginBottom: 2 }}>Duration: {b.duration_hours || 2} hrs</p>
                        {b.area && <p style={{ fontSize: 12, color: '#A0B8D0' }}><i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {b.area}</p>}
                        {b.notes && <p style={{ fontSize: 12, color: '#7A96B0', fontStyle: 'italic', marginTop: 4 }}>{b.notes}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAccept(b.id)}
                      style={{ width: '100%', height: 44, borderRadius: 9, border: 'none', background: '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Accept Job
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Accept confirmation modal */}
      {confirmAccept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setConfirmAccept(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Accept this booking?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 24 }}>You will be assigned to this job and the elder will be notified.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmAccept(null)} style={{ flex: 1, height: 48, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => handleAccept(confirmAccept)} disabled={accepting === confirmAccept} style={{ flex: 1, height: 48, borderRadius: 10, border: 'none', background: '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {accepting === confirmAccept ? 'Accepting...' : 'Yes, Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          <i className="ti ti-circle-check" style={{ marginRight: 8 }} />{toast}
        </div>
      )}
    </WorkerLayout>
  )
}

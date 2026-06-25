import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import { supabase, API_URL } from '../../lib/supabase'

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: s < step ? '#9FE1CB' : s === step ? '#1D9E75' : '#DDE8F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}>
            {s < step && (
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {i < 3 && <div style={{ width: 28, height: 1, background: '#DDE8F5' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Helper: format date ───────────────────────────────────────────────────────
function formatFullDate(scheduledAt) {
  if (!scheduledAt) return '—'
  const d = new Date(scheduledAt)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(scheduledAt) {
  if (!scheduledAt) return '—'
  const d = new Date(scheduledAt)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookingConfirm() {
  const navigate = useNavigate()

  const [parsed, setParsed]                     = useState(null)
  const [worker, setWorker]                     = useState(null)
  const [elderAddress, setElderAddress]         = useState(null)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState(null)

  useEffect(() => {
    const storedParsed = sessionStorage.getItem('booking_parsed')
    const storedWorker = sessionStorage.getItem('booking_worker')
    if (!storedParsed || !storedWorker) { navigate('/elder/book'); return }
    setParsed(JSON.parse(storedParsed))
    setWorker(JSON.parse(storedWorker))

    // Load elder address
    async function loadAddress() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      try {
        const res = await fetch(`${API_URL}/api/elder/profile/${session.user.id}`)
        const data = await res.json()
        setElderAddress(data.profile?.address || null)
      } catch (_) {}
    }
    loadAddress()
  }, [navigate])

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      // Try getSession first, fall back to getUser if session expired
      let userId = sessionStorage.getItem('booking_elder_id')
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          userId = session.user.id
        } else {
          // Force refresh
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Session expired. Please log in again.')
          userId = user.id
        }
        sessionStorage.setItem('booking_elder_id', userId)
      }

      const originalRequest = sessionStorage.getItem('booking_request') || ''

      const res = await fetch(`${API_URL}/api/booking/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elder_id: userId,
          worker_id: worker.id,
          service_type: parsed.service_type,
          scheduled_at: parsed.scheduled_at,
          duration_hours: parsed.duration_hours,
          notes: specialInstructions.trim() || null,
          ai_parsed_request: originalRequest,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      sessionStorage.setItem('booking_result', JSON.stringify(data.booking))
      navigate('/elder/book/success')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!parsed || !worker) return null

  const workerName  = worker.users?.name || 'Worker'
  const workerPhone = worker.users?.phone || null
  const initials    = workerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const serviceCap  = parsed.service_type?.charAt(0).toUpperCase() + parsed.service_type?.slice(1)
  const languages   = worker.languages || []

  const detailRows = [
    { icon: 'ti-calendar', color: '#185FA5', label: 'Date',     value: formatFullDate(parsed.scheduled_at) },
    { icon: 'ti-clock',    color: '#1D9E75', label: 'Time',     value: formatTime(parsed.scheduled_at) },
    { icon: 'ti-hourglass',color: '#BA7517', label: 'Duration', value: `${parsed.duration_hours} hour${parsed.duration_hours !== 1 ? 's' : ''}` },
    { icon: 'ti-map-pin',  color: '#E24B4A', label: 'Location', value: elderAddress || 'Your registered address' },
  ]

  return (
    <ElderLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'Noto Sans, sans-serif' }}>

        <StepDots step={3} />

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 4px' }}>
          Confirm Your Booking
        </h1>
        <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px' }}>
          Please review the details below
        </p>

        {/* Summary card */}
        <div style={{
          background: 'white', border: '1.5px solid #185FA5',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          {/* Worker section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {worker.photo_url ? (
              <img src={worker.photo_url} alt={workerName}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDE8F5', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
            )}
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', margin: '0 0 4px' }}>{workerName}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#0F6E56',
                  background: '#F0FBF7', border: '1px solid #9FE1CB',
                  borderRadius: 20, padding: '2px 10px',
                }}>
                  {serviceCap}
                </span>
                {worker.rating > 0 && (
                  <span style={{ fontSize: 13, color: '#0A2540', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-star-filled" style={{ color: '#F4A942', fontSize: 13 }} />
                    {worker.rating.toFixed(1)}
                  </span>
                )}
                {worker.experience_years > 0 && (
                  <span style={{ fontSize: 12, color: '#5A7A9A' }}>
                    {worker.experience_years} years
                  </span>
                )}
              </div>
              {languages.length > 0 && (
                <p style={{ fontSize: 12, color: '#5A7A9A', margin: '4px 0 0' }}>
                  Speaks: {languages.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#EEF4FB', marginBottom: 4 }} />

          {/* Booking details */}
          {detailRows.map((row, idx) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              height: 48,
              borderBottom: idx < detailRows.length - 1 ? '1px solid #EEF4FB' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className={`ti ${row.icon}`} style={{ fontSize: 16, color: row.color, width: 20, textAlign: 'center' }} />
                <span style={{ fontSize: 12, color: '#5A7A9A' }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', textAlign: 'right', maxWidth: 220 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Edit link */}
        <button
          onClick={() => navigate('/elder/book')}
          style={{
            fontSize: 13, color: '#1D9E75', background: 'none', border: 'none',
            cursor: 'pointer', padding: '0 0 20px', display: 'block',
          }}
        >
          ← Edit Details
        </button>

        {/* Special instructions */}
        <textarea
          rows={4}
          placeholder={"Any special instructions for the helper?\ne.g. 'Please bring cleaning supplies'"}
          value={specialInstructions}
          onChange={e => setSpecialInstructions(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            borderRadius: 12, border: '1.5px solid #DDE8F5',
            padding: '12px 14px', fontSize: 14, resize: 'vertical',
            fontFamily: 'Noto Sans, sans-serif', color: '#0A2540',
            outline: 'none', lineHeight: 1.5, marginBottom: 16,
          }}
        />

        {/* Important notes */}
        <div style={{
          background: '#EBF4FF', borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 18, color: '#185FA5', marginTop: 1, flexShrink: 0 }} />
          <div>
            {[
              'The helper will arrive at your registered address',
              'You can contact them directly once confirmed',
              'Payment is collected after the service',
            ].map(note => (
              <p key={note} style={{ fontSize: 12, color: '#185FA5', margin: '0 0 4px' }}>
                • {note}
              </p>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#FFF0F0', border: '1.5px solid #E24B4A',
            borderRadius: 10, padding: '10px 14px', marginBottom: 12,
            fontSize: 13, color: '#E24B4A',
          }}>
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: '100%', height: 56, borderRadius: 12, border: 'none',
            background: loading ? '#9FE1CB' : '#1D9E75',
            color: 'white', fontSize: 18, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Confirming your booking...' : 'Confirm Booking'}
        </button>
      </div>
    </ElderLayout>
  )
}

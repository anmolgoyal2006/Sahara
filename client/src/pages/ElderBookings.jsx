import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../components/layout/ElderLayout'
import { supabase, API_URL } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────
const SERVICE_META = {
  maid:            { icon: 'ti-home',          bg: '#DCFCE7', color: '#166534' },
  nurse:           { icon: 'ti-stethoscope',   bg: '#FFF0F0', color: '#E24B4A' },
  driver:          { icon: 'ti-car',           bg: '#EBF4FF', color: '#185FA5' },
  cook:            { icon: 'ti-tools-kitchen', bg: '#FAEEDA', color: '#BA7517' },
  physiotherapist: { icon: 'ti-run',           bg: '#EDE9FE', color: '#5B21B6' },
  repair:          { icon: 'ti-tool',          bg: '#FFEDD5', color: '#C2410C' },
}

const STATUS_BADGE = {
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#DCFCE7', color: '#166534', label: 'Confirmed' },
  done:      { bg: '#EBF4FF', color: '#185FA5', label: 'Completed' },
  cancelled: { bg: '#FFF0F0', color: '#E24B4A', label: 'Cancelled' },
}

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'done',      label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(scheduledAt) {
  if (!scheduledAt) return '—'
  const d = new Date(scheduledAt)
  const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
  return `${date} · ${time}`
}

// ── Star row (display only) ───────────────────────────────────────────────────
function Stars({ rating, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24"
          fill={n <= rating ? '#F59E0B' : 'none'}
          stroke={n <= rating ? '#F59E0B' : '#DDE8F5'}
          strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

// ── Rating modal ──────────────────────────────────────────────────────────────
function RatingModal({ booking, onClose, onSubmit }) {
  const [rating, setRating]   = useState(0)
  const [review, setReview]   = useState('')
  const [loading, setLoading] = useState(false)
  const workerName = booking.workers?.users?.name || 'the worker'

  async function submit() {
    if (!rating) return
    setLoading(true)
    await onSubmit(booking, rating, review.trim())
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 24,
    }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, fontFamily: 'Noto Sans, sans-serif' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', margin: '0 0 20px', textAlign: 'center' }}>
          How was {workerName}?
        </h3>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
              aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill={n <= rating ? '#F59E0B' : 'none'} stroke={n <= rating ? '#F59E0B' : '#DDE8F5'} strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          placeholder="Write a review (optional)"
          value={review}
          onChange={e => setReview(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            borderRadius: 12, border: '1.5px solid #DDE8F5',
            padding: '10px 12px', fontSize: 14,
            fontFamily: 'Noto Sans, sans-serif', resize: 'none',
            marginBottom: 16, outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, height: 44, borderRadius: 10,
            border: '1.5px solid #DDE8F5', background: 'white',
            color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
          }}>Cancel</button>
          <button onClick={submit} disabled={!rating || loading} style={{
            flex: 2, height: 44, borderRadius: 10, border: 'none',
            background: !rating ? '#DDE8F5' : '#1D9E75',
            color: !rating ? '#A0B8D0' : 'white',
            fontWeight: 700, fontSize: 15, cursor: !rating ? 'not-allowed' : 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
          }}>
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: '#1D9E75', color: 'white',
      borderRadius: 24, padding: '10px 24px',
      fontSize: 14, fontWeight: 600, fontFamily: 'Noto Sans, sans-serif',
      zIndex: 400, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {message}
    </div>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, onCancel, onRate }) {
  const navigate  = useNavigate()
  const svc       = booking.service_type || 'maid'
  const meta      = SERVICE_META[svc] || SERVICE_META.maid
  const badge     = STATUS_BADGE[booking.status] || STATUS_BADGE.pending
  const svcLabel  = svc.charAt(0).toUpperCase() + svc.slice(1)
  const workerName  = booking.workers?.users?.name || 'Worker'
  const workerPhone = booking.workers?.users?.phone || null
  const hasRating   = booking.rating && booking.rating > 0

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 12, padding: 16, marginBottom: 12,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${meta.icon}`} style={{ fontSize: 18, color: meta.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>{svcLabel}</p>
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0 }}>{workerName}</p>
        </div>
        <span style={{
          background: badge.bg, color: badge.color,
          borderRadius: 20, padding: '3px 10px',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Middle row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#5A7A9A', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-calendar" style={{ fontSize: 13 }} />
          {formatDateTime(booking.scheduled_at)}
        </span>
        <span style={{ fontSize: 13, color: '#5A7A9A', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-hourglass" style={{ fontSize: 13 }} />
          {booking.duration_hours || 2}h
        </span>
      </div>

      {/* Bottom row — actions by status */}
      {booking.status === 'pending' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onCancel(booking)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8,
              border: '1.5px solid #E24B4A', background: 'white',
              color: '#E24B4A', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {booking.status === 'confirmed' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {workerPhone && (
            <span style={{ fontSize: 13, color: '#5A7A9A', flex: 1 }}>{workerPhone}</span>
          )}
          <a
            href={workerPhone ? `tel:${workerPhone}` : undefined}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8,
              border: '1.5px solid #1D9E75', background: 'white',
              color: '#1D9E75', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <i className="ti ti-phone" style={{ fontSize: 13 }} />
            Call Worker
          </a>
        </div>
      )}

      {booking.status === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {hasRating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Stars rating={booking.rating} size={14} />
              <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>Rated</span>
            </div>
          ) : (
            <button
              onClick={() => onRate(booking)}
              style={{
                height: 34, padding: '0 16px', borderRadius: 8,
                border: '1.5px solid #F59E0B', background: 'white',
                color: '#F59E0B', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Rate This Service
            </button>
          )}
        </div>
      )}

      {booking.status === 'cancelled' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate(`/elder/book?service=${svc}`)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8,
              border: '1.5px solid #1D9E75', background: 'white',
              color: '#1D9E75', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            Book Again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ElderBookings() {
  const navigate = useNavigate()

  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('all')
  const [ratingBooking, setRatingBooking] = useState(null)
  const [toast, setToast]             = useState(null)
  const [userId, setUserId]           = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }
      setUserId(session.user.id)
    }
    init()
  }, [])

  const fetchBookings = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/booking/history/${userId}`)
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch (_) {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCancel(booking) {
    if (!window.confirm(`Cancel your ${booking.service_type} booking?`)) return
    try {
      const res = await fetch(`${API_URL}/api/booking/cancel/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elder_id: userId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b))
      showToast('Booking cancelled')
    } catch (e) {
      alert('Could not cancel. Please try again.')
    }
  }

  async function handleRateSubmit(booking, rating, review) {
    try {
      const res = await fetch(`${API_URL}/api/booking/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          worker_id: booking.worker_id,
          rating,
          review: review || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, rating } : b))
      setRatingBooking(null)
      showToast('Thank you for your rating!')
    } catch (e) {
      alert('Could not submit rating. Please try again.')
    }
  }

  function getFiltered() {
    const now = new Date()
    switch (activeTab) {
      case 'upcoming':
        return bookings.filter(b =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          new Date(b.scheduled_at) > now
        )
      case 'confirmed':
        return bookings.filter(b => b.status === 'confirmed')
      case 'done':
        return bookings.filter(b => b.status === 'done')
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled')
      default:
        return bookings
    }
  }

  const filtered = getFiltered()

  return (
    <ElderLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 80px', fontFamily: 'Noto Sans, sans-serif' }}>

        {/* Header */}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A2540', margin: '0 0 4px' }}>My Bookings</h1>
        <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 20px' }}>All your service history</p>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 20,
          overflowX: 'auto', borderBottom: '1px solid #DDE8F5',
          scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  height: 40, padding: '0 16px', flexShrink: 0,
                  border: 'none', borderBottom: active ? '2px solid #1D9E75' : '2px solid transparent',
                  background: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                  color: active ? '#1D9E75' : '#5A7A9A',
                  fontFamily: 'Noto Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#5A7A9A', fontSize: 14 }}>
            Loading bookings...
          </div>
        )}

        {/* Booking list */}
        {!loading && filtered.map(booking => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onCancel={handleCancel}
            onRate={setRatingBooking}
          />
        ))}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <i className="ti ti-calendar" style={{ fontSize: 48, color: '#A0B8D0', display: 'block', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#5A7A9A', margin: '0 0 8px' }}>No bookings yet</p>
            <p style={{ fontSize: 14, color: '#A0B8D0', margin: '0 0 24px' }}>Book your first helper now</p>
            <button
              onClick={() => navigate('/elder/book')}
              style={{
                height: 44, padding: '0 24px', borderRadius: 10,
                border: 'none', background: '#1D9E75', color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              Book a Service
            </button>
          </div>
        )}
      </div>

      {/* Rating modal */}
      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          onClose={() => setRatingBooking(null)}
          onSubmit={handleRateSubmit}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </ElderLayout>
  )
}

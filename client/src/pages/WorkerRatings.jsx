import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, API_URL } from '../lib/supabase'
import WorkerLayout from '../components/layout/WorkerLayout'

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_META = {
  maid:            { icon: 'ti-home-2',      bg: '#F0FBF7', color: '#1D9E75', label: 'Maid' },
  nurse:           { icon: 'ti-stethoscope', bg: '#FFF0F0', color: '#E24B4A', label: 'Nurse' },
  driver:          { icon: 'ti-car',         bg: '#EBF4FF', color: '#185FA5', label: 'Driver' },
  cook:            { icon: 'ti-chef-hat',    bg: '#FAEEDA', color: '#BA7517', label: 'Cook' },
  physiotherapist: { icon: 'ti-run',         bg: '#F3EFFE', color: '#7C3AED', label: 'Physio' },
  repair:          { icon: 'ti-tools',       bg: '#FFF7ED', color: '#EA580C', label: 'Repair' },
}

const BAR_COLORS = { 5: '#1D9E75', 4: '#34C789', 3: '#F59E0B', 2: '#F97316', 1: '#E24B4A' }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(dt) {
  const d = new Date(dt)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

/** Initials from full name */
function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Stars display ─────────────────────────────────────────────────────────────
// Renders filled / half / empty stars at any size.
function Stars({ rating, size = 16 }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: full  }).map((_, i) => (
        <span key={`f${i}`} style={{ fontSize: size, color: '#F59E0B', lineHeight: 1 }}>★</span>
      ))}
      {half === 1 && (
        <span style={{ fontSize: size, color: '#F59E0B', lineHeight: 1, opacity: 0.6 }}>★</span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} style={{ fontSize: size, color: '#DDE8F5', lineHeight: 1 }}>★</span>
      ))}
    </div>
  )
}

// ── Progress bar row ──────────────────────────────────────────────────────────
function BreakdownRow({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 11, color: '#5A7A9A', fontWeight: 700, width: 22, flexShrink: 0, textAlign: 'right' }}>
        {star}★
      </span>
      <div style={{ flex: 1, height: 7, background: '#EEF4FB', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: BAR_COLORS[star] || '#A0B8D0',
          borderRadius: 4,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: '#A0B8D0', width: 18, flexShrink: 0, textAlign: 'right' }}>
        {count}
      </span>
    </div>
  )
}

// ── Individual review card ────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const svc       = SERVICE_META[review.service_type] || SERVICE_META.maid
  const elderName = review.users?.name || 'Elder'
  const ini       = initials(elderName)

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 16, marginBottom: 10,
    }}>
      {/* Top row: avatar + name + badge + date */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Initials avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1 }}>{ini}</span>
        </div>

        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>{elderName}</p>
          <p style={{ fontSize: 11, color: '#A0B8D0', margin: '2px 0 0' }}>{shortDate(review.scheduled_at)}</p>
        </div>

        {/* Service badge */}
        <span style={{
          background: svc.bg, color: svc.color,
          borderRadius: 20, padding: '3px 10px',
          fontSize: 10, fontWeight: 700, flexShrink: 0,
        }}>
          {svc.label}
        </span>
      </div>

      {/* Stars + rating number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: review.review ? 10 : 0 }}>
        <Stars rating={review.rating} size={16} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#BA7517' }}>{review.rating}/5</span>
      </div>

      {/* Review text */}
      {review.review && (
        <p style={{
          fontSize: 13, color: '#5A7A9A',
          fontStyle: 'italic', lineHeight: 1.6,
          margin: 0, paddingTop: 10,
          borderTop: '1px solid #EEF4FB',
        }}>
          "{review.review}"
        </p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerRatings() {
  const navigate = useNavigate()

  const [userId, setUserId]           = useState(null)
  const [workerUser, setWorkerUser]   = useState(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [loading, setLoading]         = useState(true)

  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings,  setTotalRatings]  = useState(0)
  const [breakdown,     setBreakdown]     = useState({})
  const [reviews,       setReviews]       = useState([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const [profileRes, ratingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/worker/profile/${uid}`).then(r => r.json()),
        fetch(`${API_URL}/api/worker/ratings/${uid}`).then(r => r.json()),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setWorkerUser(profileRes.value.user)
        setIsAvailable(profileRes.value.worker?.available ?? true)
      }
      if (ratingsRes.status === 'fulfilled' && ratingsRes.value.success) {
        setAverageRating(ratingsRes.value.averageRating)
        setTotalRatings(ratingsRes.value.totalRatings)
        setBreakdown(ratingsRes.value.breakdown || {})
        setReviews(ratingsRes.value.reviews || [])
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const hasRatings = totalRatings > 0

  return (
    <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Header ── */}
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 2px' }}>My Ratings</p>
        <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 20px' }}>What elders say about you</p>

        {/* ── Overall rating card ── */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 16, padding: 24, marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24,
            flexWrap: 'wrap',
          }}>
            {/* Big number + stars */}
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <p style={{
                fontSize: 56, fontWeight: 900, color: '#0A2540',
                margin: 0, lineHeight: 1,
              }}>
                {hasRatings ? averageRating.toFixed(1) : '—'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
                {hasRatings
                  ? <Stars rating={averageRating} size={20} />
                  : <span style={{ fontSize: 20, color: '#DDE8F5', letterSpacing: 2 }}>★★★★★</span>
                }
              </div>
              <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>
                {totalRatings} review{totalRatings !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Vertical divider (hidden on wrap) */}
            <div style={{ width: 1, height: 100, background: '#EEF4FB', flexShrink: 0, alignSelf: 'center' }} />

            {/* Breakdown bars */}
            <div style={{ flex: 1, minWidth: 180 }}>
              {[5, 4, 3, 2, 1].map(star => (
                <BreakdownRow
                  key={star}
                  star={star}
                  count={breakdown[star] || 0}
                  total={reviews.length}
                />
              ))}
            </div>
          </div>

          {/* Motivational tip if no ratings */}
          {!hasRatings && (
            <div style={{
              marginTop: 16, padding: '10px 14px',
              background: '#F0FBF7', borderRadius: 10, border: '1px solid #9FE1CB',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-bulb" style={{ fontSize: 15, color: '#1D9E75', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#0F6E56', margin: 0, fontWeight: 600 }}>
                Highly rated workers get more bookings!
              </p>
            </div>
          )}
        </div>

        {/* ── Reviews list or empty state ── */}
        {hasRatings ? (
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 12px' }}>
              Reviews ({reviews.length})
            </p>
            {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        ) : (
          <div style={{
            background: 'white', border: '1.5px solid #DDE8F5',
            borderRadius: 14, padding: '52px 24px', textAlign: 'center',
          }}>
            <i className="ti ti-star" style={{ fontSize: 48, color: '#DDE8F5', display: 'block', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#5A7A9A', margin: '0 0 8px' }}>
              No ratings yet
            </p>
            <p style={{ fontSize: 14, color: '#A0B8D0', margin: '0 0 6px' }}>
              Complete bookings to receive ratings
            </p>
            <p style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600, margin: '0 0 24px' }}>
              Highly rated workers get more bookings!
            </p>
            <button
              onClick={() => navigate('/worker/jobs')}
              style={{ height: 44, padding: '0 24px', borderRadius: 10, border: 'none', background: '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Browse Jobs
            </button>
          </div>
        )}

      </div>
    </WorkerLayout>
  )
}

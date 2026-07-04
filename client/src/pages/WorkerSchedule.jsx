import { useState, useEffect, useCallback } from 'react'
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

const STATUS_BADGE = {
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#DCFCE7', color: '#166534', label: 'Confirmed' },
  active:    { bg: '#EBF4FF', color: '#185FA5', label: 'In Progress' },
  done:      { bg: '#F3F4F6', color: '#6B7280', label: 'Completed' },
  cancelled: { bg: '#FFF0F0', color: '#E24B4A', label: 'Cancelled' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date` */
function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns array of 7 Date objects starting from monday */
function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** "23 Jun" */
function shortDate(d) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

/** "Mon 23 Jun — Sun 29 Jun" */
function weekLabel(monday) {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${shortDate(monday)} — ${shortDate(sunday)}`
}

/** "9:30 AM" */
function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).toUpperCase()
}

/** Full label for list section */
function formatFullTime(dt) {
  const d   = new Date(dt)
  const now = new Date()
  const tom = new Date(now); tom.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (d.toDateString() === now.toDateString()) return `Today at ${time}`
  if (d.toDateString() === tom.toDateString()) return `Tomorrow at ${time}`
  return `${DAY_NAMES_FULL[d.getDay()]}, ${shortDate(d)} at ${time}`
}

/** Is date a on the same calendar day as b? */
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

// ── Calendar slot card (tiny, inside day column) ──────────────────────────────

function SlotCard({ booking }) {
  const svc = SERVICE_META[booking.service_type] || SERVICE_META.maid
  return (
    <div style={{
      background: svc.bg,
      borderRadius: 8,
      padding: '6px 8px',
      marginBottom: 4,
      borderLeft: `3px solid ${svc.color}`,
      minWidth: 0,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: svc.color,
        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {svc.label}
      </p>
      <p style={{ fontSize: 10, color: '#5A7A9A', margin: '1px 0 0', whiteSpace: 'nowrap' }}>
        {formatTime(booking.scheduled_at)}
      </p>
      <p style={{
        fontSize: 10, color: '#A0B8D0', margin: '1px 0 0',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {booking.users?.name || 'Elder'}
      </p>
    </div>
  )
}

// ── Detailed list card (below calendar, same style as WorkerJobs) ─────────────

function BookingListCard({ booking }) {
  const svc = SERVICE_META[booking.service_type] || SERVICE_META.maid
  const st  = STATUS_BADGE[booking.status]       || STATUS_BADGE.pending
  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 12, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Service icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: svc.bg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <i className={`ti ${svc.icon}`} style={{ fontSize: 20, color: svc.color }} />
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 3px' }}>
            {booking.users?.name || 'Elder'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{
              background: svc.bg, color: svc.color,
              borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700,
            }}>
              {svc.label}
            </span>
            <span style={{ fontSize: 12, color: '#5A7A9A' }}>
              {formatFullTime(booking.scheduled_at)}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>
            {booking.duration_hours || 2}h duration
            {booking.notes ? ` · ${booking.notes}` : ''}
          </p>
        </div>

        {/* Status badge */}
        <span style={{
          background: st.bg, color: st.color,
          borderRadius: 20, padding: '3px 10px',
          fontSize: 10, fontWeight: 700, flexShrink: 0,
        }}>
          {st.label}
        </span>
      </div>

      {/* Call elder for confirmed */}
      {booking.status === 'confirmed' && booking.users?.phone && (
        <div style={{ marginTop: 10 }}>
          <a
            href={`tel:${booking.users.phone}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 8,
              border: '1.5px solid #1D9E75', background: 'white',
              color: '#1D9E75', fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}
          >
            <i className="ti ti-phone" style={{ fontSize: 12 }} />
            Call {booking.users.name?.split(' ')[0] || 'Elder'}
          </a>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerSchedule() {
  const navigate = useNavigate()

  const [userId, setUserId]           = useState(null)
  const [workerUser, setWorkerUser]   = useState(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [allBookings, setAllBookings] = useState([])   // all bookings from API
  const [loading, setLoading]         = useState(true)
  const [weekOffset, setWeekOffset]   = useState(0)    // 0 = current week, ±1 = prev/next

  // ── Derived: current week's Monday ────────────────────────────────────────
  const thisMonday = useCallback(() => {
    const base = getMondayOf(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])

  const monday  = thisMonday()
  const weekDays = getWeekDays(monday)
  const today   = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      const [profileRes, bookingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/worker/profile/${uid}`).then(r => r.json()),
        fetch(`${API_URL}/api/worker/bookings/${uid}`).then(r => r.json()),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setWorkerUser(profileRes.value.user)
        setIsAvailable(profileRes.value.worker?.available ?? true)
      }
      if (bookingsRes.status === 'fulfilled') {
        setAllBookings(bookingsRes.value.bookings || [])
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  // ── Filter bookings for visible week ──────────────────────────────────────
  const weekStart = new Date(monday)
  const weekEnd   = new Date(monday); weekEnd.setDate(weekEnd.getDate() + 7)

  const weekBookings = allBookings.filter(b => {
    const d = new Date(b.scheduled_at)
    return d >= weekStart && d < weekEnd && b.status !== 'cancelled'
  })

  // Map day → bookings for that day
  function bookingsForDay(dayDate) {
    return weekBookings.filter(b => sameDay(new Date(b.scheduled_at), dayDate))
  }

  // Upcoming 5 bookings from now (all statuses except done/cancelled)
  const now = new Date()
  const upcomingList = allBookings
    .filter(b => new Date(b.scheduled_at) >= now && !['done', 'cancelled'].includes(b.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5)

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (allBookings.length === 0) {
    return (
      <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 4 }}>My Schedule</p>
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '56px 24px', textAlign: 'center', marginTop: 24 }}>
            <i className="ti ti-calendar-off" style={{ fontSize: 48, color: '#DDE8F5', display: 'block', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#5A7A9A', margin: '0 0 8px' }}>No bookings scheduled yet</p>
            <p style={{ fontSize: 14, color: '#A0B8D0', margin: '0 0 24px' }}>Accept jobs from My Jobs to see them here</p>
            <button
              onClick={() => navigate('/worker/jobs')}
              style={{ height: 44, padding: '0 24px', borderRadius: 10, border: 'none', background: '#1D9E75', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Browse Jobs
            </button>
          </div>
        </div>
      </WorkerLayout>
    )
  }

  // ── Week column widths ────────────────────────────────────────────────────
  // Each day column is 88px min; container scrolls horizontally on mobile
  const COL_W = 88

  return (
    <WorkerLayout workerName={workerUser?.name} workerId={userId} available={isAvailable} onAvailabilityChange={setIsAvailable}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Header ── */}
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 2px' }}>My Schedule</p>
        <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 20px' }}>
          Week of {weekLabel(monday)}
        </p>

        {/* ── Week navigation ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 12, padding: '10px 16px', marginBottom: 16,
        }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
            Prev
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </p>
            <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>{weekLabel(monday)}</p>
          </div>

          <button
            onClick={() => setWeekOffset(o => o + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Next
            <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* ── 7-day calendar grid ── */}
        <div style={{
          background: 'white', border: '1.5px solid #DDE8F5',
          borderRadius: 14, overflow: 'hidden', marginBottom: 24,
        }}>
          {/* Scrollable row of day columns */}
          <div style={{
            display: 'flex', overflowX: 'auto',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          }}>
            {weekDays.map((dayDate, idx) => {
              const isToday    = sameDay(dayDate, today)
              const dayBookings = bookingsForDay(dayDate)
              const isPast     = dayDate < today && !isToday

              return (
                <div
                  key={idx}
                  style={{
                    minWidth: COL_W, flex: `0 0 ${COL_W}px`,
                    borderRight: idx < 6 ? '1px solid #EEF4FB' : 'none',
                    borderLeft: isToday ? '3px solid #1D9E75' : undefined,
                    display: 'flex', flexDirection: 'column',
                    opacity: isPast ? 0.55 : 1,
                  }}
                >
                  {/* Day header */}
                  <div style={{
                    padding: '10px 8px 8px',
                    textAlign: 'center',
                    borderBottom: '1px solid #EEF4FB',
                    background: isToday ? '#F0FBF7' : 'transparent',
                  }}>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color: '#A0B8D0',
                      textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px',
                    }}>
                      {DAY_NAMES[dayDate.getDay()]}
                    </p>
                    {/* Date circle */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isToday ? '#1D9E75' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto',
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: 700,
                        color: isToday ? 'white' : isPast ? '#C0D4E8' : '#0A2540',
                        lineHeight: 1,
                      }}>
                        {dayDate.getDate()}
                      </span>
                    </div>
                    {/* Booking count dot */}
                    {dayBookings.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, gap: 2 }}>
                        {dayBookings.slice(0, 3).map((_, i) => (
                          <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#1D9E75' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking slots */}
                  <div style={{ flex: 1, padding: '8px 6px', minHeight: 80 }}>
                    {dayBookings.length > 0 ? (
                      dayBookings.map(b => <SlotCard key={b.id} booking={b} />)
                    ) : (
                      <div style={{
                        height: '100%', minHeight: 64,
                        border: '1.5px dashed #EEF4FB', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 10, color: '#D0DDE8', fontWeight: 600 }}>Free</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Week summary footer */}
          <div style={{
            borderTop: '1px solid #EEF4FB', padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 16,
            background: '#FAFCFF',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-calendar-check" style={{ fontSize: 13, color: '#1D9E75' }} />
              <span style={{ fontSize: 12, color: '#5A7A9A' }}>
                <b style={{ color: '#0A2540' }}>{weekBookings.length}</b> booking{weekBookings.length !== 1 ? 's' : ''} this week
              </span>
            </div>
            {weekBookings.filter(b => b.status === 'confirmed').length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-clock" style={{ fontSize: 12, color: '#185FA5' }} />
                <span style={{ fontSize: 12, color: '#5A7A9A' }}>
                  <b style={{ color: '#0A2540' }}>{weekBookings.filter(b => b.status === 'confirmed').length}</b> confirmed
                </span>
              </div>
            )}
            {weekBookings.length === 0 && (
              <span style={{ fontSize: 12, color: '#A0B8D0' }}>No bookings this week</span>
            )}
          </div>
        </div>

        {/* ── Upcoming bookings list ── */}
        {upcomingList.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 12px' }}>
              Upcoming Bookings
            </p>
            {upcomingList.map(b => <BookingListCard key={b.id} booking={b} />)}
          </div>
        )}

        {/* No upcoming but has past bookings */}
        {upcomingList.length === 0 && allBookings.length > 0 && (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '32px 20px', textAlign: 'center', marginBottom: 24 }}>
            <i className="ti ti-calendar-check" style={{ fontSize: 36, color: '#9FE1CB', display: 'block', marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 4px', fontWeight: 600 }}>All caught up!</p>
            <p style={{ fontSize: 12, color: '#A0B8D0' }}>No upcoming bookings. Check back when new jobs are accepted.</p>
          </div>
        )}

      </div>
    </WorkerLayout>
  )
}

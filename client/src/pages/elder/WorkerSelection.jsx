import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import { API_URL } from '../../lib/supabase'

// ── Step indicator (same as ElderBook) ───────────────────────────────────────
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

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 16, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#EBF4FF', flexShrink: 0 }} className="shimmer" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, width: '55%', borderRadius: 6, background: '#EBF4FF', marginBottom: 8 }} className="shimmer" />
          <div style={{ height: 12, width: '80%', borderRadius: 6, background: '#EBF4FF', marginBottom: 8 }} className="shimmer" />
          <div style={{ height: 12, width: '40%', borderRadius: 6, background: '#EBF4FF' }} className="shimmer" />
        </div>
        <div style={{ width: 72, height: 40, borderRadius: 8, background: '#EBF4FF', alignSelf: 'center' }} className="shimmer" />
      </div>
      <style>{`
        @keyframes shimmer { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
        .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// ── Worker card ───────────────────────────────────────────────────────────────
function WorkerCard({ worker, selected, onSelect }) {
  const name = worker.users?.name || 'Worker'
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const distKm = (worker.distance_meters / 1000).toFixed(1)
  const skills = (worker.skills || []).slice(0, 3)
  const languages = worker.languages || []
  const hasRating = worker.rating && worker.rating > 0

  return (
    <div
      onClick={() => onSelect(worker)}
      style={{
        background: selected ? '#F0FBF7' : 'white',
        border: selected ? '2px solid #1D9E75' : '1.5px solid #DDE8F5',
        borderRadius: 14, padding: 16, marginBottom: 12,
        cursor: 'pointer', position: 'relative',
        transition: 'all 0.15s',
      }}
    >
      {/* Checkmark badge */}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: '50%',
          background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* LEFT — Avatar + distance */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {worker.photo_url ? (
            <img src={worker.photo_url} alt={name}
              style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDE8F5' }} />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'Noto Sans, sans-serif',
            }}>
              {initials}
            </div>
          )}
          <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600, fontFamily: 'Noto Sans, sans-serif', whiteSpace: 'nowrap' }}>
            {distKm} km away
          </span>
        </div>

        {/* CENTER — Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 6px', fontFamily: 'Noto Sans, sans-serif' }}>
            {name}
          </p>

          {/* Skills */}
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {skills.map(skill => (
                <span key={skill} style={{
                  fontSize: 10, fontWeight: 600, color: '#0F6E56',
                  background: '#F0FBF7', border: '1px solid #9FE1CB',
                  borderRadius: 20, padding: '2px 8px', fontFamily: 'Noto Sans, sans-serif',
                  textTransform: 'capitalize',
                }}>
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {hasRating ? (
              <>
                <i className="ti ti-star-filled" style={{ fontSize: 13, color: '#F4A942' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2540', fontFamily: 'Noto Sans, sans-serif' }}>
                  {worker.rating.toFixed(1)}
                </span>
              </>
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#185FA5',
                background: '#EBF4FF', borderRadius: 20, padding: '2px 8px', fontFamily: 'Noto Sans, sans-serif',
              }}>
                New
              </span>
            )}
          </div>

          {/* Experience */}
          {worker.experience_years > 0 && (
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: '0 0 2px', fontFamily: 'Noto Sans, sans-serif' }}>
              {worker.experience_years} years experience
            </p>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0, fontFamily: 'Noto Sans, sans-serif' }}>
              Speaks: {languages.join(', ')}
            </p>
          )}
        </div>

        {/* RIGHT — Select button */}
        <div style={{ flexShrink: 0, alignSelf: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); onSelect(worker) }}
            style={{
              height: 40, padding: '0 14px', borderRadius: 8,
              border: selected ? 'none' : '1.5px solid #1D9E75',
              background: selected ? '#1D9E75' : 'white',
              color: selected ? 'white' : '#1D9E75',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Noto Sans, sans-serif', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {selected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkerSelection() {
  const navigate = useNavigate()

  const [parsed, setParsed] = useState(null)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('nearest')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [radius, setRadius] = useState(10000)
  const [manualSearch, setManualSearch] = useState(false)
  const [manualArea, setManualArea] = useState('')

  // Load parsed booking from step 1
  useEffect(() => {
    const stored = sessionStorage.getItem('booking_parsed')
    if (!stored) { navigate('/elder/book'); return }
    setParsed(JSON.parse(stored))
  }, [navigate])

  const fetchWorkers = useCallback(async (currentRadius) => {
    if (!parsed) return
    setLoading(true)
    setError(null)

    try {
      // Try browser geolocation first
      const coords = await new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return }
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        )
      })

      const lat = coords?.lat ?? 30.7333
      const lng = coords?.lng ?? 76.7794

      const params = new URLSearchParams({
        lat, lng,
        skill: parsed.service_type,
        radius: currentRadius,
      })

      const res = await fetch(`${API_URL}/api/worker/nearby?${params}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setWorkers(data.workers || [])
    } catch (e) {
      setError('Could not fetch workers. Please try again.')
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [parsed])

  useEffect(() => {
    if (parsed) fetchWorkers(radius)
  }, [parsed, fetchWorkers, radius])

  function getSortedWorkers() {
    const arr = [...workers]
    if (filter === 'nearest') arr.sort((a, b) => a.distance_meters - b.distance_meters)
    else if (filter === 'rated') arr.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (filter === 'experienced') arr.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0))
    return arr
  }

  function handleIncreaseRadius() {
    setRadius(20000)
  }

  function handleContinue() {
    sessionStorage.setItem('booking_worker', JSON.stringify(selectedWorker))
    navigate('/elder/book/confirm')
  }

  // Bottom bar label
  function getBottomLabel() {
    if (!selectedWorker || !parsed) return null
    const name = selectedWorker.users?.name || 'Worker'
    const svc = parsed.service_type?.charAt(0).toUpperCase() + parsed.service_type?.slice(1)
    const d = new Date(parsed.scheduled_at)
    const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    return `${svc} · ${name} · ${dateStr} ${timeStr}`
  }

  const sorted = getSortedWorkers()
  const FILTERS = [
    { key: 'nearest', label: 'Nearest First' },
    { key: 'rated', label: 'Highest Rated' },
    { key: 'experienced', label: 'Most Experienced' },
  ]

  return (
    <ElderLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 120px' }}>
        <StepDots step={2} />

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: '0 0 4px', fontFamily: 'Noto Sans, sans-serif' }}>
          Available Helpers Nearby
        </h1>
        {!loading && workers.length > 0 && (
          <p style={{ fontSize: 14, color: '#1D9E75', fontWeight: 600, margin: '0 0 20px', fontFamily: 'Noto Sans, sans-serif' }}>
            {workers.length} verified worker{workers.length !== 1 ? 's' : ''} found near you
          </p>
        )}
        {!loading && workers.length === 0 && (
          <div style={{ height: 20, marginBottom: 20 }} />
        )}
        {loading && <div style={{ height: 24, marginBottom: 20 }} />}

        {/* Filter pills */}
        {!loading && workers.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  height: 34, padding: '0 14px', borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: filter === f.key ? '#1D9E75' : '#DDE8F5',
                  background: filter === f.key ? '#1D9E75' : 'white',
                  color: filter === f.key ? 'white' : '#5A7A9A',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Noto Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Worker list */}
        {!loading && sorted.map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            selected={selectedWorker?.id === worker.id}
            onSelect={setSelectedWorker}
          />
        ))}

        {/* Empty state */}
        {!loading && workers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <i className="ti ti-map-pin" style={{ fontSize: 48, color: '#A0B8D0', display: 'block', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '0 0 8px', fontFamily: 'Noto Sans, sans-serif' }}>
              No verified workers found nearby
            </p>
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 24px', fontFamily: 'Noto Sans, sans-serif' }}>
              Try increasing search radius or book for a different time
            </p>
            {radius < 20000 && (
              <button
                onClick={handleIncreaseRadius}
                style={{
                  height: 44, padding: '0 20px', borderRadius: 10,
                  border: '1.5px solid #1D9E75', background: 'white',
                  color: '#1D9E75', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif', marginBottom: 16,
                  display: 'block', margin: '0 auto 16px',
                }}
              >
                Increase radius to 20km
              </button>
            )}
            {!manualSearch ? (
              <button
                onClick={() => setManualSearch(true)}
                style={{ fontSize: 14, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif', textDecoration: 'underline' }}
              >
                Search Manually
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, maxWidth: 320, margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Type area or city name..."
                  value={manualArea}
                  onChange={e => setManualArea(e.target.value)}
                  style={{
                    flex: 1, height: 44, borderRadius: 10, border: '1.5px solid #DDE8F5',
                    padding: '0 12px', fontSize: 14, fontFamily: 'Noto Sans, sans-serif',
                  }}
                />
                <button
                  onClick={() => fetchWorkers(radius)}
                  style={{
                    height: 44, padding: '0 16px', borderRadius: 10,
                    border: 'none', background: '#1D9E75', color: 'white',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif',
                  }}
                >
                  Search
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#E24B4A', fontFamily: 'Noto Sans, sans-serif' }}>{error}</p>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #DDE8F5',
        padding: '0 20px', height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 100,
      }}>
        <div>
          {selectedWorker ? (
            <p style={{ fontSize: 13, color: '#0A2540', fontWeight: 600, margin: 0, fontFamily: 'Noto Sans, sans-serif', maxWidth: 200 }}>
              {getBottomLabel()}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0, fontFamily: 'Noto Sans, sans-serif' }}>
              No worker selected
            </p>
          )}
        </div>
        <button
          onClick={handleContinue}
          disabled={!selectedWorker}
          style={{
            height: 48, padding: '0 24px', borderRadius: 12,
            border: 'none',
            background: selectedWorker ? '#1D9E75' : '#DDE8F5',
            color: selectedWorker ? 'white' : '#A0B8D0',
            fontSize: 15, fontWeight: 700,
            cursor: selectedWorker ? 'pointer' : 'not-allowed',
            fontFamily: 'Noto Sans, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          Continue →
        </button>
      </div>
    </ElderLayout>
  )
}

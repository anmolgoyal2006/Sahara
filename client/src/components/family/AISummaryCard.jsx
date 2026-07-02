import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const AUTO_REFRESH_MS = 30 * 60 * 1000  // 30 minutes

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 14, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, #EEF4FB 25%, #DDE8F5 50%, #EEF4FB 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer9 1.4s infinite',
      ...style,
    }} />
  )
}

export default function AISummaryCard({ familyUserId }) {
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)
  const intervalRef = useRef(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res  = await fetch(`${API_URL}/api/family/daily-summary/${familyUserId}`)
      const data = await res.json()
      if (data.success && data.summary) {
        setSummary(data.summary)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [familyUserId])

  useEffect(() => {
    if (!familyUserId) return
    fetchSummary()
    intervalRef.current = setInterval(fetchSummary, AUTO_REFRESH_MS)
    return () => clearInterval(intervalRef.current)
  }, [familyUserId, fetchSummary])

  return (
    <div style={{
      background: 'linear-gradient(135deg, #EBF4FF, #F0FBF7)',
      border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 20,
      marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      <style>{`
        @keyframes shimmer9 {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F0FBF7', border: '1px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-leaf" style={{ fontSize: 14, color: '#1D9E75' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2540' }}>AI Daily Summary</span>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          aria-label="Refresh summary"
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #DDE8F5', background: 'white', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="ti ti-refresh" style={{ fontSize: 15, color: loading ? '#DDE8F5' : '#5A7A9A', transition: 'color 0.15s' }} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 0 12px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="100%" height={14} />
            <Skeleton width="88%" height={14} />
            <Skeleton width="72%" height={14} />
          </div>
        ) : error ? (
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0, fontStyle: 'italic' }}>
            Could not generate summary. Check the details below.
          </p>
        ) : (
          <p style={{ fontSize: 14, color: '#0A2540', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            {summary}
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0, borderTop: '1px solid #DDE8F5', paddingTop: 10, lineHeight: 1.5 }}>
        AI-generated summary. Always call your parent to check in personally.
      </p>
    </div>
  )
}

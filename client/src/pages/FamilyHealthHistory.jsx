import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FamilyLayout from '../components/layout/FamilyLayout'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hrs  < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function MiniTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <p style={{ fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke, margin: '1px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', low: '😔', bad: '😟' }

function MetricBadge({ value, unit, color = '#0A2540' }) {
  if (value == null) return <span style={{ color: '#DDE8F5', fontSize: 13 }}>—</span>
  return (
    <span style={{ fontWeight: 700, fontSize: 14, color }}>
      {value}<span style={{ fontSize: 10, color: '#A0B8D0', fontWeight: 500, marginLeft: 2 }}>{unit}</span>
    </span>
  )
}

export default function FamilyHealthHistory() {
  const navigate = useNavigate()

  const [userName,  setUserName]  = useState(null)
  const [elderId,   setElderId]   = useState(null)
  const [elderName, setElderName] = useState(null)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [notLinked, setNotLinked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id
      setUserName(session.user.user_metadata?.name || null)

      try {
        const overviewRes  = await fetch(`${API_URL}/api/family/elder-overview/${uid}`)
        const overviewData = await overviewRes.json()

        if (!overviewData.success || !overviewData.linked || !overviewData.elder) {
          setNotLinked(true)
          setLoading(false)
          return
        }

        const eid = overviewData.elder.id
        setElderId(eid)
        setElderName(overviewData.elder.name)

        const histRes  = await fetch(`${API_URL}/api/health/history/${eid}?limit=60`)
        const histData = await histRes.json()
        setLogs(histData.logs || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    })
  }, [])

  // Chart data — oldest first, needs BP
  const chartData = [...logs]
    .filter(l => l.bp_systolic || l.bp_diastolic)
    .reverse()
    .slice(-20)
    .map(l => ({
      date: new Date(l.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      systolic:  l.bp_systolic  || null,
      diastolic: l.bp_diastolic || null,
    }))

  if (loading) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ textAlign: 'center', padding: 60, color: '#A0B8D0' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 10, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Loading health history…
        </div>
      </FamilyLayout>
    )
  }

  if (notLinked) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
          <i className="ti ti-user-off" style={{ fontSize: 48, color: '#A0B8D0', display: 'block', marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>No elder linked yet</p>
          <button onClick={() => navigate('/family/dashboard')} style={{ height: 44, padding: '0 24px', borderRadius: 12, background: '#185FA5', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Go to Dashboard
          </button>
        </div>
      </FamilyLayout>
    )
  }

  return (
    <FamilyLayout userName={userName}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => navigate('/family/dashboard')} style={{ background: 'none', border: 'none', padding: '0 0 16px', color: '#185FA5', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back to Dashboard
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>
            {elderName ? `${elderName}'s` : ''} Health History
          </h1>
          <p style={{ fontSize: 14, color: '#A0B8D0' }}>Last {logs.length} entries</p>
        </div>

        {/* BP Trend Chart */}
        {chartData.length >= 2 && (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>Blood Pressure Trend</p>
            <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
              {[{ color: '#E24B4A', label: 'Systolic' }, { color: '#185FA5', label: 'Diastolic' }].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#5A7A9A' }}>{s.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#EEF4FB" vertical={false} />
                <XAxis dataKey="date" fontSize={9} stroke="#A0B8D0" tickLine={false} />
                <YAxis fontSize={9} stroke="#A0B8D0" domain={[60, 180]} tickLine={false} />
                <Tooltip content={<MiniTooltip />} />
                <ReferenceLine y={140} stroke="#FECACA" strokeDasharray="3 3" label={{ value: 'High', fontSize: 8, fill: '#E24B4A', position: 'insideTopRight' }} />
                <Line dataKey="systolic"  name="Systolic"  stroke="#E24B4A" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line dataKey="diastolic" name="Diastolic" stroke="#185FA5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Log list */}
        {logs.length === 0 ? (
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}>
            <i className="ti ti-heart-rate-monitor" style={{ fontSize: 48, color: '#DDE8F5', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>No health logs yet</p>
            <p style={{ fontSize: 14, color: '#A0B8D0' }}>{elderName || 'They'} haven't logged any readings</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map(log => (
              <div key={log.id} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#A0B8D0' }}>{formatDate(log.logged_at)}</span>
                  {log.mood && <span style={{ fontSize: 18 }}>{MOOD_EMOJI[log.mood] || ''}</span>}
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#A0B8D0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Blood Pressure</p>
                    {log.bp_systolic && log.bp_diastolic
                      ? <MetricBadge value={`${log.bp_systolic}/${log.bp_diastolic}`} unit="mmHg" color="#E24B4A" />
                      : <span style={{ color: '#DDE8F5', fontSize: 13 }}>—</span>}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#A0B8D0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Blood Sugar</p>
                    <MetricBadge value={log.sugar_level} unit="mg/dL" color="#BA7517" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#A0B8D0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Weight</p>
                    <MetricBadge value={log.weight} unit="kg" color="#185FA5" />
                  </div>
                  {log.heart_rate && (
                    <div>
                      <p style={{ fontSize: 10, color: '#A0B8D0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Heart Rate</p>
                      <MetricBadge value={log.heart_rate} unit="bpm" color="#1D9E75" />
                    </div>
                  )}
                </div>
                {log.notes && (
                  <p style={{ fontSize: 12, color: '#5A7A9A', marginTop: 8, marginBottom: 0, fontStyle: 'italic' }}>"{log.notes}"</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </FamilyLayout>
  )
}

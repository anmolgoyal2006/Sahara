import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

function relativeTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  if (hrs  < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
}

// Transform health_logs array → chart-ready data (oldest first)
function toChartData(logs) {
  return [...logs]
    .filter(l => l.bp_systolic || l.bp_diastolic)
    .reverse()
    .map(l => ({
      date: new Date(l.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      systolic:  l.bp_systolic  || null,
      diastolic: l.bp_diastolic || null,
    }))
}

// Compact BP tooltip
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

// Compact metric pill
function MetricPill({ label, value, unit, color = '#0A2540' }) {
  if (!value) return null
  return (
    <div style={{ flex: 1, background: '#F8FAFD', border: '1px solid #EEF4FB', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: '#A0B8D0', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 800, color, margin: '0 0 1px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#A0B8D0', margin: 0 }}>{unit}</p>
    </div>
  )
}

export default function FamilyHealthSection({ healthLogs = [], elderName = 'They' }) {
  const navigate   = useNavigate()
  const latest     = healthLogs[0] || null
  const chartData  = toChartData(healthLogs)
  const showChart  = chartData.length >= 2

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 20, marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0 }}>Health This Week</p>
        <button
          onClick={() => navigate('/family/health')}
          style={{ background: 'none', border: 'none', padding: 0, color: '#185FA5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          View Full History
        </button>
      </div>

      {/* Empty state */}
      {healthLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <i className="ti ti-heart-rate-monitor" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: '#A0B8D0', margin: '0 0 4px' }}>{elderName} hasn't logged health this week</p>
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>Encourage them to log daily</p>
        </div>
      ) : (
        <>
          {/* Mini BP chart */}
          {showChart && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: '#5A7A9A' }}>Systolic</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#185FA5', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: '#5A7A9A' }}>Diastolic</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF4FB" vertical={false} />
                  <XAxis dataKey="date" fontSize={9} stroke="#A0B8D0" tickLine={false} />
                  <YAxis fontSize={9} stroke="#A0B8D0" domain={[60, 180]} tickLine={false} />
                  <Tooltip content={<MiniTooltip />} />
                  <ReferenceLine y={140} stroke="#FECACA" strokeDasharray="3 3"
                    label={{ value: 'High', fontSize: 8, fill: '#E24B4A', position: 'insideTopRight' }}
                  />
                  <Line dataKey="systolic"  name="Systolic"  stroke="#E24B4A" strokeWidth={2} dot={{ r: 3, fill: '#E24B4A' }} connectNulls />
                  <Line dataKey="diastolic" name="Diastolic" stroke="#185FA5" strokeWidth={2} dot={{ r: 3, fill: '#185FA5' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {healthLogs.length === 1 && (
            <p style={{ fontSize: 11, color: '#A0B8D0', marginBottom: 10 }}>Only 1 reading this week</p>
          )}

          {/* Latest reading metrics */}
          {latest && (
            <div style={{ display: 'flex', gap: 8 }}>
              <MetricPill
                label="BP"
                value={latest.bp_systolic && latest.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : null}
                unit="mmHg"
                color="#E24B4A"
              />
              <MetricPill
                label="Sugar"
                value={latest.sugar_level}
                unit="mg/dL"
                color="#BA7517"
              />
              <MetricPill
                label="Weight"
                value={latest.weight}
                unit="kg"
                color="#185FA5"
              />
            </div>
          )}
        </>
      )}

      {/* Last updated */}
      {latest && (
        <p style={{ fontSize: 11, color: '#A0B8D0', margin: '12px 0 0' }}>
          Last updated: {relativeTime(latest.logged_at)}
        </p>
      )}
    </div>
  )
}

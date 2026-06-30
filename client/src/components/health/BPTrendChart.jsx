import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const count = payload[0]?.payload?.count
  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong> mmHg
        </p>
      ))}
      {count > 1 && <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 4 }}>avg of {count} readings</p>}
    </div>
  )
}

export default function BPTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Blood Pressure Trend</p>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#A0B8D0' }}>
          <i className="ti ti-chart-line" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Not enough data yet</p>
          <p style={{ fontSize: 12 }}>Log your health for a few days to see trends</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 16, padding: 16, marginBottom: 16,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Blood Pressure Trend</p>
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#5A7A9A' }}>Systolic</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#185FA5', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#5A7A9A' }}>Diastolic</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#EEF4FB" vertical={false} />
          <XAxis dataKey="date" fontSize={10} stroke="#A0B8D0" tickLine={false} />
          <YAxis fontSize={10} stroke="#A0B8D0" domain={[60, 180]} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={140} stroke="#FECACA" strokeDasharray="4 4"
            label={{ value: 'High', fontSize: 9, fill: '#E24B4A', position: 'insideTopRight' }}
          />
          <Line
            dataKey="systolic" name="Systolic"
            stroke="#E24B4A" strokeWidth={2.5}
            dot={{ r: 4, fill: '#E24B4A' }}
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            dataKey="diastolic" name="Diastolic"
            stroke="#185FA5" strokeWidth={2.5}
            dot={{ r: 4, fill: '#185FA5' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

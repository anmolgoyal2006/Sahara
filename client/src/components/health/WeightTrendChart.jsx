import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
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
        <p key={p.dataKey} style={{ color: '#185FA5', margin: '2px 0' }}>
          Weight: <strong>{p.value}</strong> kg
        </p>
      ))}
      {count > 1 && <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 4 }}>avg of {count} readings</p>}
    </div>
  )
}

export default function WeightTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Weight Trend</p>
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
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Weight Trend</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#EEF4FB" vertical={false} />
          <XAxis dataKey="date" fontSize={10} stroke="#A0B8D0" tickLine={false} />
          <YAxis fontSize={10} stroke="#A0B8D0" tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="weight" name="Weight"
            stroke="#185FA5" strokeWidth={2.5}
            fill="#EBF4FF" fillOpacity={0.6}
            dot={{ r: 4, fill: '#185FA5' }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

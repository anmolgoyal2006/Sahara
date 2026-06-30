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
          Blood Sugar: <strong>{p.value}</strong> mg/dL
        </p>
      ))}
      {count > 1 && <p style={{ fontSize: 10, color: '#A0B8D0', marginTop: 4 }}>avg of {count} readings</p>}
    </div>
  )
}

export default function SugarTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Blood Sugar Trend</p>
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
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Blood Sugar Trend</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#EEF4FB" vertical={false} />
          <XAxis dataKey="date" fontSize={10} stroke="#A0B8D0" tickLine={false} />
          <YAxis fontSize={10} stroke="#A0B8D0" domain={[60, 220]} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={125} stroke="#FDE68A" strokeDasharray="4 4"
            label={{ value: 'Pre-diabetic', fontSize: 9, fill: '#BA7517', position: 'insideTopRight' }}
          />
          <ReferenceLine
            y={180} stroke="#FECACA" strokeDasharray="4 4"
            label={{ value: 'High', fontSize: 9, fill: '#E24B4A', position: 'insideTopRight' }}
          />
          <Line
            dataKey="sugar" name="Blood Sugar"
            stroke="#BA7517" strokeWidth={2.5}
            dot={{ r: 4, fill: '#BA7517' }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

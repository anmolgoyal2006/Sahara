const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pctColor(pct) {
  if (pct >= 80) return '#1D9E75'
  if (pct >= 50) return '#BA7517'
  return '#E24B4A'
}

function pctBg(pct) {
  if (pct >= 80) return '#F0FBF7'
  if (pct >= 50) return '#FEF3DC'
  return '#FFF0F0'
}

export default function AdherenceCard({ adherence }) {
  if (!adherence) return null
  const { percentage = 100, taken = 0, total = 0, dailyBreakdown = [] } = adherence
  const color = pctColor(percentage)

  // Build last 7 days including today
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const found = dailyBreakdown.find(b => b.date === key)
    days.push({ date: key, dayLetter: DAY_LETTERS[d.getDay()], data: found || null })
  }

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>This Week</p>
        <div style={{
          background: pctBg(percentage), borderRadius: 20,
          padding: '4px 12px',
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color }}>{percentage}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 99, background: '#EEF4FB', marginBottom: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${percentage}%`,
          background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Label */}
      <p style={{ fontSize: 12, color: '#A0B8D0', margin: '0 0 16px' }}>
        {taken} of {total} dose{total !== 1 ? 's' : ''} taken
      </p>

      {/* 7-day mini calendar */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {days.map(({ date, dayLetter, data }) => {
          let bg = 'transparent'
          let border = '1.5px solid #DDE8F5'
          let dotColor = '#DDE8F5'

          if (data) {
            if (data.complete) {
              bg = '#1D9E75'; border = 'none'; dotColor = 'white'
            } else if (data.taken > 0) {
              bg = '#FEF3DC'; border = '1.5px solid #F5C77A'; dotColor = '#BA7517'
            } else {
              bg = 'transparent'; border = '1.5px solid #FECACA'; dotColor = '#E24B4A'
            }
          }

          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: bg, border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {data && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: dotColor,
                  }} />
                )}
              </div>
              <span style={{ fontSize: 9, color: '#A0B8D0', fontWeight: 600 }}>{dayLetter}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

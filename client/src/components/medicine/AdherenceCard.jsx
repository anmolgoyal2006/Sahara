const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  const todayKey = new Date().toISOString().split('T')[0]

  // Build last 7 days including today
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const found = dailyBreakdown.find(b => b.date === key)
    days.push({
      date: key,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      isToday: key === todayKey,
      data: found || null,
    })
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
      <p style={{ fontSize: 12, color: '#A0B8D0', margin: '0 0 18px' }}>
        {taken} of {total} dose{total !== 1 ? 's' : ''} taken
      </p>

      {/* 7-day mini calendar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {days.map(({ date, dayName, dayNum, isToday, data }) => {
          let bg = 'white'
          let border = '1.5px solid #DDE8F5'
          let iconColor = '#C7D6E8'
          let icon = null

          if (data) {
            if (data.complete) {
              bg = '#1D9E75'; border = 'none'; iconColor = 'white'; icon = 'ti-check'
            } else if (data.taken > 0) {
              bg = '#FEF3DC'; border = '1.5px solid #F5C77A'; iconColor = '#BA7517'; icon = 'ti-minus'
            } else {
              bg = '#FFF0F0'; border = '1.5px solid #FECACA'; iconColor = '#E24B4A'; icon = 'ti-x'
            }
          }

          return (
            <div
              key={date}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                flex: 1, minWidth: 0,
              }}
            >
              {/* Day name — full 3-letter abbreviation, never ambiguous */}
              <span style={{
                fontSize: 12, fontWeight: isToday ? 800 : 600,
                color: isToday ? '#0A2540' : '#7B93AC',
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {dayName}
              </span>

              {/* Date + status box */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: bg, border,
                boxShadow: isToday ? '0 0 0 2px #185FA5' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {icon ? (
                  <i className={`ti ${icon}`} style={{ fontSize: 18, fontWeight: 700, color: iconColor }} />
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#B9C9DC' }}>{dayNum}</span>
                )}
              </div>

              {/* Today marker */}
              {isToday && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: '#185FA5',
                  textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  Today
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend so meaning of colors/icons is clear at a glance */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16,
        marginTop: 16, paddingTop: 14, borderTop: '1px solid #EEF4FB',
        flexWrap: 'wrap',
      }}>
        <LegendItem bg="#1D9E75" icon="ti-check" iconColor="white" label="Taken" />
        <LegendItem bg="#FEF3DC" border="1.5px solid #F5C77A" icon="ti-minus" iconColor="#BA7517" label="Partial" />
        <LegendItem bg="#FFF0F0" border="1.5px solid #FECACA" icon="ti-x" iconColor="#E24B4A" label="Missed" />
      </div>
    </div>
  )
}

function LegendItem({ bg, border, icon, iconColor, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 20, height: 20, borderRadius: 6, background: bg, border: border || 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 11, color: iconColor }} />
      </div>
      <span style={{ fontSize: 12, color: '#5A7A9A', fontWeight: 600 }}>{label}</span>
    </div>
  )
}
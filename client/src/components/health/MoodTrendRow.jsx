const MOOD_EMOJI = {
  very_happy: '😄',
  happy:      '😊',
  okay:       '😐',
  sad:        '😔',
  unwell:     '😞',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MoodTrendRow({ data = [] }) {
  // Build a map of date string → mood for last 7 days
  const moodMap = {}
  data.forEach(entry => {
    if (entry.mood && entry.fullDate) {
      const key = new Date(entry.fullDate).toDateString()
      moodMap[key] = entry.mood
    }
  })

  // Generate last 7 days (today included)
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d)
  }

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 16, padding: 16, marginBottom: 20,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 14 }}>Mood This Week</p>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
        {days.map(d => {
          const mood = moodMap[d.toDateString()]
          return (
            <div
              key={d.toDateString()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}
            >
              <span style={{ fontSize: 9, color: '#A0B8D0', fontWeight: 600 }}>
                {DAY_LABELS[d.getDay()]}
              </span>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#F7FBFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: mood ? 18 : 14,
                color: mood ? 'inherit' : '#C0D4E8',
                border: '1.5px solid #DDE8F5',
              }}>
                {mood ? MOOD_EMOJI[mood] : '−'}
              </div>
              <span style={{ fontSize: 9, color: '#A0B8D0' }}>
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

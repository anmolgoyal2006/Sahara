const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_VALUES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function DaySelector({ selected = ['daily'], onChange }) {
  const isDaily = selected.includes('daily')

  function setMode(daily) {
    onChange(daily ? ['daily'] : ['mon'])
  }

  function toggleDay(dayVal) {
    if (selected.includes(dayVal)) {
      // Never allow deselecting the last day
      if (selected.length <= 1) return
      onChange(selected.filter(d => d !== dayVal))
    } else {
      onChange([...selected, dayVal])
    }
  }

  return (
    <div>
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#5A7A9A',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
      }}>
        Schedule
      </p>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', background: '#EBF4FF', borderRadius: 12,
        padding: 4, marginBottom: 12, gap: 4,
      }}>
        {['Every Day', 'Specific Days'].map((label, idx) => {
          const active = idx === 0 ? isDaily : !isDaily
          return (
            <button
              key={label}
              onClick={() => setMode(idx === 0)}
              style={{
                flex: 1, height: 36, borderRadius: 9,
                border: 'none',
                background: active ? 'white' : 'transparent',
                color: active ? '#0A2540' : '#A0B8D0',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Day chips — only when specific days mode */}
      {!isDaily && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DAYS.map((label, i) => {
            const val = DAY_VALUES[i]
            const active = selected.includes(val)
            return (
              <button
                key={val}
                onClick={() => toggleDay(val)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: active ? 'none' : '1.5px solid #DDE8F5',
                  background: active ? '#1D9E75' : 'white',
                  color: active ? 'white' : '#5A7A9A',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

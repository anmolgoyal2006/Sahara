export default function TimePicker({ times = [], onChange }) {
  function updateTime(index, value) {
    const updated = [...times]
    updated[index] = value
    onChange(updated)
  }

  function addTime() {
    onChange([...times, '09:00'])
  }

  function removeTime(index) {
    if (times.length <= 1) return
    onChange(times.filter((_, i) => i !== index))
  }

  return (
    <div>
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#5A7A9A',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
      }}>
        Reminder Times
      </p>

      {times.map((t, i) => (
        <div
          key={i}
          style={{
            background: 'white', border: '1.5px solid #DDE8F5',
            borderRadius: 12, padding: '12px 16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-clock" style={{ fontSize: 18, color: '#1D9E75' }} />
            <input
              type="time"
              value={t}
              onChange={e => updateTime(i, e.target.value)}
              style={{
                fontSize: 18, fontWeight: 700, color: '#0A2540',
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            />
          </div>
          {times.length > 1 && (
            <button
              onClick={() => removeTime(i)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1.5px solid #FECACA', background: '#FFF0F0',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}
            >
              <i className="ti ti-trash" style={{ fontSize: 15, color: '#E24B4A' }} />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addTime}
        style={{
          width: '100%', height: 44, borderRadius: 12,
          border: '1.5px solid #1D9E75', background: 'white',
          color: '#1D9E75', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <i className="ti ti-plus" style={{ fontSize: 14 }} />
        Add Another Time
      </button>
    </div>
  )
}

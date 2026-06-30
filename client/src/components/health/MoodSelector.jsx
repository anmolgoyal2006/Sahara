const MOODS = [
  { value: 'very_happy', emoji: '😄', label: 'Great' },
  { value: 'happy',      emoji: '😊', label: 'Good' },
  { value: 'okay',       emoji: '😐', label: 'Okay' },
  { value: 'sad',        emoji: '😔', label: 'Low' },
  { value: 'unwell',     emoji: '😞', label: 'Unwell' },
]

export default function MoodSelector({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {MOODS.map(mood => {
        const isSelected = selected === mood.value
        return (
          <button
            key={mood.value}
            onClick={() => onChange(mood.value)}
            style={{
              flex: 1,
              minWidth: 56,
              height: 72,
              background: isSelected ? '#F0FBF7' : 'white',
              border: `2px solid ${isSelected ? '#1D9E75' : '#DDE8F5'}`,
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>{mood.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? '#1D9E75' : '#5A7A9A', marginTop: 4 }}>
              {mood.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

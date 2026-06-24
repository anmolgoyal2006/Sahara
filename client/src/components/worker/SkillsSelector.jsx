export const SKILLS = [
  'Cooking', 'Cleaning', 'Nursing', 'Driving',
  'Physiotherapy', 'Home Repair', 'Companionship',
  'Medicine Management', 'Grocery Shopping',
  'Personal Care', 'Baby Care', 'Patient Care',
]

export const LANGUAGES = [
  'Hindi', 'English', 'Punjabi', 'Bengali',
  'Tamil', 'Telugu', 'Marathi', 'Gujarati',
]

export default function SkillsSelector({ selected, onChange, label, options, error }) {
  function toggle(item) {
    onChange(selected.includes(item)
      ? selected.filter(x => x !== item)
      : [...selected, item]
    )
  }

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
        <span style={{ color: '#A0B8D0', fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>(select at least 1)</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {options.map(item => {
          const sel = selected.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={sel}
              style={{
                padding: '8px 14px', borderRadius: 30, minHeight: 36,
                fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${sel ? '#1D9E75' : '#DDE8F5'}`,
                background: sel ? '#1D9E75' : 'white',
                color: sel ? 'white' : '#5A7A9A',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {item}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" style={{ fontSize: 11, color: '#E24B4A', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />{error}
        </p>
      )}
    </div>
  )
}

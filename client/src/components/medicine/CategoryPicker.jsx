import { MEDICINE_CATEGORIES } from '../../lib/medicineCategories'

export default function CategoryPicker({ selected, onChange }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        For Which Problem?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {MEDICINE_CATEGORIES.map(cat => {
          const isActive = selected === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 52, borderRadius: 12, padding: '0 14px',
                border: isActive ? `2px solid ${cat.color}` : '1.5px solid #DDE8F5',
                background: isActive ? `${cat.color}14` : 'white',
                cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: isActive ? cat.color : '#EEF4FB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${cat.icon}`} style={{ fontSize: 15, color: isActive ? 'white' : '#7B93AC' }} />
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: isActive ? '#0A2540' : '#5A7A9A',
                lineHeight: 1.2,
              }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default function RoleCard({ icon, title, description, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        border: `2px solid ${selected ? '#1D9E75' : '#DDE8F5'}`,
        borderRadius: 12,
        background: selected ? '#F0FBF7' : 'white',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
        outline: 'none',
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: selected ? '#1D9E75' : '#F7FBFF',
          border: `1.5px solid ${selected ? '#1D9E75' : '#DDE8F5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        <i
          className={`ti ti-${icon}`}
          style={{
            fontSize: 20,
            color: selected ? 'white' : '#5A7A9A',
          }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: selected ? '#0F6E56' : '#0A2540',
          margin: 0,
          marginBottom: 2,
        }}>
          {title}
        </p>
        <p style={{
          fontSize: 10,
          color: '#5A7A9A',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {description}
        </p>
      </div>

      {/* Radio indicator */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `2px solid ${selected ? '#1D9E75' : '#DDE8F5'}`,
          background: selected ? '#1D9E75' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {selected && (
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'white',
          }} />
        )}
      </div>
    </button>
  )
}

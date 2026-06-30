function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function MedicineInfoCard({ medicine, onEdit, onClose }) {
  if (!medicine) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 400,
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480,
        padding: '24px 20px 40px',
        fontFamily: 'Noto Sans, sans-serif',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#DDE8F5', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Name + dosage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#EBF4FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${medicine.icon || 'ti-pill'}`} style={{ fontSize: 22, color: medicine.color || '#1D9E75' }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0 }}>{medicine.name}</p>
            {medicine.dosage && (
              <p style={{ fontSize: 13, color: '#5A7A9A', margin: '2px 0 0' }}>{medicine.dosage}</p>
            )}
          </div>
        </div>

        {/* Times */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#A0B8D0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Reminder Times
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(medicine.times || []).map(t => (
              <span
                key={t}
                style={{
                  background: '#F0FBF7', border: '1px solid #9FE1CB',
                  borderRadius: 20, padding: '4px 12px',
                  fontSize: 13, fontWeight: 700, color: '#0F6E56',
                }}
              >
                <i className="ti ti-clock" style={{ marginRight: 4, fontSize: 11 }} />
                {formatTime(t)}
              </span>
            ))}
          </div>
        </div>

        {/* AI info note */}
        {medicine.info_note && (
          <div style={{
            background: '#EBF4FF', borderRadius: 12,
            padding: '12px 14px', marginBottom: 16,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 18, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#185FA5', margin: 0, lineHeight: 1.6 }}>
              {medicine.info_note}
            </p>
          </div>
        )}

        {/* Disclaimer — always visible */}
        <p style={{
          fontSize: 11, color: '#A0B8D0', lineHeight: 1.6,
          margin: '0 0 20px',
          background: '#F7FBFF', borderRadius: 10,
          padding: '10px 12px',
        }}>
          <i className="ti ti-shield-check" style={{ marginRight: 4 }} />
          This is general information only. Please consult your doctor or pharmacist for any questions about your medicines.
        </p>

        {/* Edit button */}
        <button
          onClick={onEdit}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            background: '#1D9E75', border: 'none',
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <i className="ti ti-edit" style={{ fontSize: 16 }} />Edit Medicine
        </button>
      </div>
    </div>
  )
}

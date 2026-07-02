function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

const STATUS_CONFIG = {
  taken:   { icon: 'ti-circle-check', color: '#1D9E75', label: 'Taken' },
  missed:  { icon: 'ti-circle-x',     color: '#E24B4A', label: 'Missed' },
  pending: { icon: 'ti-clock',         color: '#BA7517', label: 'Pending' },
  skipped: { icon: 'ti-minus',         color: '#A0B8D0', label: 'Skipped' },
}

function complianceBadge(pct) {
  if (pct === null) return null
  if (pct >= 80) return { label: 'On track',        color: '#1D9E75', bg: '#F0FBF7', border: '#9FE1CB' }
  if (pct >= 50) return { label: 'Needs attention', color: '#BA7517', bg: '#FAEEDA', border: '#F5C77A' }
  return              { label: 'Missed doses',      color: '#E24B4A', bg: '#FFF0F0', border: '#FECACA' }
}

export default function FamilyMedicineSection({ medicines = [], medLogs = [], medicineCompliance }) {
  const badge = complianceBadge(medicineCompliance)

  // Build display rows: merge medicine definition + today's log status
  const rows = medicines
    .flatMap(med =>
      (med.times || []).map(time => {
        const log = medLogs.find(
          l => l.medicine_id === med.id &&
               (l.scheduled_time === time || l.time === time)
        )
        return {
          key:     `${med.id}_${time}`,
          name:    med.name,
          dosage:  med.dosage,
          color:   med.color || '#1D9E75',
          icon:    med.icon  || 'ti-pill',
          time,
          status:  log?.status || 'pending',
        }
      })
    )
    .sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div style={{
      background: 'white', border: '1.5px solid #DDE8F5',
      borderRadius: 14, padding: 20, marginBottom: 20,
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0 }}>Medicines Today</p>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 20, padding: '3px 10px' }}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <i className="ti ti-pill" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>No medicines scheduled today</p>
        </div>
      ) : (
        rows.map((row, i) => {
          const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending
          const isLast = i === rows.length - 1
          return (
            <div
              key={row.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: isLast ? 'none' : '1px solid #EEF4FB',
              }}
            >
              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, background: row.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${row.icon}`} style={{ fontSize: 16, color: row.color }} />
              </div>

              {/* Name / dosage / time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>{row.name}</p>
                <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>
                  {row.dosage ? `${row.dosage} · ` : ''}{formatTime(row.time)}
                </p>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <i className={`ti ${cfg.icon}`} style={{ fontSize: 16, color: cfg.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

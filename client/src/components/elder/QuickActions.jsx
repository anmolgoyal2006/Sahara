import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STATUS_ICON = {
  taken:  'ti-circle-check',
  missed: 'ti-alert-circle',
  skipped: 'ti-minus-circle',
}

const STATUS_COLOR = {
  taken:  '#1D9E75',
  missed: '#E24B4A',
  skipped: '#A0B8D0',
}

const STATUS_BG = {
  taken:  '#F0FDF4',
  missed: '#FEF2F2',
  skipped: '#FAFAFA',
}

export default function QuickActions({ todaySchedule = [] }) {

  const takenCount = todaySchedule.filter(d => d.status === 'taken').length
  const totalCount = todaySchedule.length
  const navigate = useNavigate()
  const [showSOS, setShowSOS] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>
      {/* Today's Medicines */}
      <div style={{ flex: 1, background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Today's Medicines{totalCount > 0 && (
            <span style={{ color: '#1D9E75', marginLeft: 6 }}>({takenCount}/{totalCount} taken)</span>
          )}
        </p>
        {totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <i className="ti ti-pill" style={{ fontSize: 34, color: '#DDE8F5', display: 'block', marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: '#5A7A9A' }}>No medicines today</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {todaySchedule.map(dose => {
              const status = dose.status || 'pending'
              return (
                <div key={`${dose.medicine_id}_${dose.time}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: STATUS_BG[status] || '#FAFAFA',
                  border: '1px solid',
                  borderColor: status === 'taken' ? '#B8E6CB' : status === 'missed' ? '#FECACA' : '#EEF4FB',
                }}>
                  <i className={`ti ${STATUS_ICON[status] || 'ti-circle'}`} style={{ fontSize: 18, color: STATUS_COLOR[status] || '#D1D5DB' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2540', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dose.name}</p>
                    <p style={{ fontSize: 11, color: '#7A96B0' }}>{dose.dosage}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5A7A9A', whiteSpace: 'nowrap' }}>{dose.time}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Emergency card */}
      <div
        onClick={() => setShowSOS(true)}
        style={{
          width: 240, minWidth: 240,
          background: '#FFF0F0', borderRadius: 16, padding: '20px 16px',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          border: '1.5px solid #FECACA',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(226,75,74,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Emergency</p>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FDDDDD', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 26, color: '#E24B4A' }} />
        </div>
        <p style={{ fontSize: 14, color: '#E24B4A', fontWeight: 700, marginBottom: 2 }}>Tap to alert family</p>
        <p style={{ fontSize: 11, color: 'rgba(226,75,74,0.65)', marginBottom: 14 }}>Instant notification</p>
        <div style={{ height: 36, width: '100%', borderRadius: 10, background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <i className="ti ti-bell" style={{ fontSize: 14, color: 'white' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Send Alert</span>
        </div>
      </div>

      {/* SOS Modal */}
      {showSOS && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowSOS(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Are you sure?</p>
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 24 }}>This will immediately alert your family members.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSOS(false)} style={{ flex: 1, height: 48, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { setShowSOS(false); navigate('/elder/sos') }} style={{ flex: 1, height: 48, borderRadius: 10, border: 'none', background: '#E24B4A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Yes, Send Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

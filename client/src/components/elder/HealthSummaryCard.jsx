import { useNavigate } from 'react-router-dom'

function getBPStatus(s, d) {
  if (s > 140 || d > 90) return { label: 'High — See Doctor', color: '#E24B4A', bg: '#FFF0F0' }
  if (s > 130 || d > 85) return { label: 'Slightly High',     color: '#BA7517', bg: '#FAEEDA' }
  if (s < 110 || d < 70) return { label: 'Low',               color: '#185FA5', bg: '#EBF4FF' }
  return                         { label: 'Normal',            color: '#166534', bg: '#DCFCE7' }
}

function getSugarStatus(v) {
  if (v > 125)  return { label: 'High',         color: '#E24B4A', bg: '#FFF0F0' }
  if (v >= 100) return { label: 'Pre-diabetic',  color: '#BA7517', bg: '#FAEEDA' }
  return               { label: 'Normal',        color: '#166534', bg: '#DCFCE7' }
}

const MOOD_EMOJI = { very_happy: '😄', happy: '😊', okay: '😐', sad: '😔', unwell: '😞' }
const MOOD_LABEL = { very_happy: 'Very Happy', happy: 'Happy', okay: 'Okay', sad: 'Sad', unwell: 'Unwell' }

export default function HealthSummaryCard({ healthLog }) {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540' }}>Today's Health</p>
        <span onClick={() => navigate('/elder/health')} style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, cursor: 'pointer' }}>Log Now →</span>
      </div>

      {!healthLog ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <i className="ti ti-heart-rate-monitor" style={{ fontSize: 40, color: '#DDE8F5', display: 'block', marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 4 }}>No health data logged today</p>
          <p style={{ fontSize: 12, color: '#A0B8D0', marginBottom: 16 }}>Log your BP, sugar and mood</p>
          <button onClick={() => navigate('/elder/health')} style={{ height: 40, padding: '0 20px', borderRadius: 9, border: '1.5px solid #1D9E75', background: 'white', color: '#1D9E75', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Log Now</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: healthLog.ai_tip ? 14 : 0 }}>

            {healthLog.bp_systolic && (
              <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', border: '1px solid #EEF4FB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <i className="ti ti-heart-rate-monitor" style={{ fontSize: 14, color: '#E24B4A' }} />
                  <span style={{ fontSize: 10, color: '#5A7A9A', fontWeight: 600, textTransform: 'uppercase' }}>Blood Pressure</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 2 }}>{healthLog.bp_systolic}/{healthLog.bp_diastolic}</p>
                <span style={{ fontSize: 9, color: '#5A7A9A' }}>mmHg</span><br />
                {(() => { const s = getBPStatus(healthLog.bp_systolic, healthLog.bp_diastolic); return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, marginTop: 6, display: 'inline-block' }}>{s.label}</span> })()}
              </div>
            )}

            {healthLog.sugar_level && (
              <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', border: '1px solid #EEF4FB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <i className="ti ti-droplet" style={{ fontSize: 14, color: '#BA7517' }} />
                  <span style={{ fontSize: 10, color: '#5A7A9A', fontWeight: 600, textTransform: 'uppercase' }}>Blood Sugar</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 2 }}>{healthLog.sugar_level}</p>
                <span style={{ fontSize: 9, color: '#5A7A9A' }}>mg/dL</span><br />
                {(() => { const s = getSugarStatus(healthLog.sugar_level); return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, marginTop: 6, display: 'inline-block' }}>{s.label}</span> })()}
              </div>
            )}

            {healthLog.weight && (
              <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', border: '1px solid #EEF4FB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <i className="ti ti-scale" style={{ fontSize: 14, color: '#185FA5' }} />
                  <span style={{ fontSize: 10, color: '#5A7A9A', fontWeight: 600, textTransform: 'uppercase' }}>Weight</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 2 }}>{healthLog.weight}</p>
                <span style={{ fontSize: 9, color: '#5A7A9A' }}>kg</span>
              </div>
            )}

            {healthLog.mood && (
              <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', border: '1px solid #EEF4FB', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#5A7A9A', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Feeling</span>
                <span style={{ fontSize: 32 }}>{MOOD_EMOJI[healthLog.mood] || '😐'}</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2540', marginTop: 4 }}>{MOOD_LABEL[healthLog.mood] || 'Okay'}</p>
              </div>
            )}
          </div>

          {healthLog.ai_tip && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#BA7517', marginBottom: 4 }}>
                <i className="ti ti-bulb" style={{ fontSize: 12, marginRight: 4 }} />AI Insight
              </p>
              <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>{healthLog.ai_tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CompanionBanner() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate('/elder/companion')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #185FA5 100%)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', marginBottom: 24,
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(24,95,165,0.3)' : '0 2px 8px rgba(24,95,165,0.15)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-message-chatbot" style={{ fontSize: 22, color: 'white' }} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 3 }}>AI Companion</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Talk, remind, and check your health</p>
          <div className="companion-pills" style={{ display: 'flex', gap: 6 }}>
            {['Hindi', 'English', 'Punjabi'].map((l) => (
              <span key={l} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: 'white' }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className="ti ti-arrow-right" style={{ fontSize: 18, color: 'white' }} />
      </div>

      <style>{`@media (max-width: 480px) { .companion-pills { display: none !important; } }`}</style>
    </div>
  )
}

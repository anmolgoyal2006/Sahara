import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SERVICES = [
  { id: 'maid',            name: 'Book Maid',       icon: 'ti-home-2',       iconColor: '#1D9E75', iconBg: '#F0FBF7', badge: 'Available Now',   badgeBg: '#DCFCE7', badgeColor: '#166534', price: 'From ₹299/hr' },
  { id: 'nurse',           name: 'Book Nurse',      icon: 'ti-stethoscope',  iconColor: '#E24B4A', iconBg: '#FFF0F0', badge: 'Available Today', badgeBg: '#FEF3C7', badgeColor: '#92400E', price: 'From ₹499/hr' },
  { id: 'driver',          name: 'Book Driver',     icon: 'ti-car',          iconColor: '#185FA5', iconBg: '#EBF4FF', badge: 'Available Now',   badgeBg: '#DCFCE7', badgeColor: '#166534', price: 'From ₹249/hr' },
  { id: 'cook',            name: 'Book Cook',       icon: 'ti-chef-hat',     iconColor: '#BA7517', iconBg: '#FAEEDA', badge: 'Available Today', badgeBg: '#FEF3C7', badgeColor: '#92400E', price: 'From ₹349/hr' },
  { id: 'physiotherapist', name: 'Physiotherapy',   icon: 'ti-run',          iconColor: '#7C3AED', iconBg: '#F3EFFE', badge: 'Book Ahead',      badgeBg: '#EDE9FE', badgeColor: '#5B21B6', price: 'From ₹599/hr' },
  { id: 'repair',          name: 'Home Repair',     icon: 'ti-tools',        iconColor: '#EA580C', iconBg: '#FFF7ED', badge: 'Schedule',        badgeBg: '#FFEDD5', badgeColor: '#C2410C', price: 'From ₹199/visit' },
]

export default function ServiceTiles() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', marginBottom: 3 }}>Book a Service</p>
        <p style={{ fontSize: 12, color: '#5A7A9A' }}>Tap any service to find helpers near you</p>
      </div>

      <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {SERVICES.map((s) => (
          <div
            key={s.id}
            onClick={() => navigate(`/elder/book?service=${s.id}`)}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === s.id ? '#F0FBF7' : 'white',
              border: `1.5px solid ${hovered === s.id ? '#1D9E75' : '#DDE8F5'}`,
              borderRadius: 14, padding: '18px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              cursor: 'pointer', minHeight: 120,
              transform: hovered === s.id ? 'translateY(-2px)' : 'none',
              boxShadow: hovered === s.id ? '0 4px 16px rgba(29,158,117,0.12)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 13, background: s.iconBg, marginBottom: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: s.iconColor }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 5 }}>{s.name}</p>
            <span style={{ background: s.badgeBg, color: s.badgeColor, borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700, marginBottom: 4 }}>{s.badge}</span>
            <p style={{ fontSize: 10, color: '#5A7A9A', margin: 0 }}>{s.price}</p>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 767px) { .service-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  )
}

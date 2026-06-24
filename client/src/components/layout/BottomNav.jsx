import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { icon: 'ti-home',               label: 'Home',   route: '/elder/home' },
  { icon: 'ti-calendar-plus',      label: 'Book',   route: '/elder/book' },
  { icon: 'ti-message-chatbot',    label: 'Chat',   route: '/elder/companion' },
  { icon: 'ti-heart-rate-monitor', label: 'Health', route: '/elder/health' },
  { icon: 'ti-pill',               label: 'Meds',   route: '/elder/medicines' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <>
      <div className="bottom-nav-mobile" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: 'white', borderTop: '1px solid #DDE8F5', zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center' }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.route
          return (
            <div
              key={item.route}
              onClick={() => navigate(item.route)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 0', cursor: 'pointer', color: active ? '#1D9E75' : '#A0B8D0' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 22 }} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#1D9E75' }} />}
            </div>
          )
        })}
      </div>
      <style>{`
        .bottom-nav-mobile { display: flex; }
        @media (min-width: 1024px) { .bottom-nav-mobile { display: none !important; } }
      `}</style>
    </>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import BottomNav from './BottomNav'
import SOSButton from './SOSButton'

const NAV_ITEMS = [
  { icon: 'ti-home',               label: 'Home',      route: '/elder/home' },
  { icon: 'ti-calendar-plus',      label: 'Book',      route: '/elder/book' },
  { icon: 'ti-message-chatbot',    label: 'Chat',      route: '/elder/companion' },
  { icon: 'ti-heart-rate-monitor', label: 'Health',    route: '/elder/health' },
  { icon: 'ti-pill',               label: 'Medicines', route: '/elder/medicines' },
]

export default function ElderLayout({ children, userName }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>

      {/* DESKTOP SIDEBAR */}
      <div className="elder-sidebar">
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #DDE8F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, background: '#1D9E75', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-leaf" style={{ color: 'white', fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#0A2540' }}>Sahara</span>
          </div>
          <p style={{ fontSize: 10, color: '#A0B8D0', marginLeft: 40 }}>Aapka Sahara, Hamesha</p>
        </div>

        <div style={{ padding: '16px 0', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.route
            return (
              <div
                key={item.route}
                onClick={() => navigate(item.route)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 20px', margin: '2px 12px', borderRadius: 10,
                  cursor: 'pointer', background: active ? '#F0FBF7' : 'transparent',
                  color: active ? '#1D9E75' : '#5A7A9A', fontWeight: 600, fontSize: 14,
                  borderLeft: active ? '3px solid #1D9E75' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
                {item.label}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #DDE8F5' }}>
          {userName && <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>{userName}</p>}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#0F6E56', marginBottom: 12 }}>
            <i className="ti ti-user" style={{ fontSize: 11 }} />Senior Member
          </div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', height: 40, borderRadius: 9, border: '1.5px solid #FECACA', background: 'white', color: '#E24B4A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <i className="ti ti-logout" style={{ fontSize: 14 }} />Log Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="elder-main">{children}</div>

      {/* MOBILE BOTTOM NAV */}
      <BottomNav />

      {/* SOS BUTTON */}
      <SOSButton />

      <style>{`
        .elder-sidebar { display: none; }
        .elder-main { padding: 20px 16px 88px; }
        @media (min-width: 1024px) {
          .elder-sidebar {
            display: flex; flex-direction: column;
            position: fixed; left: 0; top: 0; bottom: 0;
            width: 240px; background: white;
            border-right: 1px solid #DDE8F5; z-index: 50;
          }
          .elder-main { margin-left: 240px; padding: 32px 32px 32px; max-width: 1140px; }
        }
      `}</style>
    </div>
  )
}

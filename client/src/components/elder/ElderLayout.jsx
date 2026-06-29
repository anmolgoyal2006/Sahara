import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { icon: 'ti-home',        label: 'Home',      path: '/elder/home' },
  { icon: 'ti-calendar',   label: 'Bookings',  path: '/elder/bookings' },
  { icon: 'ti-pill',       label: 'Medicines', path: '/elder/medicines' },
  { icon: 'ti-message',    label: 'Chat',      path: '/elder/chat' },
  { icon: 'ti-user',       label: 'Profile',   path: '/elder/profile' },
]

export default function ElderLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sosModal, setSosModal] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    window.location.href = '/login'
  }

  function handleSosConfirm() {
    setSosModal(false)
    navigate('/elder/sos')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F8FF' }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="elder-sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '28px 24px 24px', borderBottom: '1px solid #E8F0FB' }}>
          <img src="/logo.jpeg" alt="Sahara Logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0A2540' }}>Sahara</span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10, border: 'none',
                  background: active ? '#EBF4FF' : 'transparent',
                  color: active ? '#185FA5' : '#5A7A9A',
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 18 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* SOS + Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #E8F0FB', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => setSosModal(true)}
            className="sos-pulse"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#E24B4A', color: 'white', border: 'none',
              borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            }}
          >
            <i className="ti ti-urgent" style={{ fontSize: 18 }} />
            SOS
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid #DDE8F5',
              color: '#5A7A9A', borderRadius: 10, padding: '10px 14px',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 16 }} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {children}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="elder-bottom-nav">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                flex: 1, border: 'none', background: 'transparent',
                color: active ? '#185FA5' : '#9AB0C8',
                fontWeight: active ? 700 : 400, fontSize: 10,
                cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0',
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
              {item.label}
            </button>
          )
        })}

        {/* SOS floating button */}
        <button
          onClick={() => setSosModal(true)}
          className="sos-pulse"
          style={{
            position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
            width: 56, height: 56, borderRadius: '50%',
            background: '#E24B4A', border: '3px solid white',
            color: 'white', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(226,75,74,0.5)',
          }}
        >
          <i className="ti ti-urgent" />
        </button>
      </nav>

      {/* ── SOS Modal ── */}
      {sosModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-urgent" style={{ fontSize: 30, color: '#E24B4A' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: '0 0 8px' }}>Send SOS Alert?</h2>
            <p style={{ fontSize: 14, color: '#5A7A9A', marginBottom: 24 }}>This will immediately notify your family and emergency contacts.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setSosModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSosConfirm}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#E24B4A', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Yes, Send SOS
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .elder-sidebar {
          width: 220px;
          background: white;
          border-right: 1px solid #E8F0FB;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
        }
        .elder-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: white;
          border-top: 1px solid #E8F0FB;
          padding: 4px 0;
          z-index: 100;
        }
        @media (max-width: 1023px) {
          .elder-sidebar { display: none; }
          .elder-bottom-nav { display: flex; }
          main { padding-bottom: 80px; }
        }
        .sos-pulse {
          animation: sosPulse 1.8s ease-in-out infinite;
        }
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(226,75,74,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(226,75,74,0); }
        }
      `}</style>
    </div>
  )
}

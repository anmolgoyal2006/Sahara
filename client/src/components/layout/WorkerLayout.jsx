import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, API_URL } from '../../lib/supabase'

const NAV_ITEMS = [
  { icon: 'ti-briefcase', label: 'My Jobs',     route: '/worker/jobs' },
  { icon: 'ti-clock',     label: 'Schedule',    route: '/worker/schedule' },
  { icon: 'ti-user',      label: 'My Profile',  route: '/worker/profile' },
  { icon: 'ti-map-pin',   label: 'My Location', route: '/worker/location' },
  { icon: 'ti-star',      label: 'My Ratings',  route: '/worker/ratings' },
]

export default function WorkerLayout({ children, workerName, workerId, available, onAvailabilityChange }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [toggling, setToggling] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    navigate('/login')
  }

  async function toggleAvailability() {
    if (!workerId || toggling) return
    setToggling(true)
    try {
      await fetch(`${API_URL}/api/worker/profile/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !available }),
      })
      onAvailabilityChange?.(!available)
    } catch {}
    setToggling(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>

      {/* DESKTOP SIDEBAR */}
      <div className="worker-sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #DDE8F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <img src="/logo.jpeg" alt="Sahara Logo" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontSize: 18, fontWeight: 900, color: '#0A2540' }}>Sahara</span>
          </div>
          <p style={{ fontSize: 10, color: '#A0B8D0', marginLeft: 40 }}>Care Worker Portal</p>
        </div>

        {/* Nav items */}
        <div style={{ padding: '16px 0', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.route
            return (
              <div
                key={item.route}
                onClick={() => navigate(item.route)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 20px', margin: '2px 12px', borderRadius: 10,
                  cursor: 'pointer',
                  background: active ? '#F0FBF7' : 'transparent',
                  color: active ? '#1D9E75' : '#5A7A9A',
                  fontWeight: 600, fontSize: 14,
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

        {/* Bottom: name, badge, availability, logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #DDE8F5' }}>
          {workerName && <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 4 }}>{workerName}</p>}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F0FBF7', border: '1px solid #9FE1CB', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#0F6E56', marginBottom: 12 }}>
            <i className="ti ti-stethoscope" style={{ fontSize: 11 }} />Care Worker
          </div>

          {/* Availability toggle */}
          <div
            onClick={toggleAvailability}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', padding: '8px 10px', borderRadius: 9, background: available ? '#F0FBF7' : '#F7F8FA', border: `1px solid ${available ? '#9FE1CB' : '#DDE8F5'}` }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: available ? '#1D9E75' : '#A0B8D0', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: available ? '#0F6E56' : '#5A7A9A', flex: 1 }}>{available ? 'Available' : 'Unavailable'}</span>
            {/* Toggle switch */}
            <div style={{ width: 36, height: 20, borderRadius: 10, background: available ? '#1D9E75' : '#DDE8F5', position: 'relative', transition: 'background 0.2s', opacity: toggling ? 0.6 : 1 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: available ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
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
      <div className="worker-main">{children}</div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="worker-bottom-nav">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.route
          return (
            <div
              key={item.route}
              onClick={() => navigate(item.route)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 0', cursor: 'pointer', color: active ? '#1D9E75' : '#A0B8D0' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 22 }} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label.split(' ')[1] || item.label.split(' ')[0]}</span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#1D9E75' }} />}
            </div>
          )
        })}
      </nav>

      <style>{`
        .worker-sidebar {
          display: none;
        }
        .worker-main {
          padding: 16px 16px 80px;
        }
        .worker-bottom-nav {
          display: flex;
          position: fixed; bottom: 0; left: 0; right: 0;
          height: 64px; background: white;
          border-top: 1px solid #DDE8F5;
          z-index: 100;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
          align-items: center;
        }
        @media (min-width: 1024px) {
          .worker-sidebar {
            display: flex; flex-direction: column;
            position: fixed; left: 0; top: 0; bottom: 0;
            width: 240px; background: white;
            border-right: 1px solid #DDE8F5; z-index: 50;
          }
          .worker-main {
            margin-left: 240px;
            padding: 32px;
            max-width: 1140px;
          }
          .worker-bottom-nav { display: none !important; }
        }
      `}</style>
    </div>
  )
}

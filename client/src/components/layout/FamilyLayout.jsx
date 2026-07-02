import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function FamilyLayout({ children, userName }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF', fontFamily: 'Noto Sans, sans-serif' }}>
      {/* Navbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #EEF4FB',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Left: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.jpeg" alt="Sahara" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0A2540' }}>Sahara</span>
        </div>

        {/* Center: title */}
        <span style={{ fontSize: 14, fontWeight: 700, color: '#5A7A9A', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          Family Dashboard
        </span>

        {/* Right: name + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {userName && (
            <span style={{ fontSize: 13, color: '#5A7A9A', fontWeight: 600, display: 'none' }}
              className="family-nav-name"
            >{userName}</span>
          )}
          <button
            onClick={handleLogout}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="ti ti-logout" style={{ fontSize: 13 }} />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 40px' }}>
        {children}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .family-nav-name { display: inline !important; }
        }
      `}</style>
    </div>
  )
}

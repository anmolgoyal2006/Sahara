import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Home',        page: 'home' },
  { label: 'Services',    page: 'services' },
  { label: 'For Families',page: 'families' },
  { label: 'For Workers', page: 'workers' },
  { label: 'About',       page: 'about' },
]

export default function Navbar({ activePage, showAuthButtons = true }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'white',
      borderBottom: '1px solid #DDE8F5',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
    }}>
      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/login')}>
        <div style={{
          background: '#1D9E75',
          width: 34,
          height: 34,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-leaf" style={{ color: 'white', fontSize: 18 }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#0A2540', letterSpacing: '-0.3px' }}>Sahara</span>
      </div>

      {/* ── Desktop nav links ── */}
      <div className="desktop-nav-links" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flex: 1,
        justifyContent: 'center',
      }}>
        {NAV_LINKS.map(({ label, page }) => (
          <span
            key={page}
            style={{
              fontSize: 12,
              fontWeight: activePage === page ? 700 : 400,
              color: activePage === page ? '#1D9E75' : '#5A7A9A',
              cursor: 'pointer',
              borderBottom: activePage === page ? '2px solid #1D9E75' : '2px solid transparent',
              paddingBottom: 2,
              transition: 'color 0.15s',
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* ── Desktop auth buttons ── */}
      {showAuthButtons && (
        <div className="desktop-auth-btns" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              height: 36,
              padding: '0 18px',
              border: '1.5px solid #1D9E75',
              borderRadius: 9,
              background: 'white',
              color: '#1D9E75',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              height: 36,
              padding: '0 18px',
              border: 'none',
              borderRadius: 9,
              background: '#1D9E75',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Get Started
          </button>
        </div>
      )}

      {/* ── Mobile hamburger ── */}
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          marginLeft: 'auto',
          color: '#0A2540',
        }}
        aria-label="Toggle menu"
      >
        <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} style={{ fontSize: 22 }} />
      </button>

      {/* ── Mobile dropdown ── */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: 52,
          left: 0,
          right: 0,
          background: 'white',
          borderBottom: '1px solid #DDE8F5',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 49,
        }}>
          {NAV_LINKS.map(({ label, page }) => (
            <span
              key={page}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 14,
                fontWeight: activePage === page ? 700 : 400,
                color: activePage === page ? '#1D9E75' : '#5A7A9A',
                padding: '10px 8px',
                cursor: 'pointer',
                borderBottom: '1px solid #F0F4F8',
              }}
            >
              {label}
            </span>
          ))}
          {showAuthButtons && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => { navigate('/login'); setMenuOpen(false) }}
                style={{
                  flex: 1,
                  height: 44,
                  border: '1.5px solid #1D9E75',
                  borderRadius: 9,
                  background: 'white',
                  color: '#1D9E75',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Login
              </button>
              <button
                onClick={() => { navigate('/register'); setMenuOpen(false) }}
                style={{
                  flex: 1,
                  height: 44,
                  border: 'none',
                  borderRadius: 9,
                  background: '#1D9E75',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .desktop-nav-links { display: none !important; }
          .desktop-auth-btns { display: none !important; }
          .hamburger-btn { display: flex !important; }
          nav { padding: 0 16px !important; height: 52px !important; }
        }
      `}</style>
    </nav>
  )
}

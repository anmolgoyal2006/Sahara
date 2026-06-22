import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SaharaButton from '../components/SaharaButton'
import { supabase } from '../lib/supabase'

const NEXT_ACTIONS = {
  elder: [
    { icon: 'ti-user-check', iconBg: '#F0FBF7', iconColor: '#1D9E75', title: 'Book a Care Helper', sub: 'Maid, nurse, driver available now' },
    { icon: 'ti-brain',      iconBg: '#EBF4FF', iconColor: '#185FA5', title: 'Talk to AI Companion', sub: 'Hindi, English, Punjabi support' },
    { icon: 'ti-users',      iconBg: '#FAEEDA', iconColor: '#BA7517', title: 'Invite Family Member', sub: 'Let them monitor your health' },
    { icon: 'ti-heart-rate-monitor', iconBg: '#FFF0F0', iconColor: '#E24B4A', title: 'Set Up Health Profile', sub: 'Log BP, sugar, medicines' },
  ],
  family: [
    { icon: 'ti-eye',        iconBg: '#F0FBF7', iconColor: '#1D9E75', title: 'View Elder Dashboard', sub: 'See health, bookings, location' },
    { icon: 'ti-video',      iconBg: '#EBF4FF', iconColor: '#185FA5', title: 'Video Call Parent', sub: 'Connect with your elder' },
    { icon: 'ti-bell',       iconBg: '#FAEEDA', iconColor: '#BA7517', title: 'Set Up Alerts', sub: 'SOS and medicine notifications' },
    { icon: 'ti-users',      iconBg: '#FFF0F0', iconColor: '#E24B4A', title: 'Link Another Family Member', sub: 'Add more guardians' },
  ],
  worker: [
    { icon: 'ti-briefcase',  iconBg: '#F0FBF7', iconColor: '#1D9E75', title: 'View Available Jobs', sub: 'Bookings near you' },
    { icon: 'ti-user-check', iconBg: '#EBF4FF', iconColor: '#185FA5', title: 'Complete Your Profile', sub: 'Add skills and photo' },
    { icon: 'ti-map-pin',    iconBg: '#FAEEDA', iconColor: '#BA7517', title: 'Set Your Location', sub: 'So elders can find you' },
    { icon: 'ti-star',       iconBg: '#FFF0F0', iconColor: '#E24B4A', title: 'See Your Ratings', sub: 'Track your performance' },
  ],
}

const ROLE_ROUTES = { elder: '/elder/home', family: '/family/dashboard', worker: '/worker/jobs' }
const ROLE_LABELS = { elder: 'Senior', family: 'Family Member', worker: 'Care Worker' }
const ROLE_ICONS  = { elder: 'ti-user', family: 'ti-users', worker: 'ti-stethoscope' }

export default function Welcome() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [role, setRole] = useState('elder')
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const progressRef = useRef(null)

  useEffect(() => {
    // Get from sessionStorage first, then Supabase session
    const storedName = sessionStorage.getItem('sahara_welcome_name')
    const storedRole = sessionStorage.getItem('sahara_welcome_role')
    if (storedName) setName(storedName)
    if (storedRole) setRole(storedRole)
    if (!storedName) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.user_metadata?.name) setName(data.user.user_metadata.name)
      })
    }

    // Auto-redirect after 5s
    const start = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min((elapsed / 5000) * 100, 100))
    }, 50)

    timerRef.current = setTimeout(() => {
      goToDashboard()
    }, 5000)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(progressRef.current)
    }
  }, [])

  function goToDashboard() {
    clearTimeout(timerRef.current)
    clearInterval(progressRef.current)
    const r = sessionStorage.getItem('sahara_welcome_role') || role
    navigate(ROLE_ROUTES[r] || '/elder/home')
  }

  const actions = NEXT_ACTIONS[role] || NEXT_ACTIONS.elder

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>
      <Navbar activePage="home" showAuthButtons={false} />

      {/* Progress bar */}
      <div style={{ height: 3, background: '#DDE8F5', position: 'sticky', top: 56, zIndex: 40 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#1D9E75', transition: 'width 0.05s linear' }} />
      </div>

      {/* Two-column grid */}
      <div className="welcome-grid">
        {/* Left: celebration */}
        <div style={{ background: '#EBF4FF', padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid #DDE8F5', minHeight: 'calc(100vh - 59px)' }}>
          {/* Success circle */}
          <div className="scale-in" style={{ width: 80, height: 80, borderRadius: '50%', background: 'white', border: '3px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <i className="ti ti-check" style={{ fontSize: 34, color: '#1D9E75' }} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0A2540', margin: '0 0 8px' }}>
            Welcome, {name || 'there'} ji!
          </h1>
          <p style={{ fontSize: 12, color: '#5A7A9A', lineHeight: 1.6, maxWidth: 260, marginBottom: 28 }}>
            Your Sahara account is ready. You're now part of India's trusted eldercare community.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ num: '2400+', label: 'Workers nearby' }, { num: '24/7', label: 'AI Companion' }].map((s, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #DDE8F5', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75', margin: 0 }}>{s.num}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7A96B0', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: '#A0B8D0', marginTop: 24 }}>
            Redirecting to your dashboard in {Math.max(0, Math.ceil(5 - (progress / 20)))}s…
          </p>
        </div>

        {/* Right: next steps */}
        <div style={{ background: 'white', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 'calc(100vh - 59px)' }}>
          {/* Role badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FBF7', border: '1.5px solid #9FE1CB', borderRadius: 999, padding: '6px 14px', alignSelf: 'flex-start', marginBottom: 24 }}>
            <i className={`ti ${ROLE_ICONS[role]}`} style={{ fontSize: 13, color: '#1D9E75' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56' }}>{ROLE_LABELS[role]}</span>
          </div>

          <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 16 }}>
            What would you like to do first?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {actions.map((a, i) => (
              <ActionItem key={i} {...a} />
            ))}
          </div>

          <SaharaButton variant="primary" fullWidth onClick={goToDashboard}>
            <i className="ti ti-home" style={{ fontSize: 16 }} />
            Go to My Home Dashboard
          </SaharaButton>
        </div>
      </div>

      <style>{`
        .welcome-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: calc(100vh - 59px); }
        @media (max-width: 767px) {
          .welcome-grid { grid-template-columns: 1fr; }
          .welcome-grid > div { padding: 24px 20px !important; min-height: unset !important; text-align: center; }
          .welcome-grid > div:first-child { border-right: none !important; border-bottom: 1px solid #DDE8F5; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .welcome-grid { grid-template-columns: 45% 55%; }
          .welcome-grid > div { padding: 32px !important; }
        }
      `}</style>
    </div>
  )
}

function ActionItem({ icon, iconBg, iconColor, title, sub }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: hovered ? '#F0FBF7' : 'white',
        border: `1.5px solid ${hovered ? '#1D9E75' : '#DDE8F5'}`,
        borderRadius: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 10, color: '#7A96B0', margin: 0 }}>{sub}</p>
      </div>
      <i className="ti ti-arrow-right" style={{ fontSize: 14, color: '#1D9E75' }} />
    </div>
  )
}

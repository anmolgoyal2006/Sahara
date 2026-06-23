import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SaharaButton from '../components/SaharaButton'
import { supabase } from '../lib/supabase'
import { checkUser } from '../lib/api'


const FEATURES = [
  { iconBg: '#1D9E75', iconColor: 'white',   icon: 'ti-user-check', title: 'Verified Care Workers', sub: 'Background-checked helpers near you' },
  { iconBg: '#EBF4FF', iconColor: '#185FA5', icon: 'ti-brain',      title: 'AI Health Companion',  sub: 'Hindi, English & Punjabi support' },
  { iconBg: '#FFF0F0', iconColor: '#E24B4A', icon: 'ti-urgent',     title: 'Instant SOS Alert',    sub: 'One tap notifies your entire family' },
]

const STATS = [
  { num: '2400+', label: 'Care Workers' },
  { num: '98%',   label: 'Satisfaction' },
  { num: '50K+',  label: 'Families Helped' },
]

function HeroPanel() {
  return (
    <div style={{ background: '#EBF4FF', padding: '40px 40px 48px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #DDE8F5' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 999, padding: '6px 14px', marginBottom: 24, alignSelf: 'flex-start' }}>
        <i className="ti ti-shield-check" style={{ fontSize: 13, color: '#185FA5' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5' }}>India's Trusted Elder Care</span>
      </div>

      <h1 style={{ margin: '0 0 14px', lineHeight: 1.2 }}>
        <span style={{ display: 'block', fontSize: 32, fontWeight: 700, color: '#0A2540' }}>Your Trusted</span>
        <span style={{ display: 'block', fontSize: 32, fontWeight: 700, color: '#1D9E75' }}>Elder Care</span>
        <span style={{ display: 'block', fontSize: 32, fontWeight: 700, color: '#0A2540' }}>Platform</span>
      </h1>

      <p style={{ fontSize: 14, color: '#5A7A9A', lineHeight: 1.6, maxWidth: 300, marginBottom: 28 }}>
        Safe, AI-powered care for your loved ones — verified helpers, 24/7 companion, instant SOS.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #DDE8F5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: 16, color: f.iconColor }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>{f.title}</p>
              <p style={{ fontSize: 10, color: '#7A96B0', margin: 0 }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ flex: 1, background: 'white', border: '1px solid #DDE8F5', borderRadius: 12, padding: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75', margin: 0 }}>{s.num}</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#7A96B0', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const userData = await checkUser(session.user.id)
        if (userData.exists) {
          if (userData.role === 'elder') navigate('/elder/home')
          else if (userData.role === 'family') navigate('/family/dashboard')
          else navigate('/worker/jobs')
        }
      } catch {}
    })

    // Also listen for auth state changes
    // This catches the Google OAuth redirect even if callback fails
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session) {
          try {
            const userData = await checkUser(session.user.id)
            if (userData.exists) {
              if (userData.role === 'elder') navigate('/elder/home')
              else if (userData.role === 'family') navigate('/family/dashboard')
              else navigate('/worker/jobs')
            } else {
              sessionStorage.setItem('sahara_uid', session.user.id)
              sessionStorage.setItem('sahara_name',
                session.user.user_metadata?.full_name || '')
              navigate('/register')
            }
          } catch (err) {
            console.error('Error:', err)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])
  async function handleGoogleLogin() {
    const redirectUrl = `${window.location.origin}/auth/callback`
    console.log('OAuth redirectTo:', redirectUrl)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) console.error('OAuth error:', error)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EBF4FF' }}>
      <Navbar activePage="home" showAuthButtons={false} />

      <div className="login-grid">
        <div className="login-hero-col">
          <HeroPanel />
        </div>

        {/* Right: form */}
        <div style={{ background: 'white', padding: '40px 40px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0A2540', margin: '0 0 6px' }}>
            Welcome to Sahara
          </h2>
          <p style={{ fontSize: 12, color: '#7A96B0', marginBottom: 28, lineHeight: 1.5 }}>
            Sign in or create your account to continue
          </p>

          <SaharaButton variant="blue" fullWidth onClick={handleGoogleLogin}>
            <i className="ti ti-brand-google" style={{ fontSize: 16 }} />
            Continue with Google
          </SaharaButton>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { icon: 'ti ti-check', text: 'Verified workers' },
              { icon: 'ti ti-lock',  text: '100% Secure' },
              { icon: 'ti ti-users', text: 'Trusted by 50K+' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={t.icon} style={{ fontSize: 12, color: '#1D9E75' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5' }}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Image + quote */}
          <div style={{ marginTop: 0, textAlign: 'center' }}>
            <img
              src="/Gemini_Generated_Image_12cykd12cykd12cy.png"
              alt="Happy elderly couple"
              style={{ width: '75%', borderRadius: 16, display: 'block', margin: '0 auto' }}
            />
            <div style={{ background: '#185FA5', borderRadius: 12, padding: '12px 20px', margin: '16px 0 0' }}>
              <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic', color: 'white', textAlign: 'center', lineHeight: 1.6 }}>
                "Because every parent deserves care, dignity, and companionship."
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 56px);
        }
        .login-hero-col { display: block; }

        @media (max-width: 767px) {
          .login-grid { grid-template-columns: 1fr; min-height: unset; }
          .login-hero-col { display: none; }
          .login-grid > div:last-child { padding: 24px 20px !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .login-grid { grid-template-columns: 45% 55%; }
          .login-grid > div { padding: 32px !important; }
        }
      `}</style>
    </div>
  )
}

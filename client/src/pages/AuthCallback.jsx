import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { checkUser } from '../lib/api'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          navigate('/login')
          return
        }

        const user = session.user
        const data = await checkUser(user.id)

        if (data.exists) {
          sessionStorage.clear()
          if (data.role === 'elder') navigate('/elder/home')
          else if (data.role === 'family') navigate('/family/dashboard')
          else navigate('/worker/jobs')
        } else {
          sessionStorage.setItem('sahara_uid', user.id)
          sessionStorage.setItem('sahara_name', user.user_metadata?.full_name || '')
          navigate('/register')
        }
      } catch {
        navigate('/login')
      }
    }

    handle()
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#EBF4FF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        background: '#1D9E75',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <i className="ti ti-leaf" style={{ color: 'white', fontSize: 22 }} />
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', margin: 0 }}>
        Signing you in...
      </p>
      <p style={{ fontSize: 14, color: '#5A7A9A', margin: 0 }}>
        Please wait while we set up your account
      </p>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #E1F5EE',
        borderTop: '3px solid #1D9E75',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

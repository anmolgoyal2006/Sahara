import { useState, useEffect } from 'react'
import { useElderData } from '../../hooks/useElderData'
import ElderLayout from '../../components/layout/ElderLayout'
import GreetingCard from '../../components/elder/GreetingCard'
import ServiceTiles from '../../components/elder/ServiceTiles'
import CompanionBanner from '../../components/elder/CompanionBanner'
import HealthSummaryCard from '../../components/elder/HealthSummaryCard'
import UpcomingBookings from '../../components/elder/UpcomingBookings'
import QuickActions from '../../components/elder/QuickActions'
import HealthAlertBanner from '../../components/elder/HealthAlertBanner'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ElderHome() {
  const { user, profile, healthLog, bookings, nextMedicine, loading } = useElderData()
  const [healthAlerts, setHealthAlerts] = useState([])
  const [showAlertBanner, setShowAlertBanner] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id
      fetch(`${API_URL}/api/health/alerts/${uid}`)
        .then(r => r.json())
        .then(data => { if (data.success) setHealthAlerts(data.alerts) })
        .catch(() => {})
    })
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EBF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img src="/logo.jpeg" alt="Sahara Logo" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover' }} />
        <p style={{ fontSize: 18, fontWeight: 700, color: '#0A2540' }}>Loading your dashboard...</p>
        <div style={{ width: 36, height: 36, border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <ElderLayout userName={user?.name}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {healthAlerts.length > 0 && showAlertBanner && (
          <HealthAlertBanner alerts={healthAlerts} onDismiss={() => setShowAlertBanner(false)} />
        )}
        <GreetingCard user={user} profile={profile} />
        <ServiceTiles />
        <CompanionBanner userName={user?.name} language={user?.language} />
        <div className="health-bookings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
          <HealthSummaryCard healthLog={healthLog} />
          <UpcomingBookings bookings={bookings} />
        </div>
        <QuickActions nextMedicine={nextMedicine} />
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .health-bookings-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
        }
      `}</style>
    </ElderLayout>
  )
}

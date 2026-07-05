import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useElderData } from '../../hooks/useElderData'
import ElderLayout from '../../components/layout/ElderLayout'
import GreetingCard from '../../components/elder/GreetingCard'
import ServiceTiles from '../../components/elder/ServiceTiles'
import CompanionBanner from '../../components/elder/CompanionBanner'
import HealthSummaryCard from '../../components/elder/HealthSummaryCard'
import UpcomingBookings from '../../components/elder/UpcomingBookings'
import QuickActions from '../../components/elder/QuickActions'
import HealthAlertBanner from '../../components/elder/HealthAlertBanner'
import NotificationPermissionBanner from '../../components/elder/NotificationPermissionBanner'
import ActiveBookingMap from '../../components/elder/ActiveBookingMap'
import { useMedicineNotifications } from '../../hooks/useMedicineNotifications'
import { useActiveBookingLocation } from '../../hooks/useActiveBookingLocation'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ElderHome() {
  const navigate = useNavigate()
  const { user, profile, healthLog, bookings, nextMedicine, loading } = useElderData()
  const [healthAlerts, setHealthAlerts] = useState([])
  const [recordCount, setRecordCount] = useState(null)
  const [showAlertBanner, setShowAlertBanner] = useState(true)
  const [todaySchedule, setTodaySchedule] = useState([])
  const [userId, setUserId] = useState(null)
  const [showNotifBanner, setShowNotifBanner] = useState(
    'Notification' in window && Notification.permission === 'default'
  )

  // Active booking live location (polls every 30s)
  const {
    booking: activeBooking,
    locationData: activeLocationData,
    refresh: refreshActiveBooking,
  } = useActiveBookingLocation(userId, 'elder')

  // Background medicine notifications
  useMedicineNotifications(userId, todaySchedule)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id
      setUserId(uid)
      fetch(`${API_URL}/api/health/alerts/${uid}`)
        .then(r => r.json())
        .then(data => { if (data.success) setHealthAlerts(data.alerts) })
        .catch(() => {})
      fetch(`${API_URL}/api/medicine/today/${uid}`)
        .then(r => r.json())
        .then(data => { if (data.success) setTodaySchedule(data.schedule) })
        .catch(() => {})
      fetch(`${API_URL}/api/medical/list/${uid}`)
        .then(r => r.json())
        .then(data => { if (data.success) setRecordCount(data.total) })
        .catch(() => {})
      // Update elder location silently for family dashboard visibility
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await fetch(`${API_URL}/api/elder/update-location`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ elder_id: uid, lat: pos.coords.latitude, lng: pos.coords.longitude }),
              })
            } catch { /* non-critical — silent fail */ }
          },
          () => {}, // silent fail on denial
          { enableHighAccuracy: false, timeout: 5000 }
        )
      }
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
        {showNotifBanner && (
          <NotificationPermissionBanner onDismiss={() => setShowNotifBanner(false)} />
        )}
        {healthAlerts.length > 0 && showAlertBanner && (
          <HealthAlertBanner alerts={healthAlerts} onDismiss={() => setShowAlertBanner(false)} />
        )}
        <GreetingCard user={user} profile={profile} userId={userId} />
        {activeBooking && activeLocationData && (
          <ActiveBookingMap
            booking={activeBooking}
            workerLocation={{
              lat: activeLocationData.worker?.lat,
              lng: activeLocationData.worker?.lng,
            }}
            elderLocation={{
              lat: activeLocationData.elder?.lat,
              lng: activeLocationData.elder?.lng,
            }}
            workerName={activeLocationData.worker?.name}
            workerPhone={activeLocationData.worker?.phone}
            workerPhoto={activeBooking.workers?.photo_url}
            workerRating={activeBooking.workers?.rating}
            onRefresh={refreshActiveBooking}
          />
        )}
        <ServiceTiles />
        
        {/* My Health Section — Phase 11E */}
        <div className="my-health-section">
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0A2540', marginBottom: '12px' }}>My Health</h3>
          <div className="my-health-grid">
            <div className="my-health-tile" onClick={() => navigate('/elder/health')}>
              <div className="my-health-tile__icon-box" style={{ backgroundColor: '#FFF0F0' }}>
                <span className="my-health-tile__icon ti-pulse" style={{ color: '#E24B4A' }}></span>
              </div>
              <h4 className="my-health-tile__label">Health Log</h4>
              <p className="my-health-tile__subtext">Daily vitals</p>
            </div>
            
            <div className="my-health-tile" onClick={() => navigate('/elder/medicines')}>
              <div className="my-health-tile__icon-box" style={{ backgroundColor: '#ECFDF5' }}>
                <span className="my-health-tile__icon ti-notepad" style={{ color: '#059669' }}></span>
              </div>
              <h4 className="my-health-tile__label">Medicines</h4>
              <p className="my-health-tile__subtext">Pill reminders</p>
            </div>
            
            <div className="my-health-tile" onClick={() => navigate('/elder/medical-records')}>
              <div className="my-health-tile__icon-box" style={{ backgroundColor: '#EBF4FF' }}>
                <span className="my-health-tile__icon ti-folder-medical" style={{ color: '#185FA5', fontSize: '24px' }}></span>
              </div>
              <h4 className="my-health-tile__label">My Reports</h4>
              <p className="my-health-tile__subtext">
                {recordCount !== null ? `${recordCount} reports` : 'Tap to view'}
              </p>
            </div>
          </div>
        </div>

        <CompanionBanner userName={user?.name} language={user?.language} />
        <div className="health-bookings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
          <HealthSummaryCard healthLog={healthLog} />
          <UpcomingBookings bookings={bookings} />
        </div>
        <QuickActions todaySchedule={todaySchedule} />
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .health-bookings-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
        }
        .my-health-section {
          margin: 20px 0;
        }
        .my-health-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 600px) {
          .my-health-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .my-health-tile {
          background: #FFFFFF;
          border: 1.5px solid #DDE8F5;
          border-radius: 12px;
          padding: 16px 12px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .my-health-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(10, 37, 64, 0.05);
        }
        .my-health-tile__icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .my-health-tile__icon {
          font-size: 24px;
        }
        .my-health-tile__label {
          font-size: 13px;
          font-weight: bold;
          color: #0A2540;
          margin: 0;
        }
        .my-health-tile__subtext {
          font-size: 10px;
          color: #5A7A9A;
          margin: 0;
          font-weight: 500;
        }
      `}</style>
    </ElderLayout>
  )
}

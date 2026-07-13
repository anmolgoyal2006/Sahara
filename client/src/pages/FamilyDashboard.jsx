import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FamilyLayout from '../components/layout/FamilyLayout'
import LinkElderCard from '../components/family/LinkElderCard'
import ElderStatusHeader from '../components/family/ElderStatusHeader'
import AISummaryCard from '../components/family/AISummaryCard'
import OverviewCards from '../components/family/OverviewCards'
import FamilyHealthSection from '../components/family/FamilyHealthSection'
import FamilyMedicineSection from '../components/family/FamilyMedicineSection'
import FamilyBookingsSection from '../components/family/FamilyBookingsSection'
import ElderLocationMap from '../components/family/ElderLocationMap'
import SOSAlertCard from '../components/sos/SOSAlertCard'
import SOSHistoryList from '../components/sos/SOSHistoryList'
import { useSOSNotifications } from '../hooks/useSOSNotifications'
import CallButton from '../components/videocall/CallButton'
import GeofenceAlertCard from '../components/family/GeofenceAlertCard'
import { useGeofenceFamilyAlerts } from '../hooks/useGeofenceFamilyAlerts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function LastRefreshed({ time, onRefresh }) {
  if (!time) return null
  return (
    <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#A0B8D0' }}>
        Last refreshed: {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </span>
      <button
        onClick={onRefresh}
        style={{ background: 'none', border: 'none', padding: 0, color: '#185FA5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      >
        <i className="ti ti-refresh" style={{ fontSize: 11 }} />Refresh
      </button>
    </div>
  )
}

export default function FamilyDashboard() {
  const navigate = useNavigate()

  const [userId,        setUserId]        = useState(null)
  const [userName,      setUserName]      = useState(null)
  const [overview,      setOverview]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [showNotifBanner, setShowNotifBanner] = useState(
    'Notification' in window && Notification.permission === 'default'
  )
  const [geofenceAlerts, setGeofenceAlerts] = useState([])
  const [geofenceZone,   setGeofenceZone]   = useState(null)
  const [isOutside,      setIsOutside]      = useState(false)

  // SOS polling for family member
  useSOSNotifications(userId)

  // Geofence alert polling — browser notifications when elder leaves/returns
  useGeofenceFamilyAlerts(userId)

  const fetchOverview = useCallback(async (uid) => {
    try {
      const res  = await fetch(`${API_URL}/api/family/elder-overview/${uid}`)
      const data = await res.json()
      if (data.success) {
        setOverview(data)
        setLastRefreshed(new Date())
      }
      // Fetch geofence alerts in parallel
      const geofenceRes  = await fetch(`${API_URL}/api/geofence/family-alerts/${uid}`)
      const geofenceData = await geofenceRes.json()
      setGeofenceAlerts(geofenceData.alerts  || [])
      setGeofenceZone(geofenceData.zone      || null)
      setIsOutside(geofenceData.isOutside    || false)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      setUserName(session.user.user_metadata?.name || null)
      fetchOverview(uid)
    })
  }, [navigate, fetchOverview])

  // Resolve SOS from family dashboard
  async function handleResolveSOS(sosId) {
    await fetch(`${API_URL}/api/sos/resolve/${sosId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: 'family', notes: 'Marked safe by family member' }),
    })
    setOverview(prev => ({
      ...prev,
      activeSOS: null,
      sosEvents: (prev.sosEvents || []).map(e =>
        e.id === sosId ? { ...e, resolved: true, resolved_at: new Date().toISOString() } : e
      ),
    }))
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #EEF4FB', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </FamilyLayout>
    )
  }

  // ── Not linked ─────────────────────────────────────────────────────────────
  if (!overview?.linked) {
    return (
      <FamilyLayout userName={userName}>
        <div style={{ maxWidth: 480, margin: '40px auto 0' }}>
          <LinkElderCard
            familyUserId={userId}
            onLinked={() => fetchOverview(userId)}
          />
        </div>
      </FamilyLayout>
    )
  }

  // ── Linked ─────────────────────────────────────────────────────────────────
  const { elder, todayHealth, healthLogs, bookings, medicines, medLogs,
          medicineCompliance, sosEvents, activeSOS } = overview

  return (
    <FamilyLayout userName={userName}>
      {/* Notification permission banner */}
      {showNotifBanner && (
        <div style={{ background: '#EBF4FF', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Noto Sans, sans-serif' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DDE8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-bell" style={{ fontSize: 16, color: '#185FA5' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>Enable SOS alert notifications?</p>
            <p style={{ fontSize: 11, color: '#5A7A9A', margin: '1px 0 0' }}>Get notified instantly if your family member needs help</p>
          </div>
          <button onClick={async () => { await Notification.requestPermission(); setShowNotifBanner(false) }} style={{ height: 30, padding: '0 12px', borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Enable</button>
          <button onClick={() => setShowNotifBanner(false)} style={{ height: 30, padding: '0 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#5A7A9A', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Not now</button>
        </div>
      )}

      {/* Active SOS alert */}
      {activeSOS && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E24B4A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🚨 Active Emergency
          </p>
          <SOSAlertCard alert={activeSOS} onResolve={handleResolveSOS} />
        </div>
      )}

      {/* Elder status header */}
      <ElderStatusHeader
        elder={elder}
        familyUserId={userId}
        onUnlink={() => { setOverview(null); fetchOverview(userId) }}
      />

      {/* Video Call button — Phase 12D */}
      {elder && (
        <div style={{ marginBottom: 16 }}>
          <CallButton
            userId={userId}
            elderId={elder.id}
            elderName={elder.name}
            userName={userName || 'Family'}
            onCallCreated={(callData) => {
              console.log('Call created:', callData)
            }}
          />
        </div>
      )}

      {/* AI Summary */}
      <AISummaryCard familyUserId={userId} />

      {/* Government Schemes — Phase 14G */}
      <div
        onClick={() => navigate('/family/schemes')}
        style={{
          background: 'linear-gradient(135deg, #185FA5 0%, #0A3D6B 100%)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(24,95,165,0.2)',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-building-bank" style={{ fontSize: 24, color: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0 }}>Government Schemes</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>
            Check schemes {elder?.name ? `for ${elder.name}` : 'for your family member'}
          </p>
        </div>
        <i className="ti ti-arrow-right" style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
      </div>

      {/* 4 overview cards */}
      <OverviewCards
        todayHealth={todayHealth}
        bookings={bookings}
        medicineCompliance={medicineCompliance}
        activeSOS={activeSOS}
        medLogs={medLogs}
      />

      {/* Two-column layout on desktop */}
      <div className="family-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
        {/* Left column */}
        <div className="family-col-left">
          <FamilyHealthSection
            healthLogs={healthLogs}
            elderName={elder?.name}
          />
          <FamilyMedicineSection
            medicines={medicines}
            medLogs={medLogs}
            medicineCompliance={medicineCompliance}
          />
        </div>

        {/* Right column */}
        <div className="family-col-right">
          {overview?.elder && (
            <GeofenceAlertCard
              alerts={geofenceAlerts}
              zone={geofenceZone}
              isOutside={isOutside}
              elderName={overview.elder.name}
              onSetupZone={() => navigate('/family/safety-zone')}
              onViewHistory={() => navigate('/family/location-history')}
              onAcknowledge={async (eventId) => {
                await fetch(`${API_URL}/api/geofence/acknowledge/${eventId}`, { method: 'PUT' })
                setGeofenceAlerts(prev =>
                  prev.map(a => a.id === eventId ? { ...a, acknowledged: true } : a)
                )
              }}
            />
          )}
          <ElderLocationMap
            lat={elder?.lat}
            lng={elder?.lng}
            elderName={elder?.name}
            address={elder?.address}
          />
          <FamilyBookingsSection bookings={bookings} />

          {/* Quick links card */}
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 14px' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: 'ti-heart-rate-monitor', label: 'View Health History',   color: '#E24B4A', bg: '#FFF0F0', path: '/family/health' },
                { icon: 'ti-map-pin-check',      label: 'Manage Safety Zone',    color: '#185FA5', bg: '#EBF4FF', path: '/family/safety-zone' },
                { icon: 'ti-map-pin',            label: 'Location History',      color: '#1D9E75', bg: '#F0FBF7', path: '/family/location-history' },
                { icon: 'ti-video',              label: 'Call History',          color: '#8B5CF6', bg: '#F5F3FF', path: '/family/call-history' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid #EEF4FB', background: 'white',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    width: '100%', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 16, color: item.color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A2540', flex: 1 }}>{item.label}</span>
                  <i className="ti ti-chevron-right" style={{ fontSize: 14, color: '#A0B8D0' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SOS History */}
      <div style={{ marginTop: 8 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Emergency History</p>
        <SOSHistoryList alerts={sosEvents || []} />
      </div>

      {/* Call History link — Phase 12E */}
      <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
        <button
          onClick={() => navigate('/family/call-history')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#185FA5', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit', padding: '4px 8px'
          }}
        >
          <i className="ti ti-video" style={{ fontSize: 14 }} />
          Call History
          <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
        </button>
      </div>

      <LastRefreshed time={lastRefreshed} onRefresh={() => fetchOverview(userId)} />

      <style>{`
        @media (min-width: 1024px) {
          .family-two-col {
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </FamilyLayout>
  )
}

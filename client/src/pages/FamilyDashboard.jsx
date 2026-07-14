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
          {/* Emergency History — compact, inside left col */}
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '16px 20px', marginBottom: 20, fontFamily: 'Noto Sans, sans-serif' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: '0 0 12px' }}>Emergency History</p>
            {!sosEvents?.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 16, color: '#1D9E75' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A2540', margin: 0 }}>No emergency alerts</p>
                  <p style={{ fontSize: 11, color: '#1D9E75', margin: 0 }}>All is well</p>
                </div>
              </div>
            ) : (
              (sosEvents || []).slice(0, 3).map((alert, i, arr) => (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #F4F8FC' : 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: alert.resolved ? '#1D9E75' : '#E24B4A' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0A2540', margin: 0 }}>
                      {new Date(alert.triggered_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: alert.resolved ? '#1D9E75' : '#E24B4A' }}>
                    {alert.resolved ? 'Resolved' : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
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
        </div>
      </div>

      <LastRefreshed time={lastRefreshed} onRefresh={() => fetchOverview(userId)} />

      <style>{`
        @media (min-width: 1024px) {
          .family-two-col {
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            align-items: start !important;
          }
        }
      `}</style>
    </FamilyLayout>
  )
}

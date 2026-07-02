const SERVICE_LABEL = {
  maid: 'Maid', nurse: 'Nurse', driver: 'Driver',
  cook: 'Cook', physiotherapist: 'Physio', repair: 'Repair',
}

const SERVICE_COLOR = {
  maid: '#185FA5', nurse: '#E24B4A', driver: '#1D9E75',
  cook: '#BA7517', physiotherapist: '#8B5CF6', repair: '#5A7A9A',
}

function relativeTime(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function bpStatus(sys, dia) {
  if (!sys || !dia) return null
  if (sys >= 140 || dia >= 90) return { label: 'High', color: '#E24B4A', bg: '#FFF0F0' }
  if (sys <= 90  || dia <= 60) return { label: 'Low',  color: '#BA7517', bg: '#FAEEDA' }
  return { label: 'Normal', color: '#1D9E75', bg: '#F0FBF7' }
}

function complianceColor(pct) {
  if (pct >= 80) return '#1D9E75'
  if (pct >= 50) return '#BA7517'
  return '#E24B4A'
}

// ── Shared card shell ─────────────────────────────────────────────────────────
function Card({ children, bg = 'white', border = '#DDE8F5', style = {} }) {
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`,
      borderRadius: 14, padding: 16,
      fontFamily: 'Noto Sans, sans-serif',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ icon, iconColor, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color: iconColor }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

// ── Card 1: Health ────────────────────────────────────────────────────────────
function HealthCard({ todayHealth }) {
  const status = todayHealth
    ? bpStatus(todayHealth.bp_systolic, todayHealth.bp_diastolic)
    : null

  return (
    <Card>
      <CardHeader icon="ti-heart-rate-monitor" iconColor="#E24B4A" label="Health" />
      {todayHealth ? (
        <>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: '0 0 4px', lineHeight: 1 }}>
            {todayHealth.bp_systolic || '—'}/{todayHealth.bp_diastolic || '—'}
          </p>
          <p style={{ fontSize: 10, color: '#A0B8D0', margin: '0 0 6px' }}>mmHg</p>
          {status && (
            <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, borderRadius: 20, padding: '2px 8px' }}>
              {status.label}
            </span>
          )}
          <p style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600, margin: '6px 0 0' }}>
            <i className="ti ti-check" style={{ fontSize: 10, marginRight: 3 }} />Logged today
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <i className="ti ti-heart-rate-monitor" style={{ fontSize: 28, color: '#DDE8F5', display: 'block', marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: '0 0 4px' }}>Not logged today</p>
          <span style={{ fontSize: 11, color: '#185FA5', fontWeight: 600, cursor: 'default' }}>Remind them</span>
        </div>
      )}
    </Card>
  )
}

// ── Card 2: Booking ───────────────────────────────────────────────────────────
function BookingCard({ bookings }) {
  const next = bookings?.[0] || null
  const svc  = next?.service_type
  const color = SERVICE_COLOR[svc] || '#5A7A9A'
  const workerName = next?.workers?.users?.name

  return (
    <Card>
      <CardHeader icon="ti-calendar" iconColor="#185FA5" label="Next Booking" />
      {next ? (
        <>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '18', borderRadius: 20, padding: '2px 8px', marginBottom: 6, display: 'inline-block' }}>
            {SERVICE_LABEL[svc] || svc}
          </span>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: '4px 0 2px' }}>
            {SERVICE_LABEL[svc] || svc}
          </p>
          <p style={{ fontSize: 12, color: '#5A7A9A', margin: '0 0 4px' }}>
            {new Date(next.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          {workerName && (
            <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>
              {workerName} ·{' '}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', background: '#F0FBF7', borderRadius: 20, padding: '1px 6px' }}>
                {next.status}
              </span>
            </p>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 28, color: '#DDE8F5', display: 'block', marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>No bookings</p>
        </div>
      )}
    </Card>
  )
}

// ── Card 3: Medicines ─────────────────────────────────────────────────────────
function MedicineCard({ medicineCompliance, medLogs }) {
  const taken = medLogs?.filter(l => l.status === 'taken').length ?? 0
  const total = medLogs?.length ?? 0
  const pct   = medicineCompliance
  const color = pct !== null ? complianceColor(pct) : '#A0B8D0'

  return (
    <Card>
      <CardHeader icon="ti-pill" iconColor="#BA7517" label="Medicines" />
      {pct !== null ? (
        <>
          <p style={{ fontSize: 24, fontWeight: 800, color, margin: '0 0 2px', lineHeight: 1 }}>{pct}%</p>
          <p style={{ fontSize: 11, color: '#A0B8D0', margin: '0 0 8px' }}>{taken} of {total} doses taken</p>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: '#EEF4FB', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <i className="ti ti-pill" style={{ fontSize: 28, color: '#DDE8F5', display: 'block', marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: '#A0B8D0', margin: 0 }}>No medicines today</p>
        </div>
      )}
    </Card>
  )
}

// ── Card 4: Emergency ─────────────────────────────────────────────────────────
function EmergencyCard({ activeSOS }) {
  return activeSOS ? (
    <Card bg="#FFF0F0" border="#FECACA">
      <CardHeader icon="ti-urgent" iconColor="#E24B4A" label="EMERGENCY" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', flexShrink: 0, animation: 'sosDotPulse9 1.4s ease-in-out infinite' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A', margin: 0 }}>Alert triggered</p>
      </div>
      <p style={{ fontSize: 12, color: '#E24B4A', margin: 0, opacity: 0.8 }}>
        {relativeTime(activeSOS.triggered_at) || 'Just now'}
      </p>
      <style>{`@keyframes sosDotPulse9 { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </Card>
  ) : (
    <Card bg="#F0FBF7" border="#9FE1CB">
      <CardHeader icon="ti-shield-check" iconColor="#1D9E75" label="Emergency" />
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75', margin: '0 0 2px' }}>No active alerts</p>
      <p style={{ fontSize: 11, color: '#5A7A9A', margin: 0 }}>All clear</p>
    </Card>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function OverviewCards({ todayHealth, bookings, medicineCompliance, activeSOS, medLogs }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
      <HealthCard   todayHealth={todayHealth} />
      <BookingCard  bookings={bookings} />
      <MedicineCard medicineCompliance={medicineCompliance} medLogs={medLogs} />
      <EmergencyCard activeSOS={activeSOS} />
    </div>
  )
}

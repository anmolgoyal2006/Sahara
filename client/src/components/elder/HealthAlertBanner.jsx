export default function HealthAlertBanner({ alerts = [], onDismiss }) {
  if (!alerts.length) return null
  const isBP = alerts[0].type === 'bp'

  return (
    <div style={{
      background: '#FFF0F0', border: '1.5px solid #FECACA',
      borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
    }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#E24B4A', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A', margin: '0 0 2px' }}>
          Health Check Needed
        </p>
        <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
          {isBP
            ? 'Your recent blood pressure reading was high. Consider visiting a doctor.'
            : 'Your recent blood sugar reading was high. Consider visiting a doctor.'}
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss alert"
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: '50%',
          border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#E24B4A', fontSize: 16, padding: 0,
        }}
      >
        <i className="ti ti-x" />
      </button>
    </div>
  )
}

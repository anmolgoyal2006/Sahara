export default function NotificationPermissionBanner({ onDismiss }) {
  async function handleEnable() {
    await Notification.requestPermission()
    onDismiss()
  }

  return (
    <div style={{
      background: '#EBF4FF',
      border: '1.5px solid #DDE8F5',
      borderRadius: 16,
      padding: '14px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: '#DDE8F5', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-bell" style={{ fontSize: 20, color: '#185FA5' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>
          Turn on medicine reminders?
        </p>
        <p style={{ fontSize: 12, color: '#5A7A9A', margin: '2px 0 0' }}>
          Get notified when it's time for your medicine
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleEnable}
          style={{
            height: 32, padding: '0 14px', borderRadius: 8,
            background: '#1D9E75', border: 'none', color: 'white',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Enable
        </button>
        <button
          onClick={onDismiss}
          style={{
            height: 32, padding: '0 10px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#5A7A9A',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

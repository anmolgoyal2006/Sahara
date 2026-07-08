/**
 * CallControls — bottom bar for an active video call.
 *
 * Props:
 *   isMuted        — boolean
 *   isCameraOff    — boolean
 *   onToggleMute   — function
 *   onToggleCamera — function
 *   onEndCall      — function
 *   duration       — string "MM:SS"
 */
export default function CallControls({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  duration = '00:00'
}) {
  return (
    <div
      style={{
        background: 'rgba(10, 37, 64, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '16px 24px',
        margin: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0
      }}
    >
      {/* ── Duration ── */}
      <p
        style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 700,
          textAlign: 'center',
          margin: '0 0 12px 0',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 1
        }}
      >
        {duration}
      </p>

      {/* ── Control buttons row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          width: '100%'
        }}
      >
        {/* Mute */}
        <ControlButton
          active={isMuted}
          size={56}
          icon={isMuted ? 'ti-microphone-off' : 'ti-microphone'}
          label={isMuted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
        />

        {/* End Call — largest, center */}
        <ControlButton
          active={true}
          size={64}
          icon="ti-phone-off"
          label="End Call"
          onClick={onEndCall}
          danger
          pulse
        />

        {/* Camera */}
        <ControlButton
          active={isCameraOff}
          size={56}
          icon={isCameraOff ? 'ti-video-off' : 'ti-video'}
          label={isCameraOff ? 'Camera Off' : 'Camera'}
          onClick={onToggleCamera}
        />
      </div>

      {/* ── Pulse keyframe (injected once) ── */}
      <style>{`
        @keyframes sahara-pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ──────────────────────────────────────────
   Internal reusable circle button
────────────────────────────────────────── */
function ControlButton({ active, size, icon, label, onClick, danger, pulse }) {
  const bg = danger
    ? '#E24B4A'
    : active
      ? '#E24B4A'
      : 'rgba(255,255,255,0.15)'

  const iconSize = size === 64 ? 28 : 24

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        flex: danger ? 'none' : 1
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bg,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: pulse ? 'sahara-pulse 2s ease-in-out infinite' : 'none',
          transition: 'background 0.2s',
          outline: 'none',
          // Accessible tap target
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-label={label}
      >
        <i
          className={`ti ${icon}`}
          style={{ color: 'white', fontSize: iconSize }}
        />
      </button>
      <p
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 10,
          fontWeight: 600,
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </p>
    </div>
  )
}

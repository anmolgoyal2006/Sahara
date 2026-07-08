import { useEffect, useRef } from 'react'

/**
 * VideoTile — renders a single participant's video + audio feed.
 *
 * Props:
 *   participant   — Daily.co participant object
 *   isLocal       — boolean, true for the local user
 *   isMuted       — boolean, show mute indicator
 *   isCameraOff   — boolean, show avatar instead of video
 *   label         — display name override
 */
export default function VideoTile({
  participant,
  isLocal,
  isMuted,
  isCameraOff,
  label
}) {
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!participant) return

    const videoTrack = participant.tracks?.video?.persistentTrack
    const audioTrack = participant.tracks?.audio?.persistentTrack

    if (videoRef.current && videoTrack) {
      videoRef.current.srcObject = new MediaStream([videoTrack])
    }

    // Never pipe remote audio into a muted element — use a separate audio tag
    if (audioRef.current && audioTrack && !isLocal) {
      audioRef.current.srcObject = new MediaStream([audioTrack])
    }
  }, [participant, isLocal])

  const showVideo =
    !isCameraOff && participant?.tracks?.video?.state === 'playable'

  return (
    <div
      style={{
        position: 'relative',
        background: '#0A2540',
        borderRadius: 16,
        overflow: 'hidden',
        width: '100%',
        aspectRatio: '4/3'
      }}
    >
      {/* ── Video ── */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Mirror the local feed so it feels natural
            transform: isLocal ? 'scaleX(-1)' : 'none'
          }}
        />
      ) : (
        /* ── Camera off — avatar placeholder ── */
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#1D9E75',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i
              className="ti ti-user"
              style={{ color: 'white', fontSize: 32 }}
            />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
            Camera off
          </p>
        </div>
      )}

      {/* ── Remote audio (hidden element) ── */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
      )}

      {/* ── Name label ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 6,
          padding: '3px 8px'
        }}
      >
        <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: 0 }}>
          {label || (isLocal ? 'You' : 'Family')}
          {isMuted && isLocal && ' 🔇'}
        </p>
      </div>

      {/* ── Local "YOU" badge ── */}
      {isLocal && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(29,158,117,0.8)',
            borderRadius: 6,
            padding: '2px 8px'
          }}
        >
          <p style={{ color: 'white', fontSize: 10, fontWeight: 700, margin: 0 }}>
            YOU
          </p>
        </div>
      )}
    </div>
  )
}

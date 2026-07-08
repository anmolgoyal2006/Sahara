import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useVideoCall() {
  // idle | creating | waiting | active | ended | error
  const [callState, setCallState] = useState('idle')
  const [callData, setCallData] = useState(null)
  const [error, setError] = useState(null)
  const [participants, setParticipants] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [duration, setDuration] = useState(0)

  const callObjectRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  /* ─────────────────────────────────────
     Create a new call room
  ───────────────────────────────────── */
  const createCall = useCallback(async ({ createdBy, elderId, familyId }) => {
    setCallState('creating')
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/videocall/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_by: createdBy,
          elder_id: elderId,
          family_id: familyId
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setCallData(data.call)
      setCallState('waiting')
      return data
    } catch (e) {
      setError(e.message)
      setCallState('error')
      throw e
    }
  }, [])

  /* ─────────────────────────────────────
     Join an existing call
  ───────────────────────────────────── */
  const joinCall = useCallback(async ({
    roomUrl,
    roomName,
    userName,
    callId,
    isOwner = false
  }) => {
    try {
      // Get meeting token from server
      const tokenRes = await fetch(`${API_URL}/api/videocall/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner
        })
      })
      const tokenData = await tokenRes.json()
      if (!tokenData.success) throw new Error('Could not join call')

      // Load Daily.co dynamically
      const DailyIframe = (await import('@daily-co/daily-js')).default
      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true
      })
      callObjectRef.current = callObject

      // Event: both participants in room
      callObject.on('joined-meeting', () => {
        setCallState('active')
        startTimeRef.current = Date.now()

        // Start duration timer
        timerRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)

        // Mark call as active on server
        fetch(`${API_URL}/api/videocall/start/${callId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        }).catch(console.error)
      })

      callObject.on('participant-joined', (event) => {
        setParticipants(prev => {
          const exists = prev.find(
            p => p.session_id === event.participant.session_id
          )
          if (exists) return prev
          return [...prev, event.participant]
        })
      })

      callObject.on('participant-left', (event) => {
        setParticipants(prev =>
          prev.filter(p => p.session_id !== event.participant.session_id)
        )
      })

      callObject.on('left-meeting', () => {
        setCallState('ended')
        clearInterval(timerRef.current)
      })

      callObject.on('error', (err) => {
        console.error('Daily.co error:', err)
        setError('Call error: ' + err.errorMsg)
        setCallState('error')
      })

      // Join the room
      await callObject.join({ url: roomUrl, token: tokenData.token })
    } catch (e) {
      setError(e.message)
      setCallState('error')
    }
  }, [])

  /* ─────────────────────────────────────
     Leave / end the call
  ───────────────────────────────────── */
  const leaveCall = useCallback(async (callId) => {
    clearInterval(timerRef.current)

    const callDuration = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0

    if (callObjectRef.current) {
      await callObjectRef.current.leave()
      await callObjectRef.current.destroy()
      callObjectRef.current = null
    }

    if (callId) {
      await fetch(`${API_URL}/api/videocall/end/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_seconds: callDuration })
      }).catch(console.error)
    }

    setCallState('ended')
    setParticipants([])
    setDuration(0)
  }, [])

  /* ─────────────────────────────────────
     Toggle mute
  ───────────────────────────────────── */
  const toggleMute = useCallback(() => {
    if (!callObjectRef.current) return
    const newMuted = !isMuted
    callObjectRef.current.setLocalAudio(!newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  /* ─────────────────────────────────────
     Toggle camera
  ───────────────────────────────────── */
  const toggleCamera = useCallback(() => {
    if (!callObjectRef.current) return
    const newCameraOff = !isCameraOff
    callObjectRef.current.setLocalVideo(!newCameraOff)
    setIsCameraOff(newCameraOff)
  }, [isCameraOff])

  /* ─────────────────────────────────────
     Get all participant tracks for rendering
  ───────────────────────────────────── */
  const getParticipantTracks = useCallback(() => {
    if (!callObjectRef.current) return {}
    return callObjectRef.current.participants()
  }, [])

  /* ─────────────────────────────────────
     Cleanup on unmount
  ───────────────────────────────────── */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (callObjectRef.current) {
        callObjectRef.current.destroy().catch(console.error)
      }
    }
  }, [])

  /* ─────────────────────────────────────
     Format duration as MM:SS
  ───────────────────────────────────── */
  const formattedDuration = `${String(
    Math.floor(duration / 60)
  ).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`

  return {
    callState,
    callData,
    error,
    participants,
    isMuted,
    isCameraOff,
    duration,
    formattedDuration,
    createCall,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    getParticipantTracks,
    callObject: callObjectRef.current
  }
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'
import { useGuideLanguage } from '../../hooks/useGuideLanguage'
import { useSpeech } from '../../hooks/useSpeech'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── Phase 15I config ────────────────────────────────────────────────────────
// Raise this value to require more "Need Help" clicks before auto-simplifying.
const STRUGGLE_THRESHOLD = 2

// ─── Phase 15M config ────────────────────────────────────────────────────────
// struggle_count >= this value triggers the emergency/volunteer card automatically.
const EMERGENCY_THRESHOLD = 3

// Returns text in the requested language, falling back to English
function getText(field, lang) {
  if (!field) return ''
  return field[lang] || field['en'] || ''
}

function formatSlug(slug) {
  return (slug || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function relTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const DIFFICULTY_COLOR = { easy: '#1D9E75', medium: '#BA7517', hard: '#E24B4A' }
const DIFFICULTY_BG    = { easy: '#F0FBF7', medium: '#FAEEDA', hard: '#FFF0F0' }

export default function GuideViewer() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [language, setLanguage] = useGuideLanguage()
  const { speak, stop, isSpeaking } = useSpeech()

  const [guide,       setGuide]       = useState(null)
  const [steps,       setSteps]       = useState([])
  const [stepIndex,   setStepIndex]   = useState(0)
  const [progressDoc, setProgressDoc] = useState(null)
  const [displayMode, setDisplayMode] = useState('normal') // 'normal'|'help'|'repeat'
  const [started,     setStarted]     = useState(false)
  const [startedAt,   setStartedAt]   = useState(null)
  const [completed,   setCompleted]   = useState(false)
  const [bookmarked,  setBookmarked]  = useState(false)
  const [userId,      setUserId]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [autoRead,    setAutoRead]    = useState(
    () => localStorage.getItem('sahara_guide_autoread') === 'true'
  )

  // ─── Phase 15I: Smart difficulty ─────────────────────────────────────────
  // struggleCount mirrors guide_progress.struggle_count for the current guide.
  // Once it reaches STRUGGLE_THRESHOLD the default view automatically shows
  // simplified_instruction instead of instruction.
  const [struggleCount,         setStruggleCount]         = useState(0)
  // showingSimplifiedByDefault: true = auto-simplified; false = user forced standard
  const [showStandardOverride,  setShowStandardOverride]  = useState(false)

  // ─── Phase 15J: Screenshot help ──────────────────────────────────────────
  const [screenshotMode,   setScreenshotMode]   = useState(false)   // show upload panel
  const [screenshotFile,   setScreenshotFile]   = useState(null)    // File object
  const [screenshotPreview,setScreenshotPreview]= useState(null)    // data-URL for <img>
  const [screenshotQ,      setScreenshotQ]      = useState('')      // user's typed question
  const [screenshotLoading,setScreenshotLoading]= useState(false)
  const [screenshotResult, setScreenshotResult] = useState(null)    // { location_description, explanation, ocr_text }
  const [screenshotError,  setScreenshotError]  = useState(null)
  const fileInputRef = useRef(null)

  // ─── Phase 15K: Live error detection ─────────────────────────────────────
  const [errorText,       setErrorText]       = useState('')        // user's typed error
  const [errorPanelOpen,  setErrorPanelOpen]  = useState(false)     // show the input panel
  const [errorLoading,    setErrorLoading]    = useState(false)
  const [errorResult,     setErrorResult]     = useState(null)      // { possible_reasons, fix_steps, … }
  const [errorApiError,   setErrorApiError]   = useState(null)      // network/server error msg

  // ─── Phase 15L: Watch My Screen Mode ─────────────────────────────────────
  const [watchConsent,    setWatchConsent]    = useState(false)   // user agreed to sharing
  const [watchActive,     setWatchActive]     = useState(false)   // stream is live
  const [watchChecking,   setWatchChecking]   = useState(false)   // single check in flight
  const [watchResult,     setWatchResult]     = useState(null)    // last analysis response
  const [watchError,      setWatchError]      = useState(null)
  const [showConsentFlow, setShowConsentFlow] = useState(false)   // consent modal visible
  const streamRef         = useRef(null)                          // MediaStream reference
  const videoRef          = useRef(null)                          // local preview <video>

  // ─── Phase 15M: Emergency / volunteer mode ────────────────────────────────
  // Shown automatically when struggle_count >= EMERGENCY_THRESHOLD OR when the
  // user explicitly taps the persistent "I'm stuck" button.
  const [emergencyOpen,   setEmergencyOpen]   = useState(false)
  const [volRequesting,   setVolRequesting]   = useState(false)   // call in flight
  const [volDone,         setVolDone]         = useState(null)    // 'call'|'chat' after success
  const [volError,        setVolError]        = useState(null)

  /* ── Load guide + progress + bookmarks ── */
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }
        const uid = session.user.id
        setUserId(uid)

        const [guideRes, progressRes, bookmarkRes] = await Promise.all([
          fetch(`${API_URL}/api/guides/${slug}`),
          fetch(`${API_URL}/api/guides/progress/${uid}`),
          fetch(`${API_URL}/api/guides/bookmarks/${uid}`),
        ])
        const [guideData, progressData, bookmarkData] = await Promise.all([
          guideRes.json(), progressRes.json(), bookmarkRes.json(),
        ])

        if (!guideData.success) { setError('Guide not found'); setLoading(false); return }

        const g = guideData.guide
        const sortedSteps = (g.guide_steps || []).sort((a, b) => a.step_number - b.step_number)
        setGuide(g)
        setSteps(sortedSteps)

        // Check for existing progress
        const existing = (progressData.progress || []).find(p => p.guide_slug === slug)
        if (existing) {
          setProgressDoc(existing)
          // Phase 15I: seed local struggle count from persisted value
          setStruggleCount(existing.struggle_count || 0)
        }

        // Check bookmark
        const bm = (bookmarkData.bookmarks || []).find(b => b.guide_slug === slug)
        setBookmarked(!!bm)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => stop() // clean up speech on unmount
  }, [slug, navigate, stop])

  /* ── Auto-read on step change ── */
  useEffect(() => {
    if (!started || !steps.length || completed) return
    const step = steps[stepIndex]
    if (!step) return
    // Phase 15I: determine what text to read — respect auto-simplified mode
    const isAutoSimplified = struggleCount >= STRUGGLE_THRESHOLD && !showStandardOverride
    const text = displayMode === 'help'   ? getText(step.voice_text, language) || getText(step.simplified_instruction, language)
               : displayMode === 'repeat' ? getText(step.alt_wording, language)
               : isAutoSimplified         ? getText(step.simplified_instruction, language) || getText(step.instruction, language)
               : getText(step.voice_text, language) || getText(step.instruction, language)
    if (autoRead) speak(text, language)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, started, displayMode, autoRead, struggleCount, showStandardOverride])

  /* ── Phase 15M: auto-open emergency card at threshold ── */
  useEffect(() => {
    if (struggleCount >= EMERGENCY_THRESHOLD && started && !completed) {
      setEmergencyOpen(true)
    }
  }, [struggleCount, started, completed])

  /* ── Actions ── */
  const postProgress = useCallback(async (idx) => {
    if (!userId) return
    await fetch(`${API_URL}/api/guides/${slug}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elder_id: userId, current_step: idx + 1, language }),
    }).catch(() => {})
  }, [userId, slug, language])

  function handleStart(fromStep = 0) {
    setStepIndex(fromStep)
    setStarted(true)
    setStartedAt(new Date())
    setDisplayMode('normal')
    postProgress(fromStep)
  }

  async function handleDone() {
    if (stepIndex < steps.length - 1) {
      const next = stepIndex + 1
      setStepIndex(next)
      setDisplayMode('normal')
      // Phase 15J: reset screenshot state on step advance
      setScreenshotMode(false)
      resetScreenshot()
      // Phase 15K: reset error panel on step advance
      setErrorPanelOpen(false)
      setErrorText('')
      setErrorResult(null)
      setErrorApiError(null)
      postProgress(next)
    } else {
      // Last step — complete
      await fetch(`${API_URL}/api/guides/${slug}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elder_id: userId }),
      }).catch(() => {})
      setCompleted(true)
      stop()
    }
  }

  async function handleHelp() {
    setDisplayMode('help')
    setScreenshotMode(false)
    setScreenshotResult(null)
    stop()
    const res = await fetch(`${API_URL}/api/guides/${slug}/struggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elder_id: userId }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    // Phase 15I: keep local count in sync with server's authoritative value
    const newCount = data.struggle_count ?? (struggleCount + 1)
    setStruggleCount(newCount)
    // If we're now at/above threshold, drop any "show standard" override so
    // next step naturally defaults to simplified again
    if (newCount >= STRUGGLE_THRESHOLD) setShowStandardOverride(false)
    const step = steps[stepIndex]
    if (step) speak(getText(step.simplified_instruction, language), language)
  }

  function handleRepeat() {
    setDisplayMode('repeat')
    const step = steps[stepIndex]
    if (step) speak(getText(step.alt_wording, language), language)
  }

  function handlePrevious() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
      setDisplayMode('normal')
      setScreenshotMode(false)
      resetScreenshot()
      // Phase 15K: reset error panel on back navigation
      setErrorPanelOpen(false)
      setErrorText('')
      setErrorResult(null)
      setErrorApiError(null)
    }
  }

  function handleListen() {
    const step = steps[stepIndex]
    if (!step) return
    if (isSpeaking) { stop(); return }
    const text = displayMode === 'help'   ? getText(step.simplified_instruction, language)
               : displayMode === 'repeat' ? getText(step.alt_wording, language)
               : getText(step.voice_text, language) || getText(step.instruction, language)
    speak(text, language)
  }

  async function handleBookmark() {
    if (!userId) return
    if (bookmarked) {
      await fetch(`${API_URL}/api/guides/bookmark`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elder_id: userId, guide_slug: slug }),
      }).catch(() => {})
    } else {
      await fetch(`${API_URL}/api/guides/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elder_id: userId, guide_slug: slug }),
      }).catch(() => {})
    }
    setBookmarked(v => !v)
  }

  // ─── Phase 15J: Screenshot help handlers ──────────────────────────────────
  function handleScreenshotFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotFile(file)
    setScreenshotResult(null)
    setScreenshotError(null)
    const reader = new FileReader()
    reader.onload = ev => setScreenshotPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleScreenshotSubmit() {
    if (!screenshotFile) return
    setScreenshotLoading(true)
    setScreenshotError(null)
    setScreenshotResult(null)
    try {
      const step = steps[stepIndex]
      const formData = new FormData()
      formData.append('image', screenshotFile)
      formData.append('elder_id', userId || '')
      formData.append('guide_slug', slug)
      formData.append('current_step', String(stepIndex + 1))
      formData.append('question', screenshotQ || `I cannot find how to complete step ${stepIndex + 1}`)
      formData.append('step_instruction', getText(step?.instruction, language))
      const res = await fetch(`${API_URL}/api/guides/screenshot-help`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Screenshot analysis failed')
      setScreenshotResult(data)
    } catch (e) {
      setScreenshotError(e.message)
    } finally {
      setScreenshotLoading(false)
    }
  }

  function resetScreenshot() {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setScreenshotQ('')
    setScreenshotResult(null)
    setScreenshotError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Phase 15K: error explanation handler ─────────────────────────────────
  async function handleExplainError() {
    const trimmed = errorText.trim()
    if (!trimmed) return
    setErrorLoading(true)
    setErrorResult(null)
    setErrorApiError(null)
    try {
      const res = await fetch(`${API_URL}/api/guides/explain-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_text:   trimmed,
          guide_slug:   slug,
          current_step: stepIndex + 1,
          language,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Could not analyse error')
      setErrorResult(data)
    } catch (e) {
      setErrorApiError(e.message)
    } finally {
      setErrorLoading(false)
    }
  }

  // ─── Phase 15M: volunteer request handler ────────────────────────────────
  async function handleVolunteerRequest(type) {
    setVolRequesting(true)
    setVolError(null)
    try {
      const res = await fetch(`${API_URL}/api/guides/volunteer-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elder_id:    userId,
          guide_slug:  slug,
          step_number: stepIndex + 1,
          request_type: type,   // 'call' | 'chat'
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Request failed')
      setVolDone(type)
    } catch (e) {
      setVolError(e.message)
    } finally {
      setVolRequesting(false)
    }
  }

  // ─── Phase 15L: Watch My Screen handlers ───────────────────────────────────

  // Stop the screen-capture stream and reset all related state.
  function stopScreenShare() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setWatchActive(false)
    setWatchResult(null)
    setWatchError(null)
    setWatchChecking(false)
  }

  // Clean up on unmount or when the user navigates away from the guide.
  useEffect(() => {
    return () => stopScreenShare()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start the screen capture after the user has given consent.
  async function startScreenShare() {
    setWatchError(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },   // 1 fps is plenty — we only sample on demand
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      // If the user closes the browser-native share dialog, stop cleanly.
      stream.getVideoTracks()[0].addEventListener('ended', stopScreenShare)
      setWatchActive(true)
      setWatchConsent(true)
      setShowConsentFlow(false)
    } catch (err) {
      // User cancelled or permission denied — not an error worth surfacing loudly.
      setWatchError(err.name === 'NotAllowedError' ? null : 'Could not start screen sharing: ' + err.message)
      setShowConsentFlow(false)
    }
  }

  // Capture one frame from the live stream and send it to the screenshot-help
  // endpoint (same Vision + OCR pipeline as Phase 15J — no extra server code needed).
  async function handleCheckMyScreen() {
    if (!streamRef.current || watchChecking) return
    setWatchChecking(true)
    setWatchResult(null)
    setWatchError(null)
    try {
      const track = streamRef.current.getVideoTracks()[0]
      // ImageCapture API — supported in all modern browsers
      const imageCapture = new ImageCapture(track)
      const bitmap = await imageCapture.grabFrame()

      // Draw to offscreen canvas → get Blob
      const canvas = document.createElement('canvas')
      canvas.width  = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))

      const currentStep = steps[stepIndex]
      const formData = new FormData()
      formData.append('image', blob, 'screen-frame.jpg')
      formData.append('elder_id',        userId || '')
      formData.append('guide_slug',      slug)
      formData.append('current_step',    String(stepIndex + 1))
      formData.append('question',        `Is the user on the correct screen for step ${stepIndex + 1}? If yes, confirm and give the next instruction. If no, say what screen they appear to be on and how to get back on track.`)
      formData.append('step_instruction', getText(currentStep?.instruction, language))

      const res  = await fetch(`${API_URL}/api/guides/screenshot-help`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Screen check failed')

      setWatchResult(data)
      // Speak the result aloud
      if (data.location_description) speak(data.location_description, language)
    } catch (e) {
      setWatchError(e.message)
    } finally {
      setWatchChecking(false)
    }
  }

  /* ── Loading / Error ── */
  if (loading) {
    return (
      <ElderLayout>
        <div style={{ textAlign: 'center', padding: 60, color: '#A0B8D0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #EEF4FB', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Loading guide…
        </div>
      </ElderLayout>
    )
  }

  if (error || !guide) {
    return (
      <ElderLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 48, color: '#E24B4A', display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 16, color: '#0A2540', fontWeight: 700 }}>{error || 'Guide not found'}</p>
          <button onClick={() => navigate('/elder/guides')} style={{ marginTop: 16, height: 44, padding: '0 24px', borderRadius: 12, background: '#185FA5', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Back to Guides
          </button>
        </div>
      </ElderLayout>
    )
  }

  const step = steps[stepIndex]
  const totalSteps = steps.length
  const pct = totalSteps ? Math.round(((stepIndex + (completed ? 1 : 0)) / totalSteps) * 100) : 0

  /* ── Completion screen ── */
  if (completed) {
    const mins = startedAt ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000)) : guide.estimated_minutes
    return (
      <ElderLayout>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#F0FBF7', border: '4px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <i className="ti ti-check" style={{ fontSize: 48, color: '#1D9E75' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>You did it! 🎉</h1>
          <p style={{ fontSize: 16, color: '#5A7A9A', marginBottom: 24 }}>{guide.title}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1D9E75', margin: 0 }}>{totalSteps}</p>
              <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>steps done</p>
            </div>
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#185FA5', margin: 0 }}>{mins}</p>
              <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>minutes</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => navigate('/elder/guides')} style={{ height: 52, borderRadius: 14, background: '#1D9E75', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Try Another Guide
            </button>
            <button onClick={() => navigate('/elder/home')} style={{ height: 48, borderRadius: 14, background: 'white', border: '1.5px solid #DDE8F5', color: '#5A7A9A', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to Home
            </button>
          </div>
        </div>
      </ElderLayout>
    )
  }

  /* ── Language selector ── */
  const LangSelector = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {[['en','EN'],['hi','हिंदी'],['pa','ਪੰਜਾਬੀ']].map(([code, label]) => (
        <button key={code} onClick={() => setLanguage(code)}
          style={{ height: 30, padding: '0 12px', borderRadius: 20, border: `1.5px solid ${language === code ? '#185FA5' : '#DDE8F5'}`,
            background: language === code ? '#185FA5' : 'white', color: language === code ? 'white' : '#5A7A9A',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {label}
        </button>
      ))}
    </div>
  )

  /* ── Start / Resume screen ── */
  if (!started) {
    const resumeStep = progressDoc?.current_step ?? null
    return (
      <ElderLayout>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={() => navigate('/elder/guides')} style={{ background: 'none', border: 'none', color: '#185FA5', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Guides
            </button>
            <button onClick={handleBookmark} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? '#BA7517' : '#A0B8D0', fontSize: 22 }}>
              <i className={`ti ti-star${bookmarked ? '-filled' : ''}`} />
            </button>
          </div>

          <LangSelector />

          {guide.source === 'ai_generated' && (
            <div style={{ background: '#FAEEDA', border: '1px solid #F5C77A', borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#BA7517', fontWeight: 600 }}>
              ⚠ AI-generated — steps may not exactly match the current app UI
            </div>
          )}

          {/* Guide info card */}
          <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', marginBottom: 12 }}>{guide.title}</h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: DIFFICULTY_COLOR[guide.difficulty], background: DIFFICULTY_BG[guide.difficulty], borderRadius: 20, padding: '2px 10px' }}>
                {guide.difficulty}
              </span>
              <span style={{ fontSize: 11, color: '#5A7A9A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-clock" style={{ fontSize: 12 }} /> ~{guide.estimated_minutes} min
              </span>
              <span style={{ fontSize: 11, color: '#5A7A9A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-list" style={{ fontSize: 12 }} /> {totalSteps} steps
              </span>
            </div>

            {resumeStep && resumeStep > 1 ? (
              <>
                <div style={{ background: '#EBF4FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#185FA5', fontWeight: 600 }}>
                  You were on Step {resumeStep} of {totalSteps} · {relTime(progressDoc.last_active_at)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => handleStart(resumeStep - 1)} style={{ height: 52, borderRadius: 14, background: '#185FA5', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Resume from Step {resumeStep}
                  </button>
                  <button onClick={() => handleStart(0)} style={{ height: 44, borderRadius: 14, background: 'white', border: '1.5px solid #DDE8F5', color: '#5A7A9A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Start Over from Step 1
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => handleStart(0)} style={{ width: '100%', height: 56, borderRadius: 14, background: '#1D9E75', border: 'none', color: 'white', fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-player-play" style={{ fontSize: 18 }} /> Start Guide
              </button>
            )}
          </div>
        </div>
      </ElderLayout>
    )
  }

  /* ── Step viewer ── */
  // Phase 15I: when struggle_count >= threshold and user hasn't toggled back to
  // standard, automatically show simplified_instruction as the default.
  const isAutoSimplified = struggleCount >= STRUGGLE_THRESHOLD && !showStandardOverride

  const instructionText = displayMode === 'help'   ? getText(step?.simplified_instruction, language)
                        : displayMode === 'repeat' ? getText(step?.alt_wording, language)
                        : isAutoSimplified         ? getText(step?.simplified_instruction, language) || getText(step?.instruction, language)
                        : getText(step?.instruction, language)

  return (
    <ElderLayout>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => navigate('/elder/guides')} style={{ background: 'none', border: 'none', color: '#185FA5', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Exit Guide
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#5A7A9A' }}>{guide.title}</span>
          <button onClick={handleBookmark} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? '#BA7517' : '#A0B8D0', fontSize: 22 }}>
            <i className={`ti ti-star${bookmarked ? '-filled' : ''}`} />
          </button>
        </div>

        <LangSelector />

        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0A2540' }}>Step {stepIndex + 1} of {totalSteps}</span>
            <span style={{ fontSize: 13, color: '#A0B8D0', fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= stepIndex ? '#1D9E75' : '#DDE8F5', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        {guide.source === 'ai_generated' && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F5C77A', borderRadius: 10, padding: '6px 12px', marginBottom: 12, fontSize: 11, color: '#BA7517', fontWeight: 600 }}>
            ⚠ AI-generated — verify against the actual app
          </div>
        )}

        {/* Step card */}
        <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 20, padding: '24px 20px', marginBottom: 16, boxShadow: '0 4px 20px rgba(10,37,64,0.06)' }}>
          {/* Location hint */}
          {step?.ui_element_location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EBF4FF', borderRadius: 20, padding: '4px 14px', marginBottom: 16, fontSize: 14, color: '#185FA5', fontWeight: 600 }}>
              <i className="ti ti-map-pin" style={{ fontSize: 14 }} />
              {step.ui_element_location}
            </div>
          )}

          {/* Instruction */}
          <p style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', lineHeight: 1.4, margin: 0 }}>
            {instructionText}
          </p>

          {/* Mode label */}
          {/* Phase 15I: auto-simplified default banner */}
          {isAutoSimplified && displayMode === 'normal' && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', background: '#EBF4FF', borderRadius: 20, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 11 }} /> Showing easier instructions
              </span>
              <button onClick={() => setShowStandardOverride(true)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#A0B8D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Show standard version
              </button>
            </div>
          )}
          {/* When user manually switched back to standard while above threshold */}
          {isAutoSimplified === false && showStandardOverride && struggleCount >= STRUGGLE_THRESHOLD && displayMode === 'normal' && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#A0B8D0' }}>Standard version</span>
              <button onClick={() => setShowStandardOverride(false)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#185FA5', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Back to easier version
              </button>
            </div>
          )}
          {displayMode === 'help' && (
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#F0FBF7', borderRadius: 20, padding: '3px 10px' }}>
                Simplified explanation
              </span>
              <button onClick={() => setDisplayMode('normal')} style={{ marginLeft: 10, background: 'none', border: 'none', fontSize: 12, color: '#A0B8D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Back to normal
              </button>
            </div>
          )}
          {displayMode === 'repeat' && (
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', background: '#EBF4FF', borderRadius: 20, padding: '3px 10px' }}>
                Another way to say it
              </span>
              <button onClick={() => setDisplayMode('normal')} style={{ marginLeft: 10, background: 'none', border: 'none', fontSize: 12, color: '#A0B8D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Back to normal
              </button>
            </div>
          )}
        </div>

        {/* Listen button */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button
            onClick={handleListen}
            aria-label={isSpeaking ? 'Stop reading' : 'Read this step aloud'}
            style={{ height: 48, padding: '0 28px', borderRadius: 24, border: '1.5px solid #DDE8F5', background: 'white', color: isSpeaking ? '#1D9E75' : '#5A7A9A', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <i className={`ti ti-${isSpeaking ? 'volume-2' : 'volume'}`} style={{ fontSize: 18, animation: isSpeaking ? 'pulse 1s ease-in-out infinite' : 'none' }} />
            {isSpeaking ? 'Reading…' : 'Listen'}
          </button>
        </div>

        {/* ── Phase 15K: Live error detection ── */}
        {/* The "What's happening?" toggle is always visible during a guide step */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => {
              setErrorPanelOpen(v => !v)
              if (errorPanelOpen) {
                setErrorText('')
                setErrorResult(null)
                setErrorApiError(null)
              }
            }}
            style={{
              width: '100%', height: 44, borderRadius: 12,
              background: errorPanelOpen ? '#FFF8F0' : 'white',
              border: `1.5px solid ${errorPanelOpen ? '#F5C77A' : '#DDE8F5'}`,
              color: '#BA7517', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />
            {errorPanelOpen ? 'Hide error helper' : 'Seeing an error? Tell me what it says'}
          </button>

          {errorPanelOpen && (
            <div style={{
              background: '#FFF8F0', border: '1.5px solid #F5C77A',
              borderRadius: 14, padding: 16, marginTop: 6,
            }}>
              <p style={{ fontSize: 13, color: '#7A4400', fontWeight: 700, margin: '0 0 10px' }}>
                What does the screen say?
              </p>
              <textarea
                value={errorText}
                onChange={e => { setErrorText(e.target.value); setErrorResult(null); setErrorApiError(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExplainError() } }}
                placeholder='e.g. "Invalid password" or "OTP has expired" or "No internet connection"'
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1.5px solid #F5C77A', fontSize: 14, fontFamily: 'inherit',
                  color: '#0A2540', background: 'white', resize: 'none', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {errorApiError && (
                <p style={{ fontSize: 12, color: '#E24B4A', margin: '8px 0 0', fontWeight: 600 }}>
                  {errorApiError}
                </p>
              )}

              <button
                onClick={handleExplainError}
                disabled={errorLoading || !errorText.trim()}
                style={{
                  marginTop: 10, width: '100%', height: 44, borderRadius: 10,
                  background: errorLoading || !errorText.trim() ? '#A0B8D0' : '#BA7517',
                  border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
                  cursor: errorLoading || !errorText.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                }}>
                {errorLoading
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Analysing…</>
                  : <><i className="ti ti-search" style={{ fontSize: 15 }} /> Explain this error</>}
              </button>

              {/* Result card */}
              {errorResult && (
                <div style={{ marginTop: 14 }}>
                  {errorResult.needs_more_detail ? (
                    /* Vague input → ask for more detail */
                    <div style={{
                      background: '#FFF0F0', border: '1.5px solid #FFC5C5',
                      borderRadius: 12, padding: '12px 14px',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#E24B4A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-question-mark" style={{ fontSize: 14 }} /> A bit more detail would help
                      </p>
                      <p style={{ fontSize: 14, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>
                        {errorResult.clarification_prompt}
                      </p>
                    </div>
                  ) : (
                    /* Substantive diagnosis */
                    <div style={{
                      background: '#FFFBF0', border: '1.5px solid #F5C77A',
                      borderRadius: 12, padding: '14px',
                    }}>
                      {/* Possible reasons */}
                      {errorResult.possible_reasons?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: '#BA7517', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Why this might be happening
                          </p>
                          <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                            {errorResult.possible_reasons.map((r, i) => (
                              <li key={i} style={{ fontSize: 14, color: '#0A2540', lineHeight: 1.5, marginBottom: 4 }}>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Fix steps */}
                      {errorResult.fix_steps?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 800, color: '#BA7517', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Try these steps
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {errorResult.fix_steps.map((s, i) => (
                              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{
                                  flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                                  background: '#BA7517', color: 'white', fontSize: 12,
                                  fontWeight: 800, display: 'flex', alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  {i + 1}
                                </span>
                                <p style={{ fontSize: 14, color: '#0A2540', margin: 0, lineHeight: 1.5, paddingTop: 2 }}>
                                  {/* Strip leading "1. " numbering if Gemini included it */}
                                  {s.replace(/^\d+\.\s*/, '')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Previous */}
        {stepIndex > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button onClick={handlePrevious} style={{ background: 'none', border: 'none', fontSize: 13, color: '#A0B8D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Previous Step
            </button>
          </div>
        )}

        {/* ── Phase 15M: Persistent "I'm stuck" button ── */}
        {/* Always visible regardless of struggle count — independent of the error helper */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => { setEmergencyOpen(v => !v); setVolDone(null); setVolError(null) }}
            aria-label="I'm stuck — get extra help"
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: emergencyOpen ? '#FFF0F0' : (/* inherit card bg */ 'white'),
              border: `1.5px solid ${emergencyOpen ? '#E24B4A' : '#DDE8F5'}`,
              color: '#E24B4A', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <i className="ti ti-hand-stop" style={{ fontSize: 17 }} />
            {emergencyOpen ? 'Hide extra help' : "I'm stuck — get extra help"}
          </button>

          {/* Emergency / volunteer card */}
          {emergencyOpen && (
            <div style={{
              background: '#FFF8F8', border: '1.5px solid #FFC5C5',
              borderRadius: 14, padding: 20, marginTop: 6,
            }}>
              {volDone ? (
                /* Success state */
                <div style={{ textAlign: 'center' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 40, color: '#1D9E75', display: 'block', marginBottom: 10 }} />
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>
                    {volDone === 'call' ? 'Call requested!' : 'Chat requested!'}
                  </p>
                  <p style={{ fontSize: 16, color: '#5A7A9A', margin: '0 0 16px', lineHeight: 1.5 }}>
                    A volunteer has been notified. Someone will reach out to you shortly.
                  </p>
                  <button
                    onClick={() => { setVolDone(null); setEmergencyOpen(false) }}
                    style={{
                      height: 48, padding: '0 24px', borderRadius: 12,
                      background: '#1D9E75', border: 'none', color: 'white',
                      fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    OK, thank you
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>
                    Would you like some extra help?
                  </p>
                  <p style={{ fontSize: 16, color: '#5A7A9A', margin: '0 0 18px', lineHeight: 1.5 }}>
                    A volunteer can help you finish this step.
                    Choose how you'd like to be helped:
                  </p>

                  {volError && (
                    <p style={{ fontSize: 14, color: '#E24B4A', margin: '0 0 12px', fontWeight: 600 }}>
                      {volError}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={() => handleVolunteerRequest('call')}
                      disabled={volRequesting}
                      aria-label="Request a phone call from a volunteer"
                      style={{
                        height: 56, borderRadius: 14,
                        background: volRequesting ? '#A0B8D0' : '#185FA5',
                        border: 'none', color: 'white', fontSize: 17, fontWeight: 700,
                        cursor: volRequesting ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 10,
                      }}
                    >
                      {volRequesting
                        ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        : <i className="ti ti-phone" style={{ fontSize: 20 }} />}
                      Call a Volunteer
                    </button>

                    <button
                      onClick={() => handleVolunteerRequest('chat')}
                      disabled={volRequesting}
                      aria-label="Request a chat with a volunteer"
                      style={{
                        height: 56, borderRadius: 14,
                        background: volRequesting ? '#A0B8D0' : 'white',
                        border: '1.5px solid #185FA5', color: '#185FA5',
                        fontSize: 17, fontWeight: 700,
                        cursor: volRequesting ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 10,
                      }}
                    >
                      <i className="ti ti-message-circle" style={{ fontSize: 20 }} />
                      Chat with a Volunteer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — Phase 15M accessibility pass: ≥44px height, ≥16px font, aria-labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleDone}
            aria-label={stepIndex === steps.length - 1 ? 'Mark guide as done' : 'Mark this step as done and go to next'}
            style={{ height: 64, borderRadius: 16, background: '#1D9E75', border: 'none', color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-check" style={{ fontSize: 22 }} />
            {stepIndex === steps.length - 1 ? 'Done!' : '✓ Done'}
          </button>
          <button
            onClick={handleHelp}
            aria-label="Show a simpler explanation for this step"
            style={{ height: 56, borderRadius: 14, background: '#FAEEDA', border: '1.5px solid #F5C77A', color: '#BA7517', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-help" style={{ fontSize: 18 }} /> Need Help
          </button>
          {/* Phase 15J: screenshot help button — shown after "Need Help" is tapped */}
          {displayMode === 'help' && (
            <button
              onClick={() => { setScreenshotMode(v => !v); if (screenshotMode) resetScreenshot() }}
              aria-label="Upload a screenshot to get help"
              style={{ height: 52, borderRadius: 14, background: screenshotMode ? '#EBF4FF' : 'white', border: `1.5px solid ${screenshotMode ? '#185FA5' : '#DDE8F5'}`, color: '#185FA5', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="ti ti-camera" style={{ fontSize: 17 }} /> 📷 Upload Screenshot
            </button>
          )}
          <button
            onClick={handleRepeat}
            aria-label="Hear this step explained a different way"
            style={{ height: 56, borderRadius: 14, background: 'white', border: '1.5px solid #185FA5', color: '#185FA5', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-repeat" style={{ fontSize: 18 }} /> Repeat
          </button>
        </div>

        {/* Phase 15J: Screenshot upload panel */}
        {screenshotMode && displayMode === 'help' && (
          <div style={{ background: '#F4F8FC', border: '1.5px solid #DDE8F5', borderRadius: 16, padding: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>Get help from a screenshot</p>
              <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0, fontStyle: 'italic' }}>Your screenshot is not saved.</p>
            </div>

            {/* File picker */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotFileChange}
              style={{ display: 'none' }} id="screenshot-upload" />
            {!screenshotPreview ? (
              <label htmlFor="screenshot-upload"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 90, border: '2px dashed #DDE8F5', borderRadius: 12, cursor: 'pointer', color: '#A0B8D0', fontSize: 13, fontWeight: 600, gap: 6, background: 'white' }}>
                <i className="ti ti-photo-up" style={{ fontSize: 28 }} />
                Tap to choose a screenshot
              </label>
            ) : (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <img src={screenshotPreview} alt="Screenshot preview"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, border: '1px solid #DDE8F5' }} />
                <button onClick={() => { resetScreenshot() }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(10,37,64,0.65)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            )}

            {/* Question input */}
            <textarea
              value={screenshotQ}
              onChange={e => setScreenshotQ(e.target.value)}
              placeholder={`e.g. I cannot find the Create Account button`}
              rows={2}
              style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #DDE8F5', fontSize: 14, fontFamily: 'inherit', color: '#0A2540', background: 'white', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />

            {screenshotError && (
              <p style={{ fontSize: 12, color: '#E24B4A', margin: '8px 0 0', fontWeight: 600 }}>{screenshotError}</p>
            )}

            {/* Submit */}
            <button onClick={handleScreenshotSubmit}
              disabled={screenshotLoading || !screenshotFile}
              style={{ marginTop: 10, width: '100%', height: 48, borderRadius: 12, background: screenshotLoading || !screenshotFile ? '#A0B8D0' : '#185FA5', border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: screenshotLoading || !screenshotFile ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {screenshotLoading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Analysing…</>
                : <><i className="ti ti-search" style={{ fontSize: 16 }} /> Analyse Screenshot</>}
            </button>

            {/* Result */}
            {screenshotResult && (
              <div style={{ marginTop: 14, background: 'white', border: '1.5px solid #1D9E75', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0A2540', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 14, color: '#1D9E75' }} /> Where to look
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#185FA5', margin: '0 0 10px', lineHeight: 1.4 }}>
                  {screenshotResult.location_description}
                </p>
                {screenshotResult.explanation && (
                  <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>
                    {screenshotResult.explanation}
                  </p>
                )}
                {screenshotResult.ocr_text && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: 11, color: '#A0B8D0', cursor: 'pointer', fontWeight: 600 }}>Text found in screenshot</summary>
                    <p style={{ fontSize: 11, color: '#5A7A9A', margin: '4px 0 0', fontFamily: 'monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{screenshotResult.ocr_text}</p>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Phase 15L: Watch My Screen Mode ── */}

        {/* Persistent "Screen sharing active" banner */}
        {watchActive && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#0A2540', borderRadius: 12, padding: '10px 14px', marginTop: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Pulsing red dot */}
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: '#E24B4A',
                flexShrink: 0, animation: 'pulse 1s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>
                Screen sharing active
              </span>
            </div>
            <button onClick={stopScreenShare}
              style={{
                height: 32, padding: '0 14px', borderRadius: 8,
                background: '#E24B4A', border: 'none', color: 'white',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Stop
            </button>
          </div>
        )}

        {/* Consent modal */}
        {showConsentFlow && !watchActive && (
          <div style={{
            background: '#F4F8FC', border: '1.5px solid #185FA5',
            borderRadius: 16, padding: 20, marginTop: 12,
          }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0A2540', margin: '0 0 10px' }}>
              📺 Watch My Screen
            </p>
            <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 14px', lineHeight: 1.6 }}>
              Sahara will take a single snapshot of your screen when you tap{' '}
              <strong>"Check My Screen"</strong>. The snapshot is <strong>not saved</strong>.
              You can stop sharing at any time.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={startScreenShare}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: '#185FA5', border: 'none', color: 'white',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                I Agree, Start
              </button>
              <button onClick={() => setShowConsentFlow(false)}
                style={{
                  height: 48, padding: '0 16px', borderRadius: 12,
                  background: 'white', border: '1.5px solid #DDE8F5', color: '#5A7A9A',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Cancel
              </button>
            </div>
            {watchError && (
              <p style={{ fontSize: 12, color: '#E24B4A', margin: '10px 0 0', fontWeight: 600 }}>
                {watchError}
              </p>
            )}
          </div>
        )}

        {/* Entry button — only shown when not yet active and consent modal is closed */}
        {!watchActive && !showConsentFlow && (
          <button onClick={() => setShowConsentFlow(true)}
            style={{
              width: '100%', height: 44, borderRadius: 12, marginTop: 10,
              background: 'white', border: '1.5px solid #DDE8F5',
              color: '#5A7A9A', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <i className="ti ti-screen-share" style={{ fontSize: 15 }} />
            Watch My Screen
          </button>
        )}

        {/* Active session: local preview + "Check My Screen" button */}
        {watchActive && (
          <div style={{ marginTop: 12 }}>
            {/* Small local preview so the user always sees what's being shared */}
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%', maxHeight: 140, objectFit: 'contain',
                borderRadius: 10, border: '1px solid #DDE8F5',
                background: '#0A2540', display: 'block', marginBottom: 10,
              }}
            />

            <button onClick={handleCheckMyScreen}
              disabled={watchChecking}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: watchChecking ? '#A0B8D0' : '#185FA5',
                border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
                cursor: watchChecking ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {watchChecking
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking…</>
                : <><i className="ti ti-eye" style={{ fontSize: 17 }} /> Check My Screen</>}
            </button>

            {watchError && (
              <p style={{ fontSize: 12, color: '#E24B4A', margin: '8px 0 0', fontWeight: 600 }}>
                {watchError}
              </p>
            )}

            {/* Screen-check result */}
            {watchResult && (
              <div style={{
                marginTop: 12, background: 'white',
                border: '1.5px solid #1D9E75', borderRadius: 12, padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 800, color: '#0A2540',
                  margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <i className="ti ti-eye-check" style={{ fontSize: 14, color: '#1D9E75' }} />
                  Screen feedback
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#185FA5', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {watchResult.location_description}
                </p>
                {watchResult.explanation && (
                  <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>
                    {watchResult.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auto-read toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#A0B8D0', fontWeight: 600 }}>Auto-read steps</span>
          <div onClick={() => { const v = !autoRead; setAutoRead(v); localStorage.setItem('sahara_guide_autoread', String(v)) }}
            style={{ width: 40, height: 22, borderRadius: 11, background: autoRead ? '#1D9E75' : '#DDE8F5', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: autoRead ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </ElderLayout>
  )
}

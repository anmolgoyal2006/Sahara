import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'
import { useGuideLanguage } from '../../hooks/useGuideLanguage'
import { useSpeech } from '../../hooks/useSpeech'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
        if (existing) setProgressDoc(existing)

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
    const text = displayMode === 'help'   ? getText(step.voice_text, language) || getText(step.simplified_instruction, language)
               : displayMode === 'repeat' ? getText(step.alt_wording, language)
               : getText(step.voice_text, language) || getText(step.instruction, language)
    if (autoRead) speak(text, language)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, started, displayMode, autoRead])

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
    stop()
    await fetch(`${API_URL}/api/guides/${slug}/struggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elder_id: userId }),
    }).catch(() => {})
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
        <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', padding: '40px 16px' }}>
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
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
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
  const instructionText = displayMode === 'help'   ? getText(step?.simplified_instruction, language)
                        : displayMode === 'repeat' ? getText(step?.alt_wording, language)
                        : getText(step?.instruction, language)

  return (
    <ElderLayout>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EBF4FF', borderRadius: 20, padding: '4px 12px', marginBottom: 16, fontSize: 12, color: '#185FA5', fontWeight: 600 }}>
              <i className="ti ti-map-pin" style={{ fontSize: 12 }} />
              {step.ui_element_location}
            </div>
          )}

          {/* Instruction */}
          <p style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', lineHeight: 1.4, margin: 0 }}>
            {instructionText}
          </p>

          {/* Mode label */}
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
          <button onClick={handleListen}
            style={{ height: 44, padding: '0 24px', borderRadius: 22, border: '1.5px solid #DDE8F5', background: 'white', color: isSpeaking ? '#1D9E75' : '#5A7A9A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <i className={`ti ti-${isSpeaking ? 'volume-2' : 'volume'}`} style={{ fontSize: 16, animation: isSpeaking ? 'pulse 1s ease-in-out infinite' : 'none' }} />
            {isSpeaking ? 'Reading…' : 'Listen'}
          </button>
        </div>

        {/* Previous */}
        {stepIndex > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button onClick={handlePrevious} style={{ background: 'none', border: 'none', fontSize: 13, color: '#A0B8D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Previous Step
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleDone} style={{ height: 60, borderRadius: 16, background: '#1D9E75', border: 'none', color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-check" style={{ fontSize: 22 }} />
            {stepIndex === steps.length - 1 ? 'Done!' : '✓ Done'}
          </button>
          <button onClick={handleHelp} style={{ height: 52, borderRadius: 14, background: '#FAEEDA', border: '1.5px solid #F5C77A', color: '#BA7517', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-help" style={{ fontSize: 18 }} /> Need Help
          </button>
          <button onClick={handleRepeat} style={{ height: 52, borderRadius: 14, background: 'white', border: '1.5px solid #185FA5', color: '#185FA5', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-repeat" style={{ fontSize: 18 }} /> Repeat
          </button>
        </div>

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

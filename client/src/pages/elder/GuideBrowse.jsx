/**
 * Phase 15M — GuideHome (replaces the old GuideBrowse)
 * Route: /elder/guides
 *
 * Features:
 *  - "How do I…?" search bar → search → AI generation fallback
 *  - 10-category grid
 *  - Popular guides horizontal scroll
 *  - Difficulty + time badges on every card
 *  - Dark mode toggle (local, persisted in localStorage)
 *  - Accessibility: ≥16 px body text, ≥44 px tap targets, WCAG AA contrast
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'
import { useGuideLanguage } from '../../hooks/useGuideLanguage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── Theming ──────────────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('sahara_guide_dark') === 'true')
  function toggle() {
    setDark(v => {
      const next = !v
      localStorage.setItem('sahara_guide_dark', String(next))
      return next
    })
  }
  return [dark, toggle]
}

// Returns a palette object so every sub-component can pull colours consistently.
function palette(dark) {
  return {
    bg:       dark ? '#0A1628' : '#F4F8FC',
    card:     dark ? '#132035' : '#FFFFFF',
    border:   dark ? '#1E3050' : '#DDE8F5',
    text:     dark ? '#E8F0FA' : '#0A2540',
    sub:      dark ? '#7A9EC8' : '#5A7A9A',
    muted:    dark ? '#4A6A8A' : '#A0B8D0',
    accent:   '#1D9E75',
    blue:     '#185FA5',
    amber:    '#BA7517',
    amberBg:  dark ? '#2A1A00' : '#FAEEDA',
  }
}

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'government',    label: 'Government',    icon: 'ti-building-community', color: '#185FA5', bg: '#EBF4FF', darkBg: '#0D1E35' },
  { key: 'health',        label: 'Health',         icon: 'ti-heart-rate-monitor', color: '#E24B4A', bg: '#FFF0F0', darkBg: '#2A0D0D' },
  { key: 'banking',       label: 'Banking',        icon: 'ti-building-bank',      color: '#1D9E75', bg: '#F0FBF7', darkBg: '#0D2A1E' },
  { key: 'communication', label: 'Calling & Chat', icon: 'ti-message-chatbot',    color: '#8B5CF6', bg: '#F5F3FF', darkBg: '#1A1130' },
  { key: 'entertainment', label: 'Entertainment',  icon: 'ti-device-tv',          color: '#EC4899', bg: '#FDF2F8', darkBg: '#2A0D1E' },
  { key: 'shopping',      label: 'Shopping',       icon: 'ti-shopping-cart',      color: '#F59E0B', bg: '#FFFBEB', darkBg: '#2A2000' },
  { key: 'payments',      label: 'Payments',       icon: 'ti-credit-card',        color: '#10B981', bg: '#ECFDF5', darkBg: '#0D2A1E' },
  { key: 'social_media',  label: 'Social Media',   icon: 'ti-brand-instagram',    color: '#3B82F6', bg: '#EFF6FF', darkBg: '#0D1E35' },
  { key: 'education',     label: 'Education',      icon: 'ti-book',               color: '#6366F1', bg: '#EEF2FF', darkBg: '#13112A' },
  { key: 'travel',        label: 'Travel',         icon: 'ti-map-pin',            color: '#0A2540', bg: '#EBF4FF', darkBg: '#0D1628' },
]

const DIFF_COLOR = { easy: '#1D9E75', medium: '#BA7517', hard: '#E24B4A' }
const DIFF_BG    = { easy: '#F0FBF7', medium: '#FAEEDA', hard: '#FFF0F0' }
const DIFF_BG_DK = { easy: '#0D2A1E', medium: '#2A1A00', hard: '#2A0D0D' }

// ─── Guide card ──────────────────────────────────────────────────────────────
function GuideCard({ guide, dark, onClick }) {
  const p    = palette(dark)
  const cat  = CATEGORIES.find(c => c.key === guide.category) || CATEGORIES[8]
  const dBg  = dark ? DIFF_BG_DK[guide.difficulty] : DIFF_BG[guide.difficulty]
  return (
    <button
      onClick={onClick}
      aria-label={`Open guide: ${guide.title}`}
      style={{
        background: p.card, border: `1.5px solid ${p.border}`, borderRadius: 14,
        padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column',
        gap: 10, textAlign: 'left', fontFamily: 'inherit', width: '100%',
        minHeight: 44,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: dark ? cat.darkBg : cat.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${cat.icon}`} style={{ fontSize: 22, color: cat.color }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: p.text, margin: 0, lineHeight: 1.35 }}>
        {guide.title}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: DIFF_COLOR[guide.difficulty], background: dBg, borderRadius: 20, padding: '3px 10px' }}>
          {guide.difficulty}
        </span>
        <span style={{ fontSize: 12, color: p.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="ti ti-clock" style={{ fontSize: 12 }} /> {guide.estimated_minutes}m
        </span>
        {guide.source === 'ai_generated' && (
          <span style={{ fontSize: 11, color: p.amber, background: p.amberBg, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>AI</span>
        )}
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GuideBrowse() {
  const navigate = useNavigate()
  const [language, setLanguage] = useGuideLanguage()
  const [dark, toggleDark]      = useTheme()
  const p = palette(dark)

  const [popular,        setPopular]        = useState([])
  const [categoryGuides, setCategoryGuides] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [catLoading,     setCatLoading]     = useState(false)

  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [searchFound,    setSearchFound]    = useState(null)
  const [generating,     setGenerating]     = useState(false)
  const [genError,       setGenError]       = useState(null)
  const [pageLoading,    setPageLoading]    = useState(true)

  const debounceRef  = useRef(null)
  const popularRef   = useRef(null)   // horizontal scroll ref

  // Load popular guides + check auth
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      try {
        const res  = await fetch(`${API_URL}/api/guides/popular`)
        const data = await res.json()
        if (data.success) setPopular(data.guides || [])
      } catch { /* silent */ }
      finally { setPageLoading(false) }
    }
    load()
  }, [navigate])

  // Category tap — load guides for that category
  async function handleCategory(cat) {
    if (activeCategory === cat) { setActiveCategory(null); setCategoryGuides([]); return }
    setActiveCategory(cat)
    setCatLoading(true)
    setSearchQuery('')
    setSearchResults([])
    setSearchFound(null)
    try {
      const res  = await fetch(`${API_URL}/api/guides/by-category/${cat}`)
      const data = await res.json()
      setCategoryGuides(data.guides || [])
    } catch { setCategoryGuides([]) }
    finally { setCatLoading(false) }
  }

  // Search with debounce
  function handleSearchInput(val) {
    setSearchQuery(val)
    setGenError(null)
    setActiveCategory(null)
    setCategoryGuides([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim() || val.trim().length < 2) { setSearchResults([]); setSearchFound(null); return }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res  = await fetch(`${API_URL}/api/guides/search?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSearchResults(data.guides || [])
        setSearchFound(data.found)
      } catch { setSearchFound(false) }
      finally { setSearchLoading(false) }
    }, 400)
  }

  // AI generation fallback
  async function handleGenerate() {
    setGenerating(true); setGenError(null)
    try {
      const res  = await fetch(`${API_URL}/api/guides/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Generation failed')
      navigate(`/elder/guide/${data.guide.slug}`)
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // What to show in the main grid
  const showSearch   = searchQuery.trim().length >= 2
  const showCategory = !!activeCategory && !showSearch
  const gridGuides   = showSearch ? searchResults : showCategory ? categoryGuides : []
  const showGrid     = showSearch || showCategory

  return (
    <ElderLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', background: p.bg, minHeight: '100vh', padding: '0 0 40px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: p.text, margin: 0, lineHeight: 1.2 }}>
              Digital Guide
            </h1>
            <p style={{ fontSize: 16, color: p.sub, margin: '4px 0 0' }}>
              Learn any app, step by step
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: p.card, border: `1.5px solid ${p.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: p.sub, fontSize: 20,
              }}
            >
              <i className={`ti ti-${dark ? 'sun' : 'moon'}`} />
            </button>
            {/* My Guides */}
            <button
              onClick={() => navigate('/elder/guides/my-guides')}
              style={{
                height: 44, padding: '0 16px', borderRadius: 12,
                border: `1.5px solid ${p.border}`, background: p.card,
                color: p.blue, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="ti ti-bookmark" style={{ fontSize: 15 }} /> My Guides
            </button>
          </div>
        </div>

        {/* ── Language selector ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['en','English'],['hi','हिंदी'],['pa','ਪੰਜਾਬੀ']].map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              style={{
                height: 44, padding: '0 16px', borderRadius: 22,
                border: `1.5px solid ${language === code ? p.blue : p.border}`,
                background: language === code ? p.blue : p.card,
                color: language === code ? '#FFF' : p.sub,
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: p.card, border: `1.5px solid ${p.border}`,
            borderRadius: 16, overflow: 'hidden',
          }}>
            <i className="ti ti-search" style={{ fontSize: 20, color: p.muted, padding: '0 14px', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="How do I… e.g. send money with UPI"
              aria-label="Search guides"
              style={{
                flex: 1, height: 56, border: 'none', background: 'transparent',
                fontSize: 17, color: p.text, fontFamily: 'inherit', outline: 'none', paddingRight: 12,
              }}
            />
            {searchLoading && (
              <div style={{ width: 20, height: 20, border: `2px solid ${p.border}`, borderTop: `2px solid ${p.accent}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 14, flexShrink: 0 }} />
            )}
            {searchQuery && !searchLoading && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchFound(null) }}
                aria-label="Clear search"
                style={{ background: 'none', border: 'none', padding: '0 14px', cursor: 'pointer', color: p.muted, fontSize: 18, minWidth: 44, minHeight: 44 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* AI generation fallback */}
          {searchFound === false && searchQuery.trim().length >= 2 && (
            <div style={{
              background: p.card, border: `1.5px solid ${p.border}`,
              borderRadius: 14, padding: 16, marginTop: 8,
            }}>
              <p style={{ fontSize: 16, color: p.sub, margin: '0 0 12px' }}>
                No guide found for <strong style={{ color: p.text }}>"{searchQuery}"</strong>
              </p>
              {genError && <p style={{ fontSize: 14, color: '#E24B4A', margin: '0 0 10px', fontWeight: 600 }}>{genError}</p>}
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  height: 48, padding: '0 24px', borderRadius: 12,
                  background: generating ? p.muted : '#8B5CF6',
                  border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                {generating
                  ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Creating your guide…</>
                  : <><i className="ti ti-sparkles" style={{ fontSize: 17 }} /> Generate with AI</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Category grid ── */}
        <section aria-label="Guide categories" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: p.text, margin: '0 0 12px' }}>Browse by Category</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }} className="cat-grid">
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategory(cat.key)}
                  aria-pressed={active}
                  aria-label={cat.label}
                  style={{
                    background: active ? cat.color : (dark ? cat.darkBg : cat.bg),
                    border: `1.5px solid ${active ? cat.color : p.border}`,
                    borderRadius: 14, padding: '12px 4px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    minHeight: 72, fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  <i className={`ti ${cat.icon}`} style={{ fontSize: 24, color: active ? '#fff' : cat.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : p.sub, textAlign: 'center', lineHeight: 1.2 }}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Category results or search results ── */}
        {showGrid && (
          <section aria-live="polite" style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: p.text, margin: '0 0 12px' }}>
              {showSearch
                ? `Results for "${searchQuery}"`
                : `${CATEGORIES.find(c => c.key === activeCategory)?.label || ''} Guides`}
            </p>
            {catLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: p.muted }}>
                <div style={{ width: 28, height: 28, border: `3px solid ${p.border}`, borderTop: `3px solid ${p.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : gridGuides.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: p.muted, fontSize: 16 }}>No guides found</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="guide-grid">
                {gridGuides.map(g => (
                  <GuideCard key={g.id || g.slug} guide={g} dark={dark} onClick={() => navigate(`/elder/guide/${g.slug}`)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Popular guides — horizontal scroll ── */}
        {!showGrid && (
          <section aria-label="Popular guides" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: p.text, margin: 0 }}>Popular Guides</p>
              <button
                onClick={() => navigate('/elder/guides/my-guides')}
                style={{ background: 'none', border: 'none', fontSize: 14, color: p.blue, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44, padding: '0 4px' }}
              >
                My Guides →
              </button>
            </div>

            {pageLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: p.muted }}>
                <div style={{ width: 28, height: 28, border: `3px solid ${p.border}`, borderTop: `3px solid ${p.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : popular.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: p.muted, fontSize: 16 }}>No popular guides yet</div>
            ) : (
              // Horizontal scroll strip
              <div
                ref={popularRef}
                style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}
                className="pop-scroll"
              >
                {popular.map(g => {
                  const cat = CATEGORIES.find(c => c.key === g.category) || CATEGORIES[8]
                  const dBg = dark ? DIFF_BG_DK[g.difficulty] : DIFF_BG[g.difficulty]
                  return (
                    <button
                      key={g.id || g.slug}
                      onClick={() => navigate(`/elder/guide/${g.slug}`)}
                      aria-label={`Open guide: ${g.title}`}
                      style={{
                        flexShrink: 0, width: 180,
                        background: p.card, border: `1.5px solid ${p.border}`,
                        borderRadius: 14, padding: 14, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: dark ? cat.darkBg : cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`ti ${cat.icon}`} style={{ fontSize: 20, color: cat.color }} />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: p.text, margin: 0, lineHeight: 1.3 }}>
                        {g.title}
                      </p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: DIFF_COLOR[g.difficulty], background: dBg, borderRadius: 20, padding: '2px 8px' }}>
                          {g.difficulty}
                        </span>
                        <span style={{ fontSize: 11, color: p.muted }}>{g.estimated_minutes}m</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Full grid below scroll strip */}
            {!pageLoading && popular.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: p.text, margin: '0 0 12px' }}>All Popular</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="guide-grid">
                  {popular.map(g => (
                    <GuideCard key={`grid-${g.id || g.slug}`} guide={g} dark={dark} onClick={() => navigate(`/elder/guide/${g.slug}`)} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .pop-scroll::-webkit-scrollbar { display: none }
        @media (max-width: 480px) {
          .cat-grid  { grid-template-columns: repeat(5, 1fr) !important; }
          .guide-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 640px) {
          .guide-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </ElderLayout>
  )
}

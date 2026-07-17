import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'
import { useGuideLanguage } from '../../hooks/useGuideLanguage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const CATEGORY_ICON = {
  government: 'ti-building-community', health: 'ti-heart-rate-monitor',
  banking: 'ti-building-bank',          communication: 'ti-message-chatbot',
  entertainment: 'ti-device-tv',        shopping: 'ti-shopping-cart',
  payments: 'ti-credit-card',           social_media: 'ti-brand-instagram',
  education: 'ti-book',                 travel: 'ti-map-pin',
}
const CATEGORY_COLOR = {
  government: '#185FA5', health: '#E24B4A',   banking: '#1D9E75',
  communication: '#8B5CF6', entertainment: '#EC4899', shopping: '#F59E0B',
  payments: '#10B981', social_media: '#3B82F6', education: '#6366F1', travel: '#0A2540',
}
const CATEGORY_BG = {
  government: '#EBF4FF', health: '#FFF0F0',   banking: '#F0FBF7',
  communication: '#F5F3FF', entertainment: '#FDF2F8', shopping: '#FFFBEB',
  payments: '#ECFDF5', social_media: '#EFF6FF', education: '#EEF2FF', travel: '#EBF4FF',
}
const DIFF_COLOR = { easy: '#1D9E75', medium: '#BA7517', hard: '#E24B4A' }
const DIFF_BG    = { easy: '#F0FBF7', medium: '#FAEEDA', hard: '#FFF0F0' }

function GuideCard({ guide, onClick }) {
  const icon  = CATEGORY_ICON[guide.category]  || 'ti-book'
  const color = CATEGORY_COLOR[guide.category] || '#5A7A9A'
  const bg    = CATEGORY_BG[guide.category]    || '#EBF4FF'
  return (
    <div onClick={onClick} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,37,64,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0, lineHeight: 1.3 }}>{guide.title}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: DIFF_COLOR[guide.difficulty], background: DIFF_BG[guide.difficulty], borderRadius: 20, padding: '2px 8px' }}>
          {guide.difficulty}
        </span>
        <span style={{ fontSize: 10, color: '#A0B8D0' }}>~{guide.estimated_minutes}m</span>
        {guide.source === 'ai_generated' && (
          <span style={{ fontSize: 10, color: '#BA7517', background: '#FAEEDA', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>AI</span>
        )}
      </div>
    </div>
  )
}

export default function GuideBrowse() {
  const navigate = useNavigate()
  const [language, setLanguage] = useGuideLanguage()
  const [popular,       setPopular]       = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchFound,   setSearchFound]   = useState(null)
  const [generating,    setGenerating]    = useState(false)
  const [genError,      setGenError]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const debounceRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/api/guides/popular`)
      .then(r => r.json())
      .then(d => { if (d.success) setPopular(d.guides || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSearchInput(val) {
    setSearchQuery(val)
    setGenError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]); setSearchFound(null); return
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res  = await fetch(`${API_URL}/api/guides/search?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSearchResults(data.guides || [])
        setSearchFound(data.found)
      } catch { setSearchFound(false) }
      finally  { setSearchLoading(false) }
    }, 400)
  }

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

  const displayGuides = searchQuery.trim().length >= 2 ? searchResults : popular

  return (
    <ElderLayout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: 0 }}>Digital Guide</h1>
            <p style={{ fontSize: 13, color: '#A0B8D0', margin: '2px 0 0' }}>Learn any app, step by step</p>
          </div>
          <button onClick={() => navigate('/elder/guides/my-guides')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#185FA5', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-bookmark" style={{ fontSize: 13 }} /> My Guides
          </button>
        </div>

        {/* Language selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['en','English'],['hi','हिंदी'],['pa','ਪੰਜਾਬੀ']].map(([code, label]) => (
            <button key={code} onClick={() => setLanguage(code)}
              style={{ height: 32, padding: '0 14px', borderRadius: 20, border: `1.5px solid ${language === code ? '#185FA5' : '#DDE8F5'}`,
                background: language === code ? '#185FA5' : 'white', color: language === code ? 'white' : '#5A7A9A',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, overflow: 'hidden' }}>
            <i className="ti ti-search" style={{ fontSize: 18, color: '#A0B8D0', padding: '0 12px', flexShrink: 0 }} />
            <input
              type="text" value={searchQuery} onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search — e.g. Gmail, UPI, Aadhaar…"
              style={{ flex: 1, height: 50, border: 'none', background: 'transparent', fontSize: 15, color: '#0A2540', fontFamily: 'inherit', outline: 'none', paddingRight: 12 }}
            />
            {searchLoading && <div style={{ width: 18, height: 18, border: '2px solid #DDE8F5', borderTop: '2px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 12, flexShrink: 0 }} />}
            {searchQuery && !searchLoading && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchFound(null) }}
                style={{ background: 'none', border: 'none', padding: '0 12px', cursor: 'pointer', color: '#A0B8D0', fontSize: 16 }}>
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* Not found — offer AI generation */}
          {searchFound === false && searchQuery.trim().length >= 2 && (
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16, marginTop: 8 }}>
              <p style={{ fontSize: 14, color: '#5A7A9A', margin: '0 0 12px' }}>
                No guide found for <strong>"{searchQuery}"</strong>
              </p>
              {genError && (
                <p style={{ fontSize: 12, color: '#E24B4A', margin: '0 0 10px' }}>{genError}</p>
              )}
              <button onClick={handleGenerate} disabled={generating}
                style={{ height: 44, padding: '0 20px', borderRadius: 12, background: generating ? '#A0B8D0' : '#8B5CF6', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {generating ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</> : <><i className="ti ti-sparkles" style={{ fontSize: 16 }} /> Generate with AI</>}
              </button>
            </div>
          )}
        </div>

        {/* Guide grid */}
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>
          {searchQuery.trim().length >= 2 ? `Results for "${searchQuery}"` : 'Popular Guides'}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A0B8D0' }}>Loading guides…</div>
        ) : displayGuides.length === 0 && searchQuery.trim().length >= 2 && searchFound !== false ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A0B8D0' }}>Searching…</div>
        ) : displayGuides.length === 0 && !searchQuery ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A0B8D0' }}>No guides available yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="guide-grid">
            {displayGuides.map(g => (
              <GuideCard key={g.id || g.slug} guide={g} onClick={() => navigate(`/elder/guide/${g.slug}`)} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (min-width: 640px) { .guide-grid { grid-template-columns: repeat(3, 1fr) !important; } }
      `}</style>
    </ElderLayout>
  )
}

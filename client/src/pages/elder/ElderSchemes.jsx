/**
 * ElderSchemes — Phase 14E
 * Main scheme assistant page for elders (3 tabs).
 *
 * Tab 1 — Check Eligibility (form → results)
 * Tab 2 — Eligible for Me   (filtered by saved profile)
 * Tab 3 — All Schemes       (browse + search, paginated, server-side)
 *
 * Safety: status values displayed here come unchanged from the server's
 * evaluateEligibility(). AI reasons are cosmetic overlays only — they
 * never change a status value. The scheme count shown in the loading
 * text is dynamic from /all, never hardcoded.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ElderLayout from '../../components/layout/ElderLayout'
import EligibilityForm from '../../components/schemes/EligibilityForm'
import SchemeCard from '../../components/schemes/SchemeCard'
import {
  useSchemeCount,
  useSchemeCategories,
  useSchemeSearch,
  useEligibilityCheck,
} from '../../hooks/useSchemes'

const TABS = ['Check Eligibility', 'For Me', 'All Schemes']

/* ─────────────────────────────────────
   Results panel (Tab 1 & 2 shared)
───────────────────────────────────── */
function ResultsPanel ({ data, onReset }) {
  const [expandedId, setExpandedId] = useState(null)
  const [showIneligible, setShowIneligible] = useState(false)

  if (!data) return null

  const { summary, results } = data
  const visible = [
    ...results.ELIGIBLE,
    ...results.LIKELY_ELIGIBLE,
    ...results.CHECK_REQUIRED,
  ]

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Eligible',        value: summary.eligible,        color: '#1D9E75', bg: '#F0FBF7' },
          { label: 'Likely',          value: summary.likely_eligible, color: '#185FA5', bg: '#EBF4FF' },
          { label: 'Check Required',  value: summary.check_required,  color: '#BA7517', bg: '#FAEEDA' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: s.color, margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5A7A9A' }}>
          <i className="ti ti-mood-sad" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>No matching schemes for this profile.</p>
        </div>
      )}

      {visible.map(s => (
        <div key={s.id} style={{ marginBottom: 10 }}>
          <SchemeCard
            scheme={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
          />
        </div>
      ))}

      {/* Ineligible schemes — collapsed by default */}
      {results.INELIGIBLE.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowIneligible(v => !v)}
            style={{
              width: '100%', height: 40, borderRadius: 10,
              border: '1.5px solid #DDE8F5', background: 'white',
              color: '#5A7A9A', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'Noto Sans, sans-serif',
            }}
          >
            <i className={`ti ${showIneligible ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
            {showIneligible ? 'Hide' : 'Show'} {results.INELIGIBLE.length} schemes you don't qualify for
          </button>
          {showIneligible && (
            <div style={{ marginTop: 8, opacity: 0.7 }}>
              {results.INELIGIBLE.map(s => (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <SchemeCard
                    scheme={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #DDE8F5',
          background: 'white', color: '#185FA5', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', marginTop: 20, fontFamily: 'Noto Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <i className="ti ti-refresh" />Check Again
      </button>
    </div>
  )
}

/* ─────────────────────────────────────
   Browse panel (Tab 3)
───────────────────────────────────── */
function BrowsePanel () {
  const { categories, loading: catLoading } = useSchemeCategories()
  const { results, total, page, totalPages, loading, search } = useSchemeSearch()

  const [q,        setQ]        = useState('')
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const debounceRef = useRef(null)

  // Initial load
  useEffect(() => { search('', 'all', 1) }, [search])

  function handleSearch (newQ, newCat, newPage = 1) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(newQ, newCat === 'all' ? '' : newCat, newPage)
    }, 300)
  }

  function onQueryChange (v) {
    setQ(v)
    handleSearch(v, category)
  }
  function onCategoryChange (c) {
    setCategory(c)
    handleSearch(q, c)
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'white', border: '1.5px solid #DDE8F5',
        borderRadius: 12, padding: '0 14px', marginBottom: 14, height: 46,
      }}>
        <i className="ti ti-search" style={{ fontSize: 16, color: '#A0B8D0' }} />
        <input
          type="text"
          placeholder="Search schemes…"
          value={q}
          onChange={e => onQueryChange(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 15,
            fontFamily: 'Noto Sans, sans-serif', color: '#0A2540', background: 'transparent',
          }}
        />
        {q && (
          <button onClick={() => onQueryChange('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 14, color: '#A0B8D0' }} />
          </button>
        )}
      </div>

      {/* Category chips — built from /api/schemes/categories, never hardcoded */}
      {!catLoading && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {[{ id: 'all', label: 'All', icon: 'ti-layout-grid' }, ...categories].map(c => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              style={{
                flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 20,
                border: category === c.id ? 'none' : '1.5px solid #DDE8F5',
                background: category === c.id ? '#185FA5' : 'white',
                color: category === c.id ? 'white' : '#5A7A9A',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'Noto Sans, sans-serif',
              }}
            >
              <i className={`ti ${c.icon || 'ti-list'}`} style={{ fontSize: 13 }} />
              {c.label}
              {c.count != null && <span style={{ fontSize: 10, opacity: 0.8 }}>({c.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <p style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 12 }}>
        {loading ? 'Loading…' : `${total} scheme${total !== 1 ? 's' : ''} found`}
        {totalPages > 1 && !loading && ` · Page ${page} of ${totalPages}`}
      </p>

      {/* Cards */}
      {loading
        ? <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #EEF4FB', borderTop: '2px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        : results.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5A7A9A' }}>
              <i className="ti ti-search-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <p>No schemes match your search.</p>
            </div>
          : results.map(s => (
              <div key={s.id} style={{ marginBottom: 10 }}>
                <BrowseSchemeCard
                  scheme={s}
                  expanded={expanded === s.id}
                  onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                />
              </div>
            ))
      }

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button
            disabled={page <= 1}
            onClick={() => { search(q, category === 'all' ? '' : category, page - 1) }}
            style={{ height: 36, padding: '0 16px', borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#185FA5', fontWeight: 700, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 13, color: '#5A7A9A' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => { search(q, category === 'all' ? '' : category, page + 1) }}
            style={{ height: 36, padding: '0 16px', borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#185FA5', fontWeight: 700, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* Browse card — simplified (no eligibility status) */
function BrowseSchemeCard ({ scheme, expanded, onToggle }) {
  const KNOWN_CAT = {
    pension:'#185FA5', health:'#E24B4A', insurance:'#1D9E75', savings:'#BA7517',
    agriculture:'#2D7A3A', housing:'#7B5EA7', welfare:'#185FA5', disability:'#BA7517',
    education:'#1D9E75', employment:'#185FA5', women:'#D4518A', banking:'#185FA5',
  }
  const catColor = KNOWN_CAT[scheme.category] || '#5A7A9A'

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: `1.5px solid ${expanded ? '#BDD6F0' : '#DDE8F5'}`,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
          fontFamily: 'Noto Sans, sans-serif',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: '#F0F4FA',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-receipt" style={{ fontSize: 18, color: catColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2540' }}>{scheme.name}</span>
            {scheme.short_name && (
              <span style={{ fontSize: 11, background: '#F0F4FA', color: '#5A7A9A', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>
                {scheme.short_name}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, background: '#F0F4FA', color: catColor, borderRadius: 20, padding: '2px 10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {scheme.category}
          </span>
          {expanded ? null : (
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: '6px 0 0', lineHeight: 1.5 }}>
              {scheme.description?.slice(0, 100)}{scheme.description?.length > 100 ? '…' : ''}
            </p>
          )}
        </div>
        <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
           style={{ fontSize: 16, color: '#A0B8D0', flexShrink: 0 }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #EEF4FB' }}>
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: '12px 0', lineHeight: 1.6 }}>
            {scheme.description}
          </p>
          <div style={{ background: '#EBF4FF', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Benefit</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0 }}>{scheme.benefit?.amount}</p>
          </div>
          {scheme.apply_url && (
            <a
              href={scheme.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 40, borderRadius: 10, background: '#185FA5', color: 'white',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              <i className="ti ti-external-link" />Learn More / Apply
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────
   Main page
───────────────────────────────────── */
export default function ElderSchemes ({ overrideProfile, showHeader = true }) {
  const navigate    = useNavigate()
  const [tab, setTab] = useState(0)

  const schemeCount                        = useSchemeCount()
  const { checking, results, error, check, reset } = useEligibilityCheck()

  // For Tab 2 — auto-check if overrideProfile provided (caregiver use)
  useEffect(() => {
    if (overrideProfile) {
      check(overrideProfile)
      setTab(1)
    }
  }, [overrideProfile]) // eslint-disable-line

  function handleFormSubmit (profile) {
    check(profile)
    setTab(1)
  }

  const loadingText = schemeCount
    ? `Analysing ${schemeCount} government schemes…`
    : 'Analysing government schemes…'

  return (
    <ElderLayout userName={null}>
      <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Noto Sans, sans-serif' }}>
        {/* Header */}
        {showHeader && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDE8F5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 16, color: '#5A7A9A' }} />
            </button>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: 0 }}>Government Schemes</h1>
              <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0 }}>
                {schemeCount ? `${schemeCount} schemes · ` : ''}Find what you qualify for
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'white', borderRadius: 12, padding: 4,
          border: '1.5px solid #DDE8F5', marginBottom: 20,
        }}>
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                flex: 1, height: 36, borderRadius: 9, border: 'none',
                background: tab === i ? '#185FA5' : 'transparent',
                color: tab === i ? 'white' : '#5A7A9A',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Noto Sans, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Form ── */}
        {tab === 0 && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #185FA5 0%, #0A3D6B 100%)', borderRadius: 16, padding: '20px', marginBottom: 24, color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-building-bank" style={{ fontSize: 22 }} />
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Scheme Eligibility Check</p>
                  <p style={{ fontSize: 12, margin: 0, opacity: 0.85 }}>
                    {schemeCount ? `Checking across ${schemeCount} verified schemes` : 'Checking government schemes'}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                Answer a few questions and we'll show you which government schemes you qualify for — instantly, and without any AI guessing.
              </p>
            </div>
            <EligibilityForm onSubmit={handleFormSubmit} loading={checking} />
          </div>
        )}

        {/* ── Tab 1: Results ── */}
        {tab === 1 && (
          <div>
            {checking && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 48, height: 48, border: '3px solid #EEF4FB', borderTop: '3px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>{loadingText}</p>
                <p style={{ fontSize: 13, color: '#5A7A9A' }}>This takes a few seconds…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}
            {error && !checking && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <i className="ti ti-wifi-off" style={{ fontSize: 36, color: '#E24B4A', display: 'block', marginBottom: 12 }} />
                <p style={{ color: '#E24B4A', fontWeight: 700 }}>Could not check eligibility.</p>
                <p style={{ color: '#5A7A9A', fontSize: 13 }}>{error}</p>
                <button onClick={() => { reset(); setTab(0) }} style={{ marginTop: 12, height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: '#185FA5', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>
                  Try Again
                </button>
              </div>
            )}
            {results && !checking && (
              <ResultsPanel data={results} onReset={() => { reset(); setTab(0) }} />
            )}
            {!checking && !results && !error && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A7A9A' }}>
                <i className="ti ti-clipboard-list" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>No results yet.</p>
                <p style={{ fontSize: 13 }}>Fill in the form to check your eligibility.</p>
                <button onClick={() => setTab(0)} style={{ marginTop: 12, height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: '#185FA5', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>
                  Fill Form
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Browse all ── */}
        {tab === 2 && <BrowsePanel />}
      </div>
    </ElderLayout>
  )
}

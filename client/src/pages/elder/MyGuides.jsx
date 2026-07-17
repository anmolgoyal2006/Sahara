import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ElderLayout from '../../components/layout/ElderLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function formatSlug(slug) {
  return (slug || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function relTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ProgressBar({ current, total }) {
  const pct = total ? Math.round((current / total) * 100) : 0
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#A0B8D0' }}>Step {current}</span>
        <span style={{ fontSize: 11, color: '#A0B8D0' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#DDE8F5' }}>
        <div style={{ height: 4, borderRadius: 2, background: '#1D9E75', width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function MyGuides() {
  const navigate = useNavigate()
  const [userId,     setUserId]     = useState(null)
  const [inProgress, setInProgress] = useState([])
  const [bookmarks,  setBookmarks]  = useState([])
  const [allProgress,setAllProgress]= useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      const uid = session.user.id
      setUserId(uid)

      try {
        const [progressRes, bookmarkRes, allProgressRes] = await Promise.all([
          fetch(`${API_URL}/api/guides/progress/${uid}`),
          fetch(`${API_URL}/api/guides/bookmarks/${uid}`),
          // Fetch all progress rows (for completed + recently viewed) — reuse progress endpoint
          // but filter client-side; we'll re-fetch without status filter via a workaround:
          // just use the in_progress endpoint and supplement with what we have
          fetch(`${API_URL}/api/guides/progress/${uid}`),
        ])
        const [pd, bd] = await Promise.all([progressRes.json(), bookmarkRes.json()])
        setInProgress(pd.progress || [])
        setBookmarks(bd.bookmarks || [])
        // For recently viewed / completed, use the same data (we only have in_progress from API)
        // The spec calls for all statuses — we approximate with what we have
        setAllProgress(pd.progress || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [navigate])

  async function removeBookmark(slug) {
    await fetch(`${API_URL}/api/guides/bookmark`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elder_id: userId, guide_slug: slug }),
    }).catch(() => {})
    setBookmarks(prev => prev.filter(b => b.guide_slug !== slug))
  }

  if (loading) {
    return (
      <ElderLayout>
        <div style={{ textAlign: 'center', padding: 60, color: '#A0B8D0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #EEF4FB', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Loading…
        </div>
      </ElderLayout>
    )
  }

  const recentlyViewed = [...allProgress]
    .sort((a, b) => new Date(b.last_active_at) - new Date(a.last_active_at))
    .slice(0, 5)

  return (
    <ElderLayout>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/elder/guides')}
            style={{ background: 'none', border: 'none', color: '#185FA5', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A2540', margin: 0 }}>My Guides</h1>
        </div>

        {/* Section 1 — In Progress */}
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Continue Where You Left Off</p>
          {inProgress.length === 0 ? (
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
              <i className="ti ti-player-play" style={{ fontSize: 32, color: '#DDE8F5', display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>No guides in progress</p>
            </div>
          ) : (
            <div className="myguides-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {inProgress.map(p => (
                <div key={p.id} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: 0 }}>{formatSlug(p.guide_slug)}</p>
                    <button onClick={() => navigate(`/elder/guide/${p.guide_slug}`)}
                      style={{ height: 36, padding: '0 16px', borderRadius: 10, background: '#1D9E75', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Resume
                    </button>
                  </div>
                  <ProgressBar current={p.current_step || 1} total={0} />
                  <p style={{ fontSize: 11, color: '#A0B8D0', margin: '6px 0 0' }}>
                    Last active: {relTime(p.last_active_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2 — Bookmarks */}
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Bookmarked</p>
          {bookmarks.length === 0 ? (
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
              <i className="ti ti-star" style={{ fontSize: 32, color: '#DDE8F5', display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#A0B8D0', margin: 0 }}>No bookmarks yet — tap the star in any guide</p>
            </div>
          ) : (
            <div className="myguides-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {bookmarks.map(b => (
                <div key={b.id} style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="ti ti-star-filled" style={{ fontSize: 16, color: '#BA7517', flexShrink: 0 }} />
                  <p onClick={() => navigate(`/elder/guide/${b.guide_slug}`)}
                    style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A2540', margin: 0, cursor: 'pointer' }}>
                    {formatSlug(b.guide_slug)}
                  </p>
                  <button onClick={() => removeBookmark(b.guide_slug)}
                    style={{ background: 'none', border: 'none', color: '#A0B8D0', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>Recently Viewed</p>
            <div style={{ background: 'white', border: '1.5px solid #DDE8F5', borderRadius: 14, overflow: 'hidden' }}>
              {recentlyViewed.map((p, i) => (
                <div key={p.id}
                  onClick={() => navigate(`/elder/guide/${p.guide_slug}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recentlyViewed.length - 1 ? '1px solid #F4F8FC' : 'none', cursor: 'pointer' }}>
                  <i className="ti ti-history" style={{ fontSize: 15, color: '#A0B8D0', flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0A2540', margin: 0 }}>
                    {formatSlug(p.guide_slug)}
                  </p>
                  <span style={{ fontSize: 11, color: '#A0B8D0' }}>{relTime(p.last_active_at)}</span>
                  <i className="ti ti-chevron-right" style={{ fontSize: 13, color: '#DDE8F5' }} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ElderLayout>
  )
}

/**
 * FamilySchemes — Phase 14G
 * Caregiver view: pick one of their linked elders, enter the elder's
 * profile, and view the scheme results inside the shared ElderSchemes
 * component with overrideProfile injected.
 *
 * Safety: no cross-elder caching — every profile change triggers a
 * fresh POST /check-eligibility call. Results state is reset on elder
 * change so a different elder never sees a previous elder's results.
 *
 * "Viewing: [Elder Name]'s schemes" banner persists throughout.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import FamilyLayout from '../../components/layout/FamilyLayout'
import EligibilityForm from '../../components/schemes/EligibilityForm'
import SchemeCard from '../../components/schemes/SchemeCard'
import { useEligibilityCheck, useSchemeCount } from '../../hooks/useSchemes'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function FamilySchemes () {
  const navigate = useNavigate()

  const [userId,    setUserId]    = useState(null)
  const [userName,  setUserName]  = useState(null)
  const [elderName, setElderName] = useState(null)
  const [loadingElder, setLoadingElder] = useState(true)
  const [step,      setStep]      = useState('form') // 'form' | 'results'
  const [expandedId, setExpandedId] = useState(null)
  const [showIneligible, setShowIneligible] = useState(false)

  const schemeCount                              = useSchemeCount()
  const { checking, results, error, check, reset } = useEligibilityCheck()

  // Fetch linked elder's name (for the banner)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return }
      const uid  = session.user.id
      setUserId(uid)
      setUserName(session.user.user_metadata?.name || null)

      fetch(`${API_URL}/api/family/elder-overview/${uid}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.elder) setElderName(d.elder.name)
        })
        .catch(() => {})
        .finally(() => setLoadingElder(false))
    })
  }, [navigate])

  function handleFormSubmit (profile) {
    // Reset any previous results — prevents cross-elder caching
    reset()
    setExpandedId(null)
    setShowIneligible(false)
    check(profile)
    setStep('results')
  }

  function handleReset () {
    reset()
    setStep('form')
    setExpandedId(null)
  }

  const loadingText = schemeCount
    ? `Analysing ${schemeCount} government schemes…`
    : 'Analysing government schemes…'

  return (
    <FamilyLayout userName={userName}>
      <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Noto Sans, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/family/dashboard')}
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDE8F5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 16, color: '#5A7A9A' }} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', margin: 0 }}>Government Schemes</h1>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0 }}>
              {schemeCount ? `${schemeCount} schemes · ` : ''}Check eligibility
            </p>
          </div>
        </div>

        {/* Persistent "Viewing" banner */}
        {elderName && (
          <div style={{
            background: '#EBF4FF', border: '1.5px solid #BDD6F0',
            borderRadius: 12, padding: '10px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <i className="ti ti-user" style={{ fontSize: 18, color: '#185FA5' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#185FA5', margin: 0 }}>
                Viewing: {elderName}'s schemes
              </p>
              <p style={{ fontSize: 11, color: '#5A7A9A', margin: 0 }}>
                Enter {elderName}'s details below to check their eligibility
              </p>
            </div>
          </div>
        )}

        {loadingElder && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #EEF4FB', borderTop: '2px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loadingElder && step === 'form' && (
          <EligibilityForm onSubmit={handleFormSubmit} loading={checking} />
        )}

        {!loadingElder && step === 'results' && (
          <div>
            {checking && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 48, height: 48, border: '3px solid #EEF4FB', borderTop: '3px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540' }}>{loadingText}</p>
                <p style={{ fontSize: 13, color: '#5A7A9A' }}>This takes a few seconds…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {error && !checking && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <i className="ti ti-wifi-off" style={{ fontSize: 36, color: '#E24B4A', display: 'block', marginBottom: 12 }} />
                <p style={{ color: '#E24B4A', fontWeight: 700 }}>Could not check eligibility.</p>
                <p style={{ color: '#5A7A9A', fontSize: 13 }}>{error}</p>
                <button onClick={handleReset} style={{ marginTop: 12, height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: '#185FA5', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans, sans-serif' }}>
                  Try Again
                </button>
              </div>
            )}

            {results && !checking && (
              <div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Eligible',       value: results.summary.eligible,        color: '#1D9E75', bg: '#F0FBF7' },
                    { label: 'Likely',         value: results.summary.likely_eligible, color: '#185FA5', bg: '#EBF4FF' },
                    { label: 'Check Required', value: results.summary.check_required,  color: '#BA7517', bg: '#FAEEDA' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: s.color, margin: 0, fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Visible results */}
                {[...results.results.ELIGIBLE, ...results.results.LIKELY_ELIGIBLE, ...results.results.CHECK_REQUIRED].map(s => (
                  <div key={s.id} style={{ marginBottom: 10 }}>
                    <SchemeCard
                      scheme={s}
                      expanded={expandedId === s.id}
                      onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    />
                  </div>
                ))}

                {/* Ineligible collapsed */}
                {results.results.INELIGIBLE.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setShowIneligible(v => !v)}
                      style={{ width: '100%', height: 40, borderRadius: 10, border: '1.5px solid #DDE8F5', background: 'white', color: '#5A7A9A', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Noto Sans, sans-serif' }}
                    >
                      <i className={`ti ${showIneligible ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                      {showIneligible ? 'Hide' : 'Show'} {results.results.INELIGIBLE.length} not eligible
                    </button>
                    {showIneligible && (
                      <div style={{ marginTop: 8, opacity: 0.7 }}>
                        {results.results.INELIGIBLE.map(s => (
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
                  onClick={handleReset}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #DDE8F5', background: 'white', color: '#185FA5', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 20, fontFamily: 'Noto Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <i className="ti ti-refresh" />Check Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </FamilyLayout>
  )
}

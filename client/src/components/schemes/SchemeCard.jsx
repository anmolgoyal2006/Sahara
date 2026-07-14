/**
 * SchemeCard — Phase 14D
 * Renders a single scheme result card.
 *
 * Safety rule: the status prop is ALWAYS the value that came from the
 * rules engine (evaluateEligibility). This component never re-derives it.
 *
 * Category styling: falls back to a neutral grey style for any category
 * not in CATEGORY_STYLES — new HF-imported categories render correctly,
 * just without a custom color until one is added.
 */

const STATUS_CONFIG = {
  ELIGIBLE: {
    badge: 'Eligible',
    color: '#1D9E75',
    bg:    '#F0FBF7',
    border:'#B7E8D8',
    icon:  'ti-circle-check',
  },
  LIKELY_ELIGIBLE: {
    badge: 'Likely Eligible',
    color: '#185FA5',
    bg:    '#EBF4FF',
    border:'#BDD6F0',
    icon:  'ti-info-circle',
  },
  CHECK_REQUIRED: {
    badge: 'Check Required',
    color: '#BA7517',
    bg:    '#FAEEDA',
    border:'#F0C97A',
    icon:  'ti-alert-triangle',
  },
  INELIGIBLE: {
    badge: 'Not Eligible',
    color: '#E24B4A',
    bg:    '#FFF0F0',
    border:'#F5C1C1',
    icon:  'ti-circle-x',
  },
}

const CATEGORY_STYLES = {
  pension:     { color: '#185FA5', bg: '#EBF4FF', icon: 'ti-coin' },
  health:      { color: '#E24B4A', bg: '#FFF0F0', icon: 'ti-heart-rate-monitor' },
  insurance:   { color: '#1D9E75', bg: '#F0FBF7', icon: 'ti-shield-check' },
  savings:     { color: '#BA7517', bg: '#FAEEDA', icon: 'ti-piggy-bank' },
  agriculture: { color: '#2D7A3A', bg: '#F0FAF2', icon: 'ti-plant' },
  housing:     { color: '#7B5EA7', bg: '#F5F0FF', icon: 'ti-home' },
  welfare:     { color: '#185FA5', bg: '#EBF4FF', icon: 'ti-hand-heart' },
  disability:  { color: '#BA7517', bg: '#FAEEDA', icon: 'ti-wheelchair' },
  education:   { color: '#1D9E75', bg: '#F0FBF7', icon: 'ti-school' },
  employment:  { color: '#185FA5', bg: '#EBF4FF', icon: 'ti-briefcase' },
  women:       { color: '#D4518A', bg: '#FFF0F8', icon: 'ti-venus' },
  banking:     { color: '#185FA5', bg: '#EBF4FF', icon: 'ti-building-bank' },
  // fallback for any unrecognised category (HF import may add new ones)
  _fallback:   { color: '#5A7A9A', bg: '#F5F8FC', icon: 'ti-list' },
}

function getCategoryStyle (category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES._fallback
}

export default function SchemeCard ({ scheme, expanded, onToggle }) {
  const sc  = STATUS_CONFIG[scheme.status] || STATUS_CONFIG.CHECK_REQUIRED
  const cat = getCategoryStyle(scheme.category)

  // The human-friendly AI reason (if generated) takes precedence for display;
  // the code reason is always present as a fallback.
  const displayReason = scheme.ai_reason || scheme.reason

  // Source tag: show only for HF-imported entries that have been verified
  const isHfImport = scheme.source?.includes('gov_myscheme')

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: `1.5px solid ${expanded ? sc.border : '#DDE8F5'}`,
      overflow: 'hidden', transition: 'border-color 0.15s',
      boxShadow: expanded ? `0 2px 12px ${sc.color}18` : '0 1px 4px rgba(10,37,64,0.04)',
    }}>
      {/* Category header strip */}
      <div style={{
        background: cat.bg, padding: '6px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${cat.color}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={`ti ${cat.icon}`} style={{ fontSize: 13, color: cat.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {scheme.category}
          </span>
        </div>
        {isHfImport && scheme.last_verified && (
          <span style={{ fontSize: 10, color: '#5A7A9A', fontStyle: 'italic' }}>
            via MyScheme · verified {scheme.last_verified}
          </span>
        )}
        {!isHfImport && scheme.last_verified && (
          <span style={{ fontSize: 10, color: '#5A7A9A' }}>
            Verified {scheme.last_verified}
          </span>
        )}
      </div>

      {/* Main clickable row */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
          fontFamily: 'Noto Sans, sans-serif',
        }}
      >
        {/* Status icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: sc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
        }}>
          <i className={`ti ${sc.icon}`} style={{ fontSize: 18, color: sc.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2540' }}>{scheme.name}</span>
            {scheme.short_name && (
              <span style={{ fontSize: 11, background: '#F0F4FA', color: '#5A7A9A', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>
                {scheme.short_name}
              </span>
            )}
          </div>

          {/* Status badge */}
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
            borderRadius: 20, padding: '2px 10px', marginBottom: 6,
          }}>
            {sc.badge}
          </span>

          {/* Reason */}
          <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>
            {displayReason}
          </p>
        </div>

        <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
           style={{ fontSize: 16, color: '#A0B8D0', flexShrink: 0, marginTop: 8 }} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${sc.border}` }}>
          {/* Benefit */}
          <div style={{ marginTop: 14, background: sc.bg, borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: sc.color, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <i className="ti ti-gift" style={{ marginRight: 4 }} />Benefit
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
              {scheme.estimated_benefit?.amount}
            </p>
            {scheme.estimated_benefit?.duration && (
              <p style={{ fontSize: 12, color: '#5A7A9A', margin: 0 }}>
                Duration: {scheme.estimated_benefit.duration}
              </p>
            )}
          </div>

          {/* Ministry */}
          {scheme.ministry && (
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-building" style={{ fontSize: 13 }} />
              {scheme.ministry}
            </p>
          )}

          {/* Conditions needing manual check */}
          {scheme.conditions?.length > 0 && (
            <div style={{ marginTop: 12, background: '#FAEEDA', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#BA7517', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-alert-triangle" />Conditions to verify manually
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {scheme.conditions.map((c, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 3 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents */}
          {scheme.documents?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2540', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-files" style={{ color: '#185FA5' }} />Documents needed
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scheme.documents.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, background: '#F0F4FA', color: '#5A7A9A', borderRadius: 20, padding: '3px 10px', fontWeight: 500 }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {scheme.apply_url && (
              <a
                href={scheme.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, height: 40, borderRadius: 10, border: 'none',
                  background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none',
                }}
              >
                <i className="ti ti-external-link" />Apply Now
              </a>
            )}
            {scheme.helpline && (
              <a
                href={`tel:${scheme.helpline}`}
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: '1.5px solid #DDE8F5', background: 'white',
                  color: '#185FA5', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none',
                }}
              >
                <i className="ti ti-phone" />
                {scheme.helpline_free ? 'Free Helpline' : 'Helpline'}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

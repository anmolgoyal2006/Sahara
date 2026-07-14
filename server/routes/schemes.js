/**
 * schemes.js — Government scheme eligibility engine
 *
 * SAFETY CONTRACT (must not be violated):
 *  1. evaluateEligibility() is a PURE deterministic function.
 *     It reads structured fields from schemes.json — Gemini is
 *     never called inside it and never influences the status.
 *  2. Status values: ELIGIBLE | LIKELY_ELIGIBLE | CHECK_REQUIRED | INELIGIBLE
 *  3. When verifiable_by_rules is false, the best we return is CHECK_REQUIRED.
 *  4. benefit.amount is always echoed verbatim from schemes.json — NEVER AI-paraphrased.
 *  5. Gemini is used ONLY to write a one-sentence human-friendly reason AFTER the
 *     status has been decided by code. It cannot change the status.
 */

const express = require('express')
const router  = express.Router()
const path    = require('path')
const fs      = require('fs')
const { fastModel } = require('../lib/gemini')

/* ─────────────────────────────────────
   Load schemes (static file)
   In test mode: re-read every call so tests
   can swap schemes.json freely.
───────────────────────────────────── */
const SCHEMES_PATH = path.join(__dirname, '../data/schemes.json')

function loadSchemes () {
  try {
    return JSON.parse(fs.readFileSync(SCHEMES_PATH, 'utf8'))
  } catch (err) {
    console.error('[schemes] Failed to load schemes.json:', err.message)
    return []
  }
}

let _cachedSchemes = null
function getSchemes () {
  if (process.env.NODE_ENV === 'test' || !_cachedSchemes) {
    _cachedSchemes = loadSchemes()
  }
  return _cachedSchemes
}

/* ─────────────────────────────────────
   Derive category metadata from schemes.
   Falls back to { label: id, icon: 'ti-list' }
   for any category not in the known map.
───────────────────────────────────── */
const KNOWN_CATEGORIES = {
  pension:     { label: 'Pension',          icon: 'ti-coin' },
  health:      { label: 'Health',           icon: 'ti-heart-rate-monitor' },
  insurance:   { label: 'Insurance',        icon: 'ti-shield-check' },
  savings:     { label: 'Savings',          icon: 'ti-piggy-bank' },
  agriculture: { label: 'Agriculture',      icon: 'ti-plant' },
  housing:     { label: 'Housing',          icon: 'ti-home' },
  welfare:     { label: 'Welfare',          icon: 'ti-hand-heart' },
  disability:  { label: 'Disability',       icon: 'ti-wheelchair' },
  education:   { label: 'Education',        icon: 'ti-school' },
  employment:  { label: 'Employment',       icon: 'ti-briefcase' },
  women:       { label: 'Women',            icon: 'ti-venus' },
  banking:     { label: 'Banking',          icon: 'ti-building-bank' },
}

/* ─────────────────────────────────────
   CORE: pure deterministic eligibility engine
   Profile shape:
   { age, gender, state, bpl,
     has_aadhaar, has_bank_account, monthly_income }
───────────────────────────────────── */
function evaluateEligibility (scheme, profile) {
  const e = scheme.eligibility

  // Age minimum
  if (e.min_age !== null && profile.age !== null && profile.age < e.min_age) {
    return { status: 'INELIGIBLE', reason: `Minimum age is ${e.min_age}; profile age is ${profile.age}.` }
  }
  // Age maximum
  if (e.max_age !== null && profile.age !== null && profile.age > e.max_age) {
    return { status: 'INELIGIBLE', reason: `Maximum age is ${e.max_age}; profile age is ${profile.age}.` }
  }
  // Gender
  if (e.gender !== 'all' && profile.gender !== null) {
    if (profile.gender === 'other') {
      return { status: 'CHECK_REQUIRED', reason: `Scheme is for ${e.gender} applicants; verify at the issuing office.` }
    }
    if (profile.gender !== e.gender) {
      return { status: 'INELIGIBLE', reason: `Scheme is restricted to ${e.gender} applicants.` }
    }
  }
  // State restriction
  if (!e.states.includes('all') && profile.state !== null) {
    const stateMatch = e.states.some(s => s.toLowerCase() === (profile.state || '').toLowerCase())
    if (!stateMatch) {
      return { status: 'INELIGIBLE', reason: `Scheme is available only in: ${e.states.join(', ')}.` }
    }
  }
  // BPL required but profile is explicitly non-BPL
  if (e.bpl_required && profile.bpl === false) {
    return { status: 'INELIGIBLE', reason: 'Scheme requires BPL (Below Poverty Line) status.' }
  }
  // Aadhaar required but profile explicitly lacks it
  if (e.aadhaar_required && profile.has_aadhaar === false) {
    return { status: 'INELIGIBLE', reason: 'Scheme requires an Aadhaar card.' }
  }
  // Bank account required but profile explicitly lacks one
  if (e.bank_account_required && profile.has_bank_account === false) {
    return { status: 'INELIGIBLE', reason: 'Scheme requires a bank account for DBT.' }
  }
  // Income limit exceeded
  if (e.income_limit !== null && profile.monthly_income !== null && profile.monthly_income > e.income_limit) {
    return {
      status: 'INELIGIBLE',
      reason: `Income limit is ₹${e.income_limit.toLocaleString('en-IN')}/month; profile income is ₹${profile.monthly_income.toLocaleString('en-IN')}/month.`,
    }
  }
  // Unverifiable conditions — cap at CHECK_REQUIRED
  if (!e.verifiable_by_rules) {
    return { status: 'CHECK_REQUIRED', reason: 'This scheme has conditions that require manual verification.' }
  }
  // Soft uncertainty — LIKELY_ELIGIBLE when required fields are null
  const uncertain = []
  if (e.min_age !== null && profile.age === null)         uncertain.push('age not provided')
  if (e.max_age !== null && profile.age === null)         uncertain.push('age not provided')
  if (e.gender  !== 'all' && profile.gender === null)     uncertain.push('gender not provided')
  if (e.bpl_required && profile.bpl === null)             uncertain.push('BPL status not confirmed')
  if (e.aadhaar_required && profile.has_aadhaar === null) uncertain.push('Aadhaar status not confirmed')
  if (e.bank_account_required && profile.has_bank_account === null) uncertain.push('bank account status not confirmed')

  if (uncertain.length > 0) {
    return {
      status: 'LIKELY_ELIGIBLE',
      reason: `Likely eligible, but unable to confirm: ${[...new Set(uncertain)].join('; ')}.`,
    }
  }
  return { status: 'ELIGIBLE', reason: 'Profile meets all structured eligibility criteria.' }
}

/* ─────────────────────────────────────
   Chunked Gemini reason generation
   Splits toExplain into batches of 20 so
   a single long list never hits token limits.
   A failure in one batch never blanks other batches.
───────────────────────────────────── */
function chunkArray (arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function generateReasonsBatched (toExplain, profile) {
  const reasons = {}
  if (toExplain.length === 0) return reasons

  const batches = chunkArray(toExplain, 20)

  for (const batch of batches) {
    const prompt = `You are writing short, warm, one-sentence reasons for an elderly Indian citizen about government schemes. The ELIGIBILITY STATUS for each scheme below has ALREADY BEEN DECIDED by a rules engine — your job is ONLY to explain that decision in one simple sentence. Do not change, question, or restate the status as anything other than what is given. Do not invent amounts or conditions not listed.

ELDER PROFILE: Age: ${profile.age ?? 'unknown'}, Gender: ${profile.gender ?? 'unknown'}, State: ${profile.state ?? 'unknown'}, BPL: ${profile.bpl ? 'Yes' : profile.bpl === false ? 'No' : 'unknown'}

SCHEMES (id → decided status — name):
${batch.map(r => `${r.id}: ${r.status} — ${r.name}`).join('\n')}

Return ONLY a valid JSON object mapping each scheme id to a one-sentence reason. If status is CHECK_REQUIRED, the reason should mention what still needs verifying without guessing the outcome.`

    try {
      const result  = await fastModel.generateContent(prompt)
      const raw     = result.response.text().trim()
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      Object.assign(reasons, JSON.parse(cleaned))
    } catch (err) {
      console.error('[schemes] Gemini reason batch failed:', err.message)
      // Fallback: use the code-generated reason for every scheme in this batch
      batch.forEach(r => {
        reasons[r.id] = r.status === 'ELIGIBLE'
          ? 'You meet the eligibility requirements based on the details you shared.'
          : r.status === 'LIKELY_ELIGIBLE'
          ? 'You appear to meet most requirements; confirm the remaining details to be sure.'
          : r.status === 'CHECK_REQUIRED'
          ? 'Some conditions for this scheme need to be verified at the official website or local office.'
          : 'You do not meet the eligibility requirements for this scheme based on your profile.'
      })
    }
  }
  return reasons
}

/* ─────────────────────────────────────
   GET /api/schemes/all
───────────────────────────────────── */
router.get('/all', (_req, res) => {
  try {
    const schemes = getSchemes()
    return res.json({
      success: true,
      count:   schemes.length,
      schemes: schemes.map(s => ({
        id:          s.id,
        name:        s.name,
        short_name:  s.short_name,
        category:    s.category,
        ministry:    s.ministry,
        description: s.description,
        benefit:     s.benefit,
        apply_url:   s.apply_url,
        helpline:    s.helpline,
        helpline_free: s.helpline_free,
        tags:        s.tags,
        last_verified: s.last_verified,
        source:      s.source,
        has_unverifiable_conditions: !s.eligibility.verifiable_by_rules,
      })),
    })
  } catch (err) {
    console.error('[schemes] /all error:', err)
    return res.status(500).json({ success: false, error: 'Could not load schemes.' })
  }
})

/* ─────────────────────────────────────
   GET /api/schemes/categories
   Dynamic — derived from actual schemes.json content.
   Never hardcodes a fixed category list.
───────────────────────────────────── */
router.get('/categories', (_req, res) => {
  try {
    const schemes = getSchemes()
    const counts  = {}
    schemes.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1 })

    const categories = Object.entries(counts).map(([id, count]) => ({
      id,
      label: KNOWN_CATEGORIES[id]?.label || id,
      icon:  KNOWN_CATEGORIES[id]?.icon  || 'ti-list',
      count,
    }))

    return res.json({ success: true, categories })
  } catch (err) {
    console.error('[schemes] /categories error:', err)
    return res.status(500).json({ success: false, error: 'Could not load categories.' })
  }
})

/* ─────────────────────────────────────
   GET /api/schemes/search?q=...&category=...&page=...&limit=...
   Server-side filter — avoids sending the full
   dataset to low-end phones.
───────────────────────────────────── */
router.get('/search', (req, res) => {
  try {
    const { q = '', category, page = '1', limit = '20' } = req.query
    const query   = q.toLowerCase().trim()
    const pageNum = Math.max(1, parseInt(page)  || 1)
    const perPage = Math.min(100, parseInt(limit) || 20) // cap at 100

    let results = getSchemes()

    if (category && category !== 'all') {
      results = results.filter(s => s.category === category)
    }
    if (query) {
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.short_name?.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags?.some(t => t.toLowerCase().includes(query))
      )
    }

    const total     = results.length
    const totalPages = Math.ceil(total / perPage)
    const start     = (pageNum - 1) * perPage
    const paged     = results.slice(start, start + perPage)

    return res.json({
      success: true,
      results: paged,
      total,
      page:    pageNum,
      totalPages,
    })
  } catch (err) {
    console.error('[schemes] /search error:', err)
    return res.status(500).json({ success: false, error: 'Search failed.' })
  }
})

/* ─────────────────────────────────────
   GET /api/schemes/:id
───────────────────────────────────── */
router.get('/:id', (req, res) => {
  try {
    const schemes = getSchemes()
    const scheme  = schemes.find(s => s.id === req.params.id)
    if (!scheme) return res.status(404).json({ success: false, error: 'Scheme not found.' })
    return res.json({ success: true, scheme })
  } catch (err) {
    console.error('[schemes] /:id error:', err)
    return res.status(500).json({ success: false, error: 'Could not load scheme.' })
  }
})

/* ─────────────────────────────────────
   POST /api/schemes/check-eligibility
   Body: { profile, scheme_ids?, explain? }
   explain: boolean — whether to call Gemini for
            human-friendly reasons (default true).
            Set false in tests to skip AI.
───────────────────────────────────── */
router.post('/check-eligibility', async (req, res) => {
  try {
    const { profile, scheme_ids, explain = true } = req.body

    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ success: false, error: 'profile is required.' })
    }

    const p = {
      age:              typeof profile.age              === 'number'  ? profile.age              : null,
      gender:           typeof profile.gender           === 'string'  ? profile.gender.toLowerCase() : null,
      state:            typeof profile.state            === 'string'  ? profile.state            : null,
      bpl:              typeof profile.bpl              === 'boolean' ? profile.bpl              : null,
      has_aadhaar:      typeof profile.has_aadhaar      === 'boolean' ? profile.has_aadhaar      : null,
      has_bank_account: typeof profile.has_bank_account === 'boolean' ? profile.has_bank_account : null,
      monthly_income:   typeof profile.monthly_income   === 'number'  ? profile.monthly_income   : null,
    }

    const schemes = getSchemes()
    const targets = scheme_ids && Array.isArray(scheme_ids) && scheme_ids.length > 0
      ? schemes.filter(s => scheme_ids.includes(s.id))
      : schemes

    // Step 1 — deterministic eligibility (pure function, no AI)
    const results = targets.map(scheme => {
      const { status, reason } = evaluateEligibility(scheme, p)
      return {
        id:                scheme.id,
        name:              scheme.name,
        short_name:        scheme.short_name,
        category:          scheme.category,
        ministry:          scheme.ministry,
        status,
        reason,                            // code-generated; may be overwritten by AI reason below
        estimated_benefit: scheme.benefit, // verbatim — NEVER AI-paraphrased
        apply_url:         scheme.apply_url,
        helpline:          scheme.helpline,
        helpline_free:     scheme.helpline_free,
        documents:         scheme.documents,
        conditions:        scheme.eligibility.conditions,
        last_verified:     scheme.last_verified,
        source:            scheme.source,
      }
    })

    // Step 2 — batched AI reason generation for non-INELIGIBLE results
    // INELIGIBLE reasons are factual ("Age 45 < min_age 60") — no need to prettify.
    if (explain) {
      const toExplain = results
        .filter(r => r.status !== 'INELIGIBLE')
        .map(r => ({ id: r.id, name: r.name, status: r.status }))

      const reasons = await generateReasonsBatched(toExplain, p)

      // Overlay AI reasons — statuses are UNTOUCHED
      results.forEach(r => {
        if (reasons[r.id]) r.ai_reason = reasons[r.id]
      })
    }

    // Group by status
    const grouped = {
      ELIGIBLE:        results.filter(r => r.status === 'ELIGIBLE'),
      LIKELY_ELIGIBLE: results.filter(r => r.status === 'LIKELY_ELIGIBLE'),
      CHECK_REQUIRED:  results.filter(r => r.status === 'CHECK_REQUIRED'),
      INELIGIBLE:      results.filter(r => r.status === 'INELIGIBLE'),
    }

    return res.json({
      success: true,
      profile: p,
      total:   results.length,
      summary: {
        eligible:        grouped.ELIGIBLE.length,
        likely_eligible: grouped.LIKELY_ELIGIBLE.length,
        check_required:  grouped.CHECK_REQUIRED.length,
        ineligible:      grouped.INELIGIBLE.length,
      },
      results: grouped,
    })
  } catch (err) {
    console.error('[schemes] /check-eligibility error:', err)
    return res.status(500).json({ success: false, error: 'Eligibility check failed.' })
  }
})

/* ─────────────────────────────────────
   Export evaluateEligibility for tests
───────────────────────────────────── */
router.evaluateEligibility = evaluateEligibility

module.exports = router

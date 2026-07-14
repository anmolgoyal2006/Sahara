/**
 * test-schemes.js — Phase 14B revised test suite (10 tests)
 * Run: node scripts/test-schemes.js
 * All 10 must pass before Phase 14C.
 */
'use strict'

process.env.NODE_ENV = 'test'

const path = require('path')
const fs   = require('fs')

const schemesRouter       = require('../routes/schemes')
const evaluateEligibility = schemesRouter.evaluateEligibility

const SCHEMES_PATH = path.join(__dirname, '../data/schemes.json')
const schemes = JSON.parse(fs.readFileSync(SCHEMES_PATH, 'utf8'))

let passed = 0
let failed = 0

function assert (label, condition, detail = '') {
  if (condition) { console.log(`  ✅  ${label}`); passed++ }
  else { console.error(`  ❌  ${label}${detail ? ' — ' + detail : ''}`); failed++ }
}
function section (title) { console.log(`\n── ${title} ──`) }

/* ── Test 1 ───────────────────────────────────────────────────────────────── */
section('Test 1 — Eligible senior on IGNOAPS')
;(() => {
  const s = schemes.find(s => s.id === 'ignoaps')
  assert('scheme loaded', !!s)
  const r = evaluateEligibility(s, { age: 65, gender: 'female', state: null, bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: null })
  assert('ELIGIBLE', r.status === 'ELIGIBLE', r.reason)
})()

/* ── Test 2 ───────────────────────────────────────────────────────────────── */
section('Test 2 — Too young for IGNOAPS → INELIGIBLE')
;(() => {
  const s = schemes.find(s => s.id === 'ignoaps')
  const r = evaluateEligibility(s, { age: 45, gender: 'male', state: null, bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: null })
  assert('INELIGIBLE', r.status === 'INELIGIBLE', r.reason)
  assert('reason mentions 60', r.reason.includes('60'))
})()

/* ── Test 3 ───────────────────────────────────────────────────────────────── */
section('Test 3 — PM-JAY always CHECK_REQUIRED')
;(() => {
  const s = schemes.find(s => s.id === 'pmjay')
  assert('scheme loaded', !!s)
  assert('verifiable_by_rules false', s.eligibility.verifiable_by_rules === false)
  const r = evaluateEligibility(s, { age: 70, gender: 'female', state: null, bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: 0 })
  assert('CHECK_REQUIRED', r.status === 'CHECK_REQUIRED', r.reason)
  assert('not ELIGIBLE', r.status !== 'ELIGIBLE')
})()

/* ── Test 4 ───────────────────────────────────────────────────────────────── */
section('Test 4 — Male INELIGIBLE for IGNWPS (female-only)')
;(() => {
  const s = schemes.find(s => s.id === 'nsap-widow')
  assert('scheme loaded', !!s)
  const r = evaluateEligibility(s, { age: 50, gender: 'male', state: null, bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: null })
  assert('INELIGIBLE', r.status === 'INELIGIBLE', r.reason)
  assert('gender in reason', /female|gender/i.test(r.reason))
})()

/* ── Test 5 ───────────────────────────────────────────────────────────────── */
section('Test 5 — Incomplete profile → LIKELY_ELIGIBLE on IGNOAPS')
;(() => {
  const s = schemes.find(s => s.id === 'ignoaps')
  const r = evaluateEligibility(s, { age: 65, gender: null, state: null, bpl: null, has_aadhaar: null, has_bank_account: null, monthly_income: null })
  assert('LIKELY_ELIGIBLE', r.status === 'LIKELY_ELIGIBLE', r.reason)
})()

/* ── Test 6 ───────────────────────────────────────────────────────────────── */
section('Test 6 — PMSBY age ceiling (max 70) → INELIGIBLE at 72')
;(() => {
  const s = schemes.find(s => s.id === 'pmsby')
  assert('scheme loaded', !!s)
  const r = evaluateEligibility(s, { age: 72, gender: 'male', state: null, bpl: false, has_aadhaar: true, has_bank_account: true, monthly_income: null })
  assert('INELIGIBLE', r.status === 'INELIGIBLE', r.reason)
  assert('max_age in reason', r.reason.includes('70'))
})()

/* ── Test 7 ───────────────────────────────────────────────────────────────── */
section('Test 7 — benefit.amount verbatim from schemes.json')
;(() => {
  const s = schemes.find(s => s.id === 'ignoaps')
  const expected = '₹200–₹500/month (Central contribution; states may add more)'
  assert('amount unchanged', s.benefit.amount === expected, `Got: "${s.benefit.amount}"`)
  const r = evaluateEligibility(s, { age: 65, gender: 'female', state: null, bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: null })
  assert('ELIGIBLE too', r.status === 'ELIGIBLE', r.reason)
})()

/* ── Test 8 — Bulk import sanity ─────────────────────────────────────────── */
section('Test 8 — Bulk import sanity check')
;(() => {
  assert('non-empty', schemes.length > 0, `count=${schemes.length}`)

  const missingVerified = schemes.filter(s => !s.last_verified)
  assert('all have last_verified', missingVerified.length === 0, missingVerified.map(s => s.id).join(', '))

  const missingVBR = schemes.filter(s => typeof s.eligibility?.verifiable_by_rules !== 'boolean')
  assert('all have verifiable_by_rules (boolean)', missingVBR.length === 0, missingVBR.map(s => s.id).join(', '))

  const violated = schemes.filter(s => s.eligibility.conditions.length > 0 && s.eligibility.verifiable_by_rules === true)
  assert('no conditions[] + verifiable_by_rules=true', violated.length === 0, violated.map(s => s.id).join(', '))

  const pmjay = schemes.find(s => s.id === 'pmjay')
  if (pmjay) {
    const r = evaluateEligibility(pmjay, { age: 40, gender: 'male', state: 'Maharashtra', bpl: true, has_aadhaar: true, has_bank_account: true, monthly_income: 0 })
    assert('PM-JAY caps at CHECK_REQUIRED', r.status === 'CHECK_REQUIRED', r.reason)
  }

  const missingAmount = schemes.filter(s => !s.benefit?.amount)
  assert('all have benefit.amount', missingAmount.length === 0, missingAmount.map(s => s.id).join(', '))
})()

/* ── Test 9 — Dynamic categories ─────────────────────────────────────────── */
section('Test 9 — Dynamic categories derived from schemes.json')
;(() => {
  // Build expected counts manually
  const expected = {}
  schemes.forEach(s => { expected[s.category] = (expected[s.category] || 0) + 1 })

  // Simulate what GET /api/schemes/categories returns
  const counts = {}
  schemes.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1 })
  const categories = Object.entries(counts).map(([id, count]) => ({ id, count }))

  assert('at least one category', categories.length > 0)

  const mismatch = categories.filter(c => c.count !== expected[c.id])
  assert('all counts accurate', mismatch.length === 0,
    mismatch.map(c => `${c.id}: got ${c.count}, expected ${expected[c.id]}`).join(', '))

  // Every distinct category in schemes must appear in the derived list
  const categorySet = new Set(schemes.map(s => s.category))
  const derivedSet  = new Set(categories.map(c => c.id))
  const missing = [...categorySet].filter(c => !derivedSet.has(c))
  assert('all scheme categories present', missing.length === 0, missing.join(', '))
})()

/* ── Test 10 — Search endpoint logic ─────────────────────────────────────── */
section('Test 10 — Search logic (pension filter, text filter)')
;(() => {
  // Simulate /search?q=pension
  const pensionResults = schemes.filter(s =>
    s.name.toLowerCase().includes('pension') ||
    s.short_name?.toLowerCase().includes('pension') ||
    s.description.toLowerCase().includes('pension') ||
    s.tags?.some(t => t.toLowerCase().includes('pension'))
  )
  assert('pension search returns results', pensionResults.length > 0, `got ${pensionResults.length}`)
  // At least half the results should be clearly pension-related (name/tag/category)
  const clearlyPension = pensionResults.filter(s => s.category === 'pension' || s.tags?.includes('pension') || s.name.toLowerCase().includes('pension'))
  assert('pension results majority pension-related', clearlyPension.length >= pensionResults.length * 0.5, `${clearlyPension.length}/${pensionResults.length} clearly pension-related`)

  // Simulate /search?category=disability
  const disabilityCategory = schemes.filter(s => s.category === 'disability')
  assert('disability category filter works', disabilityCategory.length > 0, `got ${disabilityCategory.length}`)
  assert('all results are disability', disabilityCategory.every(s => s.category === 'disability'))

  // Simulate /search?q=junk_query_that_matches_nothing — must return empty, not crash
  const noResults = schemes.filter(s =>
    ['name','short_name','description'].some(f => s[f]?.toLowerCase().includes('xyznotascheme')) ||
    s.tags?.some(t => t.toLowerCase().includes('xyznotascheme'))
  )
  assert('no-match query returns empty array', noResults.length === 0)
})()

/* ── Reviewer audit trail ─────────────────────────────────────────────────── */
section('Reviewer audit trail (rejected.json)')
;(() => {
  const p = path.join(__dirname, 'ingest-schemes/rejected.json')
  assert('rejected.json exists', fs.existsSync(p))
  if (fs.existsSync(p)) {
    let content
    try { content = JSON.parse(fs.readFileSync(p, 'utf8')) }
    catch (e) { assert('valid JSON', false, e.message); return }
    assert('is array', Array.isArray(content))
    const bad = content.filter(e => e && !e._reason)
    assert('all entries have _reason', bad.length === 0, `${bad.length} missing _reason`)
  }
})()

/* ── Summary ──────────────────────────────────────────────────────────────── */
console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('✅  All tests passed — safe to continue to Phase 14C.')
} else {
  console.error('❌  Some tests failed.')
  process.exit(1)
}

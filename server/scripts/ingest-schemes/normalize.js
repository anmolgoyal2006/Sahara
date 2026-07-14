/**
 * normalize.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OFFLINE / ONE-TIME script. Run manually after fetch-dataset.js.
 * NEVER imported by the server.
 *
 * Reads raw_myscheme.json, sends each record to Gemini with a strict extraction
 * prompt, and writes draft structured entries to review-queue.json.
 *
 * CRITICAL SAFETY NOTE:
 *   This script produces DRAFTS for human review ONLY.
 *   Nothing it writes ever goes directly into schemes.json.
 *   The human review step (README.md) is mandatory before publishing.
 *
 * Usage:
 *   GEMINI_API_KEY=<your-key> node normalize.js
 *   # Or with .env:
 *   # node -r dotenv/config normalize.js dotenv_config_path=../../.env
 *
 * Flags:
 *   --limit=N      Only process the first N records (default: all)
 *   --resume       Skip records already in review-queue.json (safe to re-run)
 *   --delay=Ms     Delay between Gemini calls in ms (default: 800) to respect
 *                  rate limits on the free tier
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const fs   = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// ── Paths ────────────────────────────────────────────────────────────────────
const RAW_FILE   = path.join(__dirname, 'raw_myscheme.json')
const QUEUE_FILE = path.join(__dirname, 'review-queue.json')

// ── CLI flags ────────────────────────────────────────────────────────────────
const args   = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=')
      return [k, v === undefined ? true : v]
    })
)
const LIMIT  = args.limit  ? parseInt(args.limit)  : Infinity
const RESUME = Boolean(args.resume)
const DELAY  = args.delay  ? parseInt(args.delay)  : 800

// ── Gemini setup (temperature 0 — we want deterministic extraction) ──────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const extractionModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  generationConfig: {
    temperature:     0,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  },
})

// ── Target JSON schema (must match schemes.json eligibility shape) ───────────
/**
 * @typedef {Object} ExtractedEligibility
 * @property {number|null} min_age
 * @property {number|null} max_age
 * @property {number|null} income_limit   — monthly ₹ if stated; null otherwise
 * @property {boolean}     bpl_required
 * @property {boolean}     aadhaar_required
 * @property {boolean}     bank_account_required
 * @property {'all'|'male'|'female'} gender
 * @property {string[]}    states         — ['all'] or list of Indian state names
 * @property {string[]}    conditions     — unmappable free-text conditions
 * @property {boolean}     verifiable_by_rules
 * @property {'high'|'medium'|'low'} confidence
 * @property {string}      [notes]        — model's explanation if confidence < high
 */

const EXTRACTION_PROMPT_TEMPLATE = (name, description, eligibility_text, benefits_text) => `\
You are extracting STRUCTURED eligibility fields from a free-text description of an Indian government scheme, for a rules engine that will later decide eligibility — you are NOT deciding eligibility yourself, only structuring the stated rules.

Given this raw scheme text:
---
NAME: ${name}
DESCRIPTION: ${description}
ELIGIBILITY (free text): ${eligibility_text}
BENEFITS: ${benefits_text}
---

Return ONLY a JSON object with these fields (no markdown, no explanation, just the JSON):
{
  "min_age": <number or null>,
  "max_age": <number or null>,
  "income_limit": <number or null — monthly rupees; if stated annually divide by 12; if not stated use null>,
  "bpl_required": <boolean>,
  "aadhaar_required": <boolean>,
  "bank_account_required": <boolean>,
  "gender": <"all" | "male" | "female">,
  "states": <["all"] or array of full Indian state names>,
  "conditions": <array of short plain-text conditions that do NOT map cleanly to the fields above — e.g. "must be listed in SECC 2011 database", "must reside in a CGHS-covered city">,
  "verifiable_by_rules": <boolean — set false if conditions[] is non-empty OR if ANY requirement can't be confirmed purely from age/gender/state/BPL/documents/income>,
  "confidence": <"high" | "medium" | "low" — your own confidence that this extraction is complete and correct>,
  "notes": <string or null — required if confidence is not "high"; explain what is uncertain or unmappable>
}

Rules:
- Do NOT guess missing numbers. If income_limit or an age is not explicitly stated, use null.
- Do NOT invent conditions. Only list conditions that are explicitly present in the text.
- If you are unsure about ANY field, set confidence to "low" and explain in "notes".
- "verifiable_by_rules" must be false whenever conditions[] is non-empty.`

// ── Helper: sleep ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ── Helper: safe JSON parse from model response ───────────────────────────────
function parseModelJson (text, schemeId) {
  // Strip markdown code fences if the model added them despite instructions
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.warn(`[normalize]   ⚠  JSON parse failed for ${schemeId}:`, e.message)
    return null
  }
}

// ── Helper: validate extracted eligibility shape ──────────────────────────────
function validateExtracted (extracted, schemeId) {
  const issues = []

  if (typeof extracted.min_age !== 'number' && extracted.min_age !== null)
    issues.push('min_age must be number|null')
  if (typeof extracted.max_age !== 'number' && extracted.max_age !== null)
    issues.push('max_age must be number|null')
  if (typeof extracted.income_limit !== 'number' && extracted.income_limit !== null)
    issues.push('income_limit must be number|null')
  if (typeof extracted.bpl_required !== 'boolean')
    issues.push('bpl_required must be boolean')
  if (typeof extracted.aadhaar_required !== 'boolean')
    issues.push('aadhaar_required must be boolean')
  if (typeof extracted.bank_account_required !== 'boolean')
    issues.push('bank_account_required must be boolean')
  if (!['all', 'male', 'female'].includes(extracted.gender))
    issues.push('gender must be "all"|"male"|"female"')
  if (!Array.isArray(extracted.states))
    issues.push('states must be array')
  if (!Array.isArray(extracted.conditions))
    issues.push('conditions must be array')
  if (typeof extracted.verifiable_by_rules !== 'boolean')
    issues.push('verifiable_by_rules must be boolean')

  // Enforce safety: non-empty conditions must always have verifiable_by_rules=false
  if (Array.isArray(extracted.conditions) && extracted.conditions.length > 0
      && extracted.verifiable_by_rules === true) {
    issues.push('verifiable_by_rules must be false when conditions[] is non-empty — forcing false')
    extracted.verifiable_by_rules = false
  }

  if (issues.length > 0) {
    console.warn(`[normalize]   ⚠  Validation issues for ${schemeId}:`, issues)
  }

  return issues
}

// ── Helper: build a slug-style id from name ───────────────────────────────────
function makeId (name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main () {
  // Guard: raw file must exist
  if (!fs.existsSync(RAW_FILE)) {
    console.error(`[normalize] ✗  raw_myscheme.json not found at ${RAW_FILE}`)
    console.error('            Run fetch-dataset.js first.')
    process.exit(1)
  }

  // Guard: Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('[normalize] ✗  GEMINI_API_KEY not set.')
    process.exit(1)
  }

  // Load raw records
  const rawRecords = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'))
  console.log(`[normalize] Loaded ${rawRecords.length} raw records.`)

  // Load existing queue (for --resume)
  let queue = []
  if (RESUME && fs.existsSync(QUEUE_FILE)) {
    queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'))
    console.log(`[normalize] Resuming — ${queue.length} entries already in queue.`)
  }
  const existingIds = new Set(queue.map(q => q._raw_id))

  // Determine which records to process
  const toProcess = rawRecords
    .filter(r => !RESUME || !existingIds.has(r.scheme_id || r.id || r.name))
    .slice(0, LIMIT)

  console.log(`[normalize] Processing ${toProcess.length} records (limit=${LIMIT === Infinity ? 'none' : LIMIT}, delay=${DELAY}ms) …\n`)

  let processed = 0
  let failed    = 0

  for (const raw of toProcess) {
    // Field name normalisation — HF dataset uses various casings
    const name            = raw.scheme_name   || raw.name              || '(unknown)'
    const description     = raw.description   || raw.scheme_description || ''
    const eligibility_text = raw.eligibility  || raw.eligibility_criteria || ''
    const benefits_text   = raw.benefits      || raw.benefit            || ''
    const apply_url       = raw.apply_link    || raw.application_link   || raw.url || null
    const ministry        = raw.nodal_ministry_department || raw.ministry || null
    const rawId           = raw.scheme_id     || raw.id                 || name

    console.log(`[normalize] [${processed + 1}/${toProcess.length}] ${name.slice(0, 60)} …`)

    // Call Gemini
    let extracted = null
    let callError = null
    try {
      const prompt = EXTRACTION_PROMPT_TEMPLATE(name, description, eligibility_text, benefits_text)
      const result = await extractionModel.generateContent(prompt)
      const text   = result.response.text().trim()
      extracted    = parseModelJson(text, rawId)
    } catch (err) {
      callError = err.message
      console.warn(`[normalize]   ✗  Gemini call failed: ${err.message}`)
    }

    if (!extracted) {
      // Write a stub with error flag so the human reviewer knows it failed
      queue.push({
        _raw_id:          rawId,
        _status:          'EXTRACTION_FAILED',
        _error:           callError || 'JSON parse failed',
        _review_required: true,
        id:               makeId(name),
        name,
        short_name:       null,
        category:         null,
        ministry,
        description,
        benefit: {
          type:     null,
          amount:   benefits_text.slice(0, 200) || null,
          duration: null,
        },
        eligibility: {
          min_age: null, max_age: null, income_limit: null,
          bpl_required: false, aadhaar_required: false,
          bank_account_required: false, gender: 'all',
          states: ['all'], conditions: [eligibility_text.slice(0, 500)],
          verifiable_by_rules: false,
          confidence: 'low',
          notes: 'Extraction failed — full eligibility text preserved in conditions[0] for manual review.',
        },
        documents: [],
        how_to_apply: [],
        apply_url,
        helpline: null,
        helpline_free: null,
        tags: [],
        last_verified: null,
        source: `gov_myscheme (HF) — DRAFT, human review required`,
      })
      failed++
    } else {
      // Validate and enforce safety invariants
      validateExtracted(extracted, rawId)

      queue.push({
        _raw_id:          rawId,
        _status:          'PENDING_REVIEW',
        _review_required: true,
        // — these fields must all be filled / corrected by human reviewer ——
        id:               makeId(name),
        name,
        short_name:       null,         // human fills this
        category:         null,         // human fills this
        ministry,
        description,
        benefit: {
          type:     null,               // human fills: 'cash' | 'insurance' | 'in-kind' | 'pension' | 'interest'
          amount:   benefits_text.slice(0, 300) || null,  // human corrects this from official source
          duration: null,               // human fills this
        },
        eligibility: {
          min_age:               extracted.min_age,
          max_age:               extracted.max_age,
          income_limit:          extracted.income_limit,
          bpl_required:          extracted.bpl_required,
          aadhaar_required:      extracted.aadhaar_required,
          bank_account_required: extracted.bank_account_required,
          gender:                extracted.gender,
          states:                extracted.states,
          conditions:            extracted.conditions,
          verifiable_by_rules:   extracted.verifiable_by_rules,
          _confidence:           extracted.confidence,  // stripped before merging into schemes.json
          _notes:                extracted.notes || null,
        },
        documents: [],    // human fills from official source
        how_to_apply: [], // human fills from official source
        apply_url,
        helpline: null,   // human fills — never invent
        helpline_free: null,
        tags: [],
        last_verified: null,  // human sets to today's date after verification
        source: `gov_myscheme (HF) + manual verification`,
      })
      processed++
    }

    // Checkpoint: save queue to disk after every record so progress isn't lost
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8')

    // Rate limit
    if (DELAY > 0) await sleep(DELAY)
  }

  console.log(`\n[normalize] ✓  Done.`)
  console.log(`           Processed: ${processed}  |  Failed: ${failed}`)
  console.log(`           Queue file: ${QUEUE_FILE}`)
  console.log(`\n           Next step: open review-queue.json and follow README.md`)
}

main().catch(err => {
  console.error('[normalize] Fatal error:', err)
  process.exit(1)
})

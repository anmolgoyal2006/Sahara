# Scheme Ingestion — Human Review Guide

This directory contains the **offline, one-time** pipeline for importing
government schemes from the
[`shrijayan/gov_myscheme`](https://huggingface.co/datasets/shrijayan/gov_myscheme)
Hugging Face dataset into `server/data/schemes.json`.

**Nothing in this directory runs at request time.**  
The server (`server/routes/schemes.js`) only reads the final `schemes.json`.

---

## Pipeline Overview

```
HF Dataset  →  fetch-dataset.js  →  raw_myscheme.json  (gitignored scratch file)
                                         ↓
                                   normalize.js  →  review-queue.json  (draft, never published directly)
                                                          ↓
                                              [YOU ARE HERE — human review]
                                                          ↓
                                   approved entries  →  server/data/schemes.json
                                   rejected entries  →  rejected.json  (audit trail)
```

---

## Step 1 — Fetch the dataset

```bash
node fetch-dataset.js
```

Writes `raw_myscheme.json` (gitignored). If the Node download fails, use the
Python fallback printed in the script header.

---

## Step 2 — Normalise (AI-assisted draft)

```bash
# Full run (slow — ~800 ms per record to respect Gemini rate limits)
GEMINI_API_KEY=<your-key> node normalize.js

# Limit to first 50 records for a quick test
GEMINI_API_KEY=<your-key> node normalize.js --limit=50

# Resume a previous run without re-processing already-queued records
GEMINI_API_KEY=<your-key> node normalize.js --resume
```

Writes `review-queue.json`. **Each entry is tagged `_status: "PENDING_REVIEW"`
and is only a draft — it has never touched `schemes.json`.**

---

## Step 3 — Human Review (MANDATORY, blocking)

Open `review-queue.json`. For every entry with `_status: "PENDING_REVIEW"`,
work through this checklist **before moving any entry to `schemes.json`**:

### Checklist

- [ ] **Verify the official source.**  
  Open `apply_url`. Confirm it points to a real, currently-live government page
  (not a dead myscheme.gov.in redirect or a 404). If the link is stale, find
  the current URL on myscheme.gov.in or the ministry website and update it.

- [ ] **Confirm `benefit.amount`.**  
  Match it exactly against the official page — not the HF dataset text, which
  may be stale. This field is **never AI-paraphrased once in `schemes.json`**, so
  get it right here. Fill `benefit.type` and `benefit.duration` too.

- [ ] **Confirm numeric eligibility fields.**  
  Check `min_age`, `max_age`, `income_limit` against the official source.
  If any number is wrong or missing, correct it now.

- [ ] **Check `bpl_required`, `aadhaar_required`, `bank_account_required`.**  
  These are the most frequently mis-extracted. Verify each one explicitly.

- [ ] **Review `conditions[]`.**  
  Any condition the model couldn't map to a structured field ends up here
  (e.g. "must be listed in SECC 2011 database"). Read each one. If you can
  translate it into a structured field, do so and remove it from `conditions`.
  If you can't, leave it and make sure `verifiable_by_rules` is `false`.

- [ ] **If `_confidence` is `"low"` or `conditions[]` is non-empty:**  
  Double-check that `verifiable_by_rules` is `false`. The normalize script
  enforces this automatically, but verify it held.

- [ ] **Fill `helpline`.**  
  Many scraped records have no helpline. Check the ministry website. If you
  can't find one, set `helpline: null` — **do not invent a number**.
  Set `helpline_free: true` only if you've confirmed it's a toll-free number.

- [ ] **Fill `documents[]` and `how_to_apply[]`** from the official page.  
  The model leaves these empty — they must be hand-filled.

- [ ] **Fill `short_name`, `category`, `ministry`, `tags[]`.**  
  These are editorial fields the model leaves null.

- [ ] **Set `last_verified` to today's date (YYYY-MM-DD).**  
  This is the date *you* verified it, not when the HF dataset was scraped.

- [ ] **Strip internal draft fields** before moving to `schemes.json`:  
  Remove `_raw_id`, `_status`, `_review_required`, `eligibility._confidence`,
  `eligibility._notes` — these are review metadata, not part of the schema.

### After the checklist passes

Move the cleaned entry **by appending it** to `server/data/schemes.json`.
Don't overwrite — append to the array.

### If the entry fails review

Move it to `rejected.json` instead, with a one-line reason:

```json
{
  "_raw_id": "...",
  "_rejected_on": "YYYY-MM-DD",
  "_reason": "Official link is dead; scheme discontinued as of 2023 per ministry notice."
}
```

**Do not delete rejected entries.** The next quarterly re-check uses this file
to avoid reviewing the same scheme twice.

---

## Step 4 — Re-run Phase 14B tests

After merging approved entries into `schemes.json`, re-run all 9 tests:

```bash
# From server root
node scripts/test-schemes.js
```

Tests 1–7 are the original Phase 14B suite.  
Tests 8–9 are the bulk import sanity checks (see Phase 14A spec).

All 9 must pass before continuing to Phase 14C.

---

## File Reference

| File | Committed? | Purpose |
|------|-----------|---------|
| `fetch-dataset.js` | ✅ | Downloads HF dataset |
| `normalize.js` | ✅ | AI-assisted draft extraction |
| `README.md` | ✅ | This guide |
| `raw_myscheme.json` | ❌ gitignored | Scratch download |
| `review-queue.json` | ❌ gitignored | AI drafts awaiting human review |
| `rejected.json` | ✅ | Audit trail of schemes that failed review |

---

## Safety Guarantees

| Guarantee | How it's maintained |
|-----------|-------------------|
| AI never decides eligibility status | `evaluateEligibility()` is pure, deterministic, reads only structured fields |
| AI never publishes a scheme | Human must check every box above before any entry reaches `schemes.json` |
| `benefit.amount` never AI-paraphrased | Human verifies against official source at review time; field frozen after that |
| `verifiable_by_rules: false` when uncertain | normalize.js forces this whenever `conditions[]` is non-empty; human double-checks |
| Stale/dead schemes don't accumulate silently | `rejected.json` audit trail; `last_verified` date on every approved entry |

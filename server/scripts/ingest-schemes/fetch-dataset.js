/**
 * fetch-dataset.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OFFLINE / ONE-TIME script. Run manually. NEVER imported by the server.
 *
 * Downloads the `shrijayan/gov_myscheme` dataset from Hugging Face Hub and
 * writes it to raw_myscheme.json in this directory as a scratch file.
 * raw_myscheme.json is .gitignored — don't commit it.
 *
 * Usage (Node, option A — via HF Hub HTTP API, no Python needed):
 *   node fetch-dataset.js
 *
 * Usage (Python, option B — slower first run but caches locally):
 *   pip install datasets
 *   python -c "
 *     from datasets import load_dataset
 *     ds = load_dataset('shrijayan/gov_myscheme')
 *     ds['train'].to_json('raw_myscheme.json')
 *   "
 *
 * This script implements option A.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

const https = require('https')
const fs    = require('fs')
const path  = require('path')

// Hugging Face dataset viewer API — returns up to 100 rows per page.
// For the full dataset use the Parquet download URL below.
const PARQUET_URL =
  'https://huggingface.co/datasets/shrijayan/gov_myscheme/resolve/main/data/train-00000-of-00001.parquet'
const RAW_JSONL_URL =
  'https://huggingface.co/datasets/shrijayan/gov_myscheme/resolve/main/data/train.jsonl'

const OUT_FILE = path.join(__dirname, 'raw_myscheme.json')

// ── Attempt JSONL first (smaller, easier to parse) ──────────────────────────
function downloadUrl (url) {
  return new Promise((resolve, reject) => {
    const chunks = []
    https.get(url, { headers: { 'User-Agent': 'Sahara-ingest/1.0' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        return downloadUrl(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function fetchAsJsonl () {
  console.log('[fetch] Trying JSONL download from HF Hub …')
  const buf = await downloadUrl(RAW_JSONL_URL)
  const lines = buf.toString('utf8').split('\n').filter(Boolean)
  const records = lines.map(l => JSON.parse(l))
  fs.writeFileSync(OUT_FILE, JSON.stringify(records, null, 2), 'utf8')
  console.log(`[fetch] ✓  Wrote ${records.length} records to ${OUT_FILE}`)
}

// ── HF Dataset Viewer API fallback (paginated, no Parquet parser needed) ───
const VIEWER_API =
  'https://datasets-server.huggingface.co/rows?dataset=shrijayan%2Fgov_myscheme&config=default&split=train'

async function fetchViaViewerApi () {
  console.log('[fetch] Falling back to HF Dataset Viewer API (paginated) …')
  const allRows = []
  let offset = 0
  const length = 100

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${VIEWER_API}&offset=${offset}&length=${length}`
    console.log(`[fetch]   page offset=${offset} …`)
    const buf  = await downloadUrl(url)
    const json = JSON.parse(buf.toString('utf8'))

    const rows = (json.rows || []).map(r => r.row)
    allRows.push(...rows)

    const total = json.num_rows_total ?? json.total ?? rows.length
    if (allRows.length >= total || rows.length === 0) break
    offset += length
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allRows, null, 2), 'utf8')
  console.log(`[fetch] ✓  Wrote ${allRows.length} records to ${OUT_FILE}`)
}

;(async () => {
  try {
    await fetchAsJsonl()
  } catch (err) {
    console.warn('[fetch] JSONL download failed:', err.message)
    try {
      await fetchViaViewerApi()
    } catch (err2) {
      console.error('[fetch] ✗  Both download methods failed.')
      console.error('       JSONL error:', err.message)
      console.error('       API error  :', err2.message)
      console.error('')
      console.error('Manual fallback — run the Python command from the file header.')
      process.exit(1)
    }
  }
})()

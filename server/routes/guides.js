const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { model } = require('../lib/gemini')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function sortSteps(guide) {
  if (guide.guide_steps) {
    guide.guide_steps = [...guide.guide_steps].sort((a, b) => a.step_number - b.step_number)
  }
  return guide
}

/* ─────────────────────────────────────────────────────────────
   STATIC GET routes — must be before /:slug
───────────────────────────────────────────────────────────── */

// GET /api/guides/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase.from('guides').select('category')
    if (error) throw error
    const counts = {}
    for (const row of data) counts[row.category] = (counts[row.category] || 0) + 1
    return res.json({ success: true, categories: Object.entries(counts).map(([name, count]) => ({ name, count })) })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/guides/popular
router.get('/popular', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('guides')
      .select('id, slug, title, category, difficulty, estimated_minutes, is_popular, tags, source')
      .eq('is_popular', true)
      .order('title', { ascending: true })
    if (error) throw error
    return res.json({ success: true, guides: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/guides/search?q=...
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ success: true, guides: [], found: false, query: q })
  try {
    const { data: titleMatches, error: e1 } = await supabase
      .from('guides')
      .select('id, slug, title, category, difficulty, estimated_minutes, is_popular, tags, source')
      .ilike('title', `%${q}%`)
    if (e1) throw e1

    const titleMatchIds = new Set((titleMatches || []).map(g => g.id))
    const { data: tagMatches, error: e2 } = await supabase
      .from('guides')
      .select('id, slug, title, category, difficulty, estimated_minutes, is_popular, tags, source')
      .contains('tags', [q.toLowerCase()])
    if (e2) throw e2

    const combined = [
      ...(titleMatches || []),
      ...(tagMatches || []).filter(g => !titleMatchIds.has(g.id)),
    ]
    if (!combined.length) return res.json({ success: true, guides: [], found: false, query: q })
    return res.json({ success: true, guides: combined, found: true, query: q })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/guides/progress/:elderId
router.get('/progress/:elderId', async (req, res) => {
  const { elderId } = req.params
  try {
    const { data, error } = await supabase
      .from('guide_progress')
      .select('*')
      .eq('elder_id', elderId)
      .eq('status', 'in_progress')
      .order('last_active_at', { ascending: false })
    if (error) throw error
    return res.json({ success: true, progress: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/guides/bookmarks/:elderId
router.get('/bookmarks/:elderId', async (req, res) => {
  const { elderId } = req.params
  try {
    const { data, error } = await supabase
      .from('guide_bookmarks')
      .select('*')
      .eq('elder_id', elderId)
      .order('bookmarked_at', { ascending: false })
    if (error) throw error
    return res.json({ success: true, bookmarks: data || [] })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────────────────────────────
   STATIC POST / DELETE routes — must be before /:slug/* routes
───────────────────────────────────────────────────────────── */

// POST /api/guides/bookmark
router.post('/bookmark', async (req, res) => {
  const { elder_id, guide_slug } = req.body
  if (!elder_id || !guide_slug)
    return res.status(400).json({ success: false, error: 'elder_id and guide_slug required' })
  try {
    const { data, error } = await supabase
      .from('guide_bookmarks')
      .upsert({ elder_id, guide_slug }, { onConflict: 'elder_id,guide_slug' })
      .select()
      .single()
    if (error) throw error
    return res.json({ success: true, bookmark: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// DELETE /api/guides/bookmark
router.delete('/bookmark', async (req, res) => {
  const { elder_id, guide_slug } = req.body
  if (!elder_id || !guide_slug)
    return res.status(400).json({ success: false, error: 'elder_id and guide_slug required' })
  try {
    const { error } = await supabase
      .from('guide_bookmarks')
      .delete()
      .eq('elder_id', elder_id)
      .eq('guide_slug', guide_slug)
    if (error) throw error
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────────────────────────────
   Phase 15D — AI GUIDE GENERATION (static POST, before /:slug/*)
───────────────────────────────────────────────────────────── */
function validateGeneratedGuide(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'Response is not an object'
  if (!parsed.title || typeof parsed.title !== 'string') return 'Missing title'
  if (!parsed.category) return 'Missing category'
  if (!Array.isArray(parsed.steps) || parsed.steps.length < 3)
    return 'steps must be an array with at least 3 items'
  const validCategories = ['government','health','banking','communication','entertainment',
    'shopping','payments','social_media','education','travel']
  if (!validCategories.includes(parsed.category)) parsed.category = 'education'
  for (let i = 0; i < parsed.steps.length; i++) {
    const s = parsed.steps[i]
    if (!s.instruction?.en)            return `Step ${i + 1} missing instruction.en`
    if (!s.simplified_instruction?.en) return `Step ${i + 1} missing simplified_instruction.en`
    if (!s.alt_wording?.en)            return `Step ${i + 1} missing alt_wording.en`
    if (s.step_number !== i + 1)       return `Step numbering not sequential at position ${i + 1}`
  }
  return null
}

// POST /api/guides/generate
router.post('/generate', async (req, res) => {
  const { query } = req.body
  if (!query?.trim())
    return res.status(400).json({ success: false, error: 'query is required' })

  const q = query.trim()

  // 1. Return cached guide if one already matches
  const candidateSlug = slugify(q)
  const { data: existing } = await supabase
    .from('guides')
    .select('*, guide_steps(*)')
    .or(`slug.eq.${candidateSlug},title.ilike.%${q}%`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return res.json({
      success: true,
      guide: sortSteps(existing),
      cached: true,
      ai_generated: existing.source === 'ai_generated',
    })
  }

  // 2. Generate with Gemini
  const prompt = `You are a digital literacy tutor helping elderly people in India learn to use smartphones and apps.

Generate a step-by-step guide for: "${q}"

STRICT RULES:
1. Every step must contain ONE action only
2. Name the EXACT button/label text as it appears in the current app/website
3. State the button's screen location in plain terms (e.g. "top-right corner", "bottom of screen")
4. Zero jargon — write for someone who has never used a smartphone
5. 5 to 12 steps typical

Output ONLY valid JSON, no markdown fences, no extra text:
{
  "title": "Short clear title",
  "category": "one of: government,health,banking,communication,entertainment,shopping,payments,social_media,education,travel",
  "difficulty": "easy OR medium OR hard",
  "estimated_minutes": 5,
  "steps": [
    {
      "step_number": 1,
      "instruction": { "en": "Exact instruction." },
      "simplified_instruction": { "en": "Simpler version." },
      "alt_wording": { "en": "Third way to say it." },
      "ui_element_location": "e.g. top-right corner",
      "voice_text": { "en": "Spoken version for TTS." },
      "estimated_seconds": 20
    }
  ]
}`

  let raw
  try {
    const result = await model.generateContent(prompt)
    raw = result.response.text().trim()
  } catch (e) {
    return res.status(502).json({ success: false, error: 'AI generation failed: ' + e.message })
  }

  // 3. Parse — strip accidental markdown fences
  let parsed
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return res.status(422).json({
      success: false,
      error: 'AI returned malformed JSON — not saved',
      raw: raw.slice(0, 500),
    })
  }

  // 4. Validate before saving
  const validErr = validateGeneratedGuide(parsed)
  if (validErr) {
    return res.status(422).json({
      success: false,
      error: `Guide validation failed: ${validErr} — not saved`,
    })
  }

  // 5. Save to Supabase
  const slug = slugify(parsed.title) || candidateSlug
  try {
    const { data: guideRow, error: guideErr } = await supabase
      .from('guides')
      .insert({
        slug,
        title: parsed.title,
        category: parsed.category,
        difficulty: parsed.difficulty || 'medium',
        estimated_minutes: parsed.estimated_minutes || 5,
        is_popular: false,
        source: 'ai_generated',
        last_verified: null,
      })
      .select('id, slug')
      .single()
    if (guideErr) throw guideErr

    const stepsToInsert = parsed.steps.map(s => ({
      guide_id: guideRow.id,
      step_number: s.step_number,
      instruction: s.instruction,
      simplified_instruction: s.simplified_instruction,
      alt_wording: s.alt_wording,
      ui_element_location: s.ui_element_location || null,
      voice_text: s.voice_text || s.instruction,
      estimated_seconds: s.estimated_seconds || 20,
    }))
    const { error: stepsErr } = await supabase.from('guide_steps').insert(stepsToInsert)
    if (stepsErr) throw stepsErr

    const { data: fullGuide, error: fetchErr } = await supabase
      .from('guides')
      .select('*, guide_steps(*)')
      .eq('id', guideRow.id)
      .single()
    if (fetchErr) throw fetchErr

    return res.status(201).json({
      success: true,
      guide: sortSteps(fullGuide),
      cached: false,
      ai_generated: true,
    })
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to save generated guide: ' + e.message })
  }
})

/* ─────────────────────────────────────────────────────────────
   PARAMETERISED GET route
───────────────────────────────────────────────────────────── */

// GET /api/guides/:slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params
  try {
    const { data, error } = await supabase
      .from('guides')
      .select('*, guide_steps(*)')
      .eq('slug', slug)
      .single()
    if (error || !data)
      return res.status(404).json({ success: false, error: 'Guide not found' })
    return res.json({ success: true, guide: sortSteps(data) })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

/* ─────────────────────────────────────────────────────────────
   PARAMETERISED POST routes — progress, complete, struggle
───────────────────────────────────────────────────────────── */

// POST /api/guides/:slug/progress
router.post('/:slug/progress', async (req, res) => {
  const { slug } = req.params
  const { elder_id, current_step, language } = req.body
  if (!elder_id)
    return res.status(400).json({ success: false, error: 'elder_id required' })
  try {
    const { data, error } = await supabase
      .from('guide_progress')
      .upsert(
        { elder_id, guide_slug: slug, current_step: current_step || 1,
          language: language || 'en', last_active_at: new Date().toISOString() },
        { onConflict: 'elder_id,guide_slug' }
      )
      .select()
      .single()
    if (error) throw error
    return res.json({ success: true, progress: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// POST /api/guides/:slug/complete
router.post('/:slug/complete', async (req, res) => {
  const { slug } = req.params
  const { elder_id } = req.body
  if (!elder_id)
    return res.status(400).json({ success: false, error: 'elder_id required' })
  try {
    const { data, error } = await supabase
      .from('guide_progress')
      .upsert(
        { elder_id, guide_slug: slug, status: 'completed',
          completed_at: new Date().toISOString(), last_active_at: new Date().toISOString() },
        { onConflict: 'elder_id,guide_slug' }
      )
      .select()
      .single()
    if (error) throw error
    return res.json({ success: true, progress: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

// POST /api/guides/:slug/struggle
router.post('/:slug/struggle', async (req, res) => {
  const { slug } = req.params
  const { elder_id } = req.body
  if (!elder_id)
    return res.status(400).json({ success: false, error: 'elder_id required' })
  try {
    const { data: existing } = await supabase
      .from('guide_progress')
      .select('struggle_count')
      .eq('elder_id', elder_id)
      .eq('guide_slug', slug)
      .single()
    const newCount = ((existing?.struggle_count) || 0) + 1
    const { data, error } = await supabase
      .from('guide_progress')
      .upsert(
        { elder_id, guide_slug: slug, struggle_count: newCount,
          last_active_at: new Date().toISOString() },
        { onConflict: 'elder_id,guide_slug' }
      )
      .select()
      .single()
    if (error) throw error
    return res.json({ success: true, struggle_count: newCount, progress: data })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router

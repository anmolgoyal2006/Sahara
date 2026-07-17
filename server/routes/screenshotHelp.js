/**
 * Phase 15J — Screenshot-Based Help + OCR
 *
 * POST /api/guides/screenshot-help
 * Body: multipart/form-data
 *   - image         : image file (required)
 *   - elder_id      : string
 *   - guide_slug    : string
 *   - current_step  : string (step number)
 *   - question      : string  (e.g. "I cannot find the Create Account button")
 *   - step_instruction : string  (the current step's instruction text)
 *
 * Returns: { success, location_description, explanation, ocr_text }
 *
 * Privacy: the uploaded image is processed entirely in memory.
 * It is NEVER written to disk, Supabase Storage, or any database.
 * It is discarded once the response is sent.
 *
 * Text reading (OCR) is handled natively by Gemini Vision — it reads any
 * on-screen text directly from the image, so no separate OCR pass is needed.
 */

const express  = require('express')
const multer   = require('multer')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const router = express.Router()

// ─── multer: memory-only storage (no temp files) ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'))
    }
    cb(null, true)
  },
})

// ─── Gemini vision client ─────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// Vision-capable model — reads on-screen text and locates UI elements from the image.
const visionModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash' })

// ─── Route ───────────────────────────────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // 1. Validate input
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' })
    }

    const {
      question        = 'I need help finding an element on screen',
      step_instruction = '',
      current_step    = '1',
    } = req.body

    const imageBuffer = req.file.buffer
    const mimeType    = req.file.mimetype

    // 2. Build Gemini Vision prompt — Gemini reads on-screen text natively,
    //    so no separate OCR pass is needed.
    const prompt = `You are a compassionate digital literacy assistant helping an elderly person in India use a smartphone.

The user is currently on step ${current_step} of a digital guide.
Step instruction: "${step_instruction}"
User's question: "${question}"

Read any text visible in the screenshot directly from the image.

Look carefully at the screenshot provided. Your task:
1. Locate the UI element the user is asking about (or the button/action needed for this step).
2. Describe WHERE it is on the screen using plain language that an elderly person can follow — e.g. "top-right corner", "at the very bottom of the screen", "below the blue search bar", "in the middle of the page". Do NOT use pixel coordinates.
3. Provide a short, simple explanation of what to do.

IMPORTANT RULES:
- Only describe what you can actually see in the screenshot.
- If the element is not clearly visible, respond with: "I can't see that clearly in this screenshot, can you try a clearer photo?"
- Never guess or invent UI elements that aren't in the image.
- Keep all language extremely simple — no jargon.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "location_description": "Plain-language location of the element, e.g. 'bottom of the screen, right side'",
  "explanation": "One or two simple sentences on what to do next.",
  "found": true
}

If the element isn't visible, respond:
{
  "location_description": "I can't see that clearly in this screenshot, can you try a clearer photo?",
  "explanation": "",
  "found": false
}`

    // 3. Call Gemini Vision with inline image
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    }

    let geminiRaw
    try {
      const result = await visionModel.generateContent([prompt, imagePart])
      geminiRaw = result.response.text().trim()
    } catch (visionErr) {
      console.error('[screenshot-help] Gemini Vision error:', visionErr.message)
      return res.status(502).json({
        success: false,
        error: 'Vision analysis failed. Please try again or describe your question in text.',
      })
    }

    // 4. Parse Gemini response
    let parsed
    try {
      const cleaned = geminiRaw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // If Gemini didn't return valid JSON, surface the raw text as location_description
      parsed = {
        location_description: geminiRaw.slice(0, 500) || 'Unable to analyse the screenshot.',
        explanation: '',
        found: false,
      }
    }

    // 5. Respond — imageBuffer goes out of scope here and is garbage-collected.
    //    No file was written anywhere.
    return res.json({
      success: true,
      location_description: parsed.location_description || '',
      explanation: parsed.explanation || '',
      found: parsed.found ?? true,
      ocr_text: null,
    })

  } catch (err) {
    // Multer size/type errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Screenshot is too large (max 10 MB)' })
    }
    console.error('[screenshot-help] Unhandled error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router

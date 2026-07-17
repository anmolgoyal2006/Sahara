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
 */

const express  = require('express')
const multer   = require('multer')
const Tesseract = require('tesseract.js')
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
// Use a vision-capable model; gemini-1.5-flash supports inline image parts.
const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

    // 2. Run OCR (server-side Tesseract, in-memory buffer)
    let ocrText = ''
    try {
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => {}, // suppress Tesseract progress logs
      })
      ocrText = (text || '').trim().slice(0, 2000) // cap to avoid prompt bloat
    } catch (ocrErr) {
      // OCR failure is non-fatal — we still send the image to Gemini
      console.error('[screenshot-help] OCR error:', ocrErr.message)
    }

    // 3. Build Gemini Vision prompt
    const prompt = `You are a compassionate digital literacy assistant helping an elderly person in India use a smartphone.

The user is currently on step ${current_step} of a digital guide.
Step instruction: "${step_instruction}"
User's question: "${question}"

${ocrText ? `Text visible in the screenshot (from OCR): "${ocrText}"` : ''}

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

    // 4. Call Gemini Vision with inline image
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

    // 5. Parse Gemini response
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

    // 6. Respond — imageBuffer goes out of scope here and is garbage-collected.
    //    No file was written anywhere.
    return res.json({
      success: true,
      location_description: parsed.location_description || '',
      explanation: parsed.explanation || '',
      found: parsed.found ?? true,
      ocr_text: ocrText || null,
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

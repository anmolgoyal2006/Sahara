// server/routes/voice.js
//
// POST /api/voice/text-to-speech
//
// Accepts plain text, calls ElevenLabs via elevenLabsService, and streams
// the resulting MP3 back to the browser. The ElevenLabs API key never
// leaves the server.

const express  = require('express')
const router   = express.Router()
const { textToSpeech } = require('../lib/elevenLabsService')

const MAX_TEXT_LENGTH = 2000  // matches the service-level cap

/**
 * POST /api/voice/text-to-speech
 * Body: { "text": "Hello Sahara ji!" }
 * Response: audio/mpeg binary (MP3)
 */
router.post('/text-to-speech', async (req, res) => {
  const { text } = req.body

  // ── Input validation ──────────────────────────────────────────────────────
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'text is required and must be a non-empty string.',
    })
  }

  if (text.trim().length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `text must not exceed ${MAX_TEXT_LENGTH} characters.`,
    })
  }

  // ── Generate audio ────────────────────────────────────────────────────────
  try {
    const audioBuffer = await textToSpeech(text.trim())

    // Return raw MP3 — the browser will receive it as a Blob via fetch()
    res.set({
      'Content-Type':   'audio/mpeg',
      'Content-Length': audioBuffer.length,
      // Prevent the audio from being cached (responses are dynamic per text)
      'Cache-Control':  'no-store',
    })
    return res.send(audioBuffer)

  } catch (err) {
    // Log the real error server-side, but don't expose the API key or
    // internal details to the browser.
    console.error('[voice/text-to-speech] ElevenLabs error:', err.message)

    // Surface a safe, structured error for the frontend fallback logic
    return res.status(502).json({
      success: false,
      error: 'Text-to-speech generation failed. Please try again.',
    })
  }
})

module.exports = router

// server/lib/elevenLabsService.js
//
// Isolates all ElevenLabs API communication from the rest of Sahara.
// The API key and voice ID never leave the server.
//
// Usage:
//   const { textToSpeech } = require('./elevenLabsService')
//   const audioBuffer = await textToSpeech('Hello Sahara ji!')
//   // audioBuffer is a Buffer containing MP3 data — pipe or send directly.

const https = require('https')

// ── Configuration ─────────────────────────────────────────────────────────────
// All secrets come from environment variables. Nothing is hard-coded.
const ELEVENLABS_API_KEY  = () => process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = () => process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // fallback: "Sarah" — a clear, calm voice

// ElevenLabs multilingual v2 model — supports Hindi, English, and mixed
// Hinglish/Punjabi (romanized) which is exactly what Sahara uses.
const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2'

// Output format: MP3 at 128 kbps. Universally playable in every modern
// browser without any client-side conversion.
const OUTPUT_FORMAT = 'mp3_44100_128'

// Maximum text length we will send to ElevenLabs.
// Gemini responses are capped at ~1024 tokens; 2000 chars is a safe ceiling.
const MAX_TEXT_LENGTH = 2000

/**
 * Convert text to speech using the ElevenLabs API.
 *
 * @param {string} text - Plain text to synthesize. Must not be empty.
 * @returns {Promise<Buffer>} - MP3 audio data as a Node.js Buffer.
 * @throws {Error} - Descriptive error if ElevenLabs fails or is misconfigured.
 */
function textToSpeech(text) {
  return new Promise((resolve, reject) => {
    const apiKey  = ELEVENLABS_API_KEY()
    const voiceId = ELEVENLABS_VOICE_ID()

    // Guard: key must be configured
    if (!apiKey || apiKey === 'your_key_here') {
      return reject(new Error('ELEVENLABS_API_KEY is not configured in environment variables.'))
    }

    // Guard: text must be usable
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return reject(new Error('textToSpeech: text must be a non-empty string.'))
    }

    const trimmedText = text.trim().slice(0, MAX_TEXT_LENGTH)

    const requestBody = JSON.stringify({
      text: trimmedText,
      model_id: ELEVENLABS_MODEL_ID,
      output_format: OUTPUT_FORMAT,
      voice_settings: {
        stability: 0.5,           // balanced between consistent and expressive
        similarity_boost: 0.75,   // higher = closer to the chosen voice character
        style: 0.0,               // neutral — less exaggerated for elderly UX
        use_speaker_boost: true,  // improves clarity on small phone speakers
      },
    })

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
      method: 'POST',
      headers: {
        'xi-api-key':     apiKey,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'Accept':         'audio/mpeg',
      },
    }

    const req = https.request(options, (res) => {
      // ElevenLabs returns 200 on success with binary audio,
      // or a JSON error body on 4xx/5xx.
      if (res.statusCode !== 200) {
        // Collect the error body to include in the thrown error
        let errBody = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { errBody += chunk })
        res.on('end', () => {
          let message = `ElevenLabs API error: HTTP ${res.statusCode}`
          try {
            const parsed = JSON.parse(errBody)
            if (parsed?.detail?.message) message += ` — ${parsed.detail.message}`
            else if (parsed?.detail)     message += ` — ${JSON.stringify(parsed.detail)}`
          } catch { /* body wasn't JSON, use status only */ }
          reject(new Error(message))
        })
        return
      }

      // Success — collect binary chunks
      const chunks = []
      res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks)
        if (audioBuffer.length === 0) {
          return reject(new Error('ElevenLabs returned an empty audio response.'))
        }
        resolve(audioBuffer)
      })
    })

    req.on('error', (err) => {
      reject(new Error(`ElevenLabs network error: ${err.message}`))
    })

    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('ElevenLabs request timed out after 15 seconds.'))
    })

    req.write(requestBody)
    req.end()
  })
}

module.exports = { textToSpeech }

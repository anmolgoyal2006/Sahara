// client/src/lib/voiceService.js
//
// Frontend voice output service for Sahara.
//
// Primary path  : text → Sahara backend → ElevenLabs → MP3 → Audio()
// Fallback path : text → window.speechSynthesis  (browser built-in)
//
// The ElevenLabs API key is NEVER present in this file or any frontend code.
// The browser only talks to Sahara's own backend (/api/voice/text-to-speech).
//
// Public API:
//   speakWithElevenLabs(text, langCode, options?)  → Promise<void>
//   stopSpeaking()
//   isSpeaking()

import { speak as browserSpeak, stopSpeaking as browserStop } from './speech'

const API_BASE = import.meta.env.VITE_API_URL || ''
const TTS_ENDPOINT = `${API_BASE}/api/voice/text-to-speech`

// ── Single shared audio instance ──────────────────────────────────────────────
// Keeping one reference lets us stop it before starting a new one, which
// prevents two ElevenLabs responses from playing simultaneously.
let currentAudio = null
let currentObjectUrl = null
let _isSpeaking = false

function setIsSpeaking(val) {
  _isSpeaking = val
}

/** Returns true while ElevenLabs audio is actively playing. */
export function isSpeaking() {
  return _isSpeaking
}

/**
 * Stop any currently playing ElevenLabs audio and release resources.
 * Also cancels any in-progress browser speech synthesis fallback.
 */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.onended  = null
    currentAudio.onerror  = null
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
  browserStop()
  setIsSpeaking(false)
}

/**
 * Speak text via ElevenLabs TTS, falling back to browser speechSynthesis
 * if ElevenLabs is unavailable or returns an error.
 *
 * @param {string} text          - Human-readable response text to speak.
 * @param {string} [langCode]    - BCP-47 code for fallback voice ('hi-IN', 'en-IN').
 *                                 ElevenLabs multilingual_v2 handles it automatically.
 * @param {object} [options]
 * @param {number} [options.rate]    - Rate for browser fallback only.
 * @param {function} [options.onSpeakingChange] - Called with true/false as state changes.
 * @returns {Promise<void>}  Resolves when audio finishes or on error (never rejects).
 */
export async function speakWithElevenLabs(text, langCode = 'hi-IN', options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return

  // Stop anything currently playing before starting new audio
  stopSpeaking()

  const { onSpeakingChange } = options

  function notifySpeaking(val) {
    setIsSpeaking(val)
    onSpeakingChange?.(val)
  }

  // ── Attempt ElevenLabs ────────────────────────────────────────────────────
  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })

    if (!response.ok) {
      // Backend returned an error — fall through to browser fallback
      throw new Error(`TTS endpoint returned HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('audio')) {
      throw new Error(`Unexpected content-type from TTS endpoint: ${contentType}`)
    }

    const audioBlob = await response.blob()
    if (audioBlob.size === 0) {
      throw new Error('TTS endpoint returned an empty audio blob.')
    }

    const objectUrl = URL.createObjectURL(audioBlob)
    currentObjectUrl = objectUrl

    const audio = new Audio(objectUrl)
    currentAudio = audio

    notifySpeaking(true)

    await new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl)
        if (currentObjectUrl === objectUrl) currentObjectUrl = null
        if (currentAudio === audio) currentAudio = null
        notifySpeaking(false)
        resolve()
      }

      audio.onerror = (e) => {
        console.warn('[voiceService] Audio playback error, falling back:', e)
        URL.revokeObjectURL(objectUrl)
        if (currentObjectUrl === objectUrl) currentObjectUrl = null
        if (currentAudio === audio) currentAudio = null
        notifySpeaking(false)
        resolve()
        // Use browser TTS as recovery after playback failure
        _fallbackToBrowser(text, langCode, options)
      }

      // audio.play() can be rejected by the browser if there's no prior
      // user interaction. We handle it gracefully.
      audio.play().catch((playErr) => {
        console.warn('[voiceService] audio.play() rejected:', playErr.message,
          '— falling back to browser speechSynthesis.')
        URL.revokeObjectURL(objectUrl)
        if (currentObjectUrl === objectUrl) currentObjectUrl = null
        if (currentAudio === audio) currentAudio = null
        notifySpeaking(false)
        resolve()
        _fallbackToBrowser(text, langCode, options)
      })
    })

  } catch (err) {
    // ElevenLabs fetch/network/parse failure — use browser TTS silently
    console.warn('[voiceService] ElevenLabs unavailable, using browser TTS fallback:', err.message)
    notifySpeaking(false)
    _fallbackToBrowserAsync(text, langCode, options, notifySpeaking)
  }
}

// ── Browser TTS fallback helpers ──────────────────────────────────────────────

/**
 * Fire-and-forget browser fallback (does not await completion).
 * Used in .catch() and audio.onerror where we can't await.
 */
function _fallbackToBuffer(text, langCode, options) {
  try {
    const rate = options.rate ?? 0.85
    browserSpeak(text, langCode, { rate })
  } catch (e) {
    console.error('[voiceService] Browser TTS also failed:', e)
  }
}

// alias used internally — same thing
const _fallbackToBrowser = _fallbackToBuffer

/**
 * Async browser fallback used in the main try/catch.
 * Sets isSpeaking state around the browser TTS call.
 */
async function _fallbackToBrowserAsync(text, langCode, options, notifySpeaking) {
  try {
    notifySpeaking(true)
    const rate = options.rate ?? 0.85
    // browserSpeak is async (waits for voiceschanged), returns a Promise
    await browserSpeak(text, langCode, { rate })
    // speechSynthesis has no reliable end-of-speech callback in all browsers,
    // so we estimate a generous timeout based on text length as a safety net.
    const estimatedMs = Math.max(1500, text.length * 60)
    await new Promise(r => setTimeout(r, estimatedMs))
  } catch (e) {
    console.error('[voiceService] Browser TTS fallback error:', e)
  } finally {
    notifySpeaking(false)
  }
}

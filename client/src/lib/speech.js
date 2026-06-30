// client/src/lib/speech.js
//
// Shared text-to-speech utility for Sahara.
// Centralizes voice selection, async voice loading, and sentence chunking
// so ElderCompanion.jsx and ElderBook.jsx (and any future screen) sound
// consistent and as natural as the free browser speechSynthesis API allows.
//
// Why this exists:
// - speechSynthesis.getVoices() loads asynchronously on first page load.
//   Calling it too early returns [] and you silently get the OS's worst
//   default voice. We cache voices once 'voiceschanged' fires.
// - Browsers usually ship several voices per language of wildly different
//   quality. We rank candidates and pick the best one instead of letting
//   the browser pick (which is often the most robotic one).
// - pa-IN has little to no browser TTS support and reads Gurmukhi
//   letter-by-letter. We deliberately speak Punjabi script-romanized text
//   with the Hindi voice, which is mutually intelligible and far more
//   natural than the alternative.
// - Long sentences can get rushed or clipped by some engines. We split on
//   punctuation and speak in chunks with tiny pauses, which sounds calmer
//   and is easier for elderly listeners to follow.

let cachedVoices = []
let voicesReadyPromise = null

function loadVoicesOnce() {
  if (!window.speechSynthesis) return Promise.resolve([])
  if (voicesReadyPromise) return voicesReadyPromise

  voicesReadyPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing && existing.length > 0) {
      cachedVoices = existing
      resolve(existing)
      return
    }
    // Voices not ready yet — wait for the event, with a safety timeout
    // in case a browser never fires it (some older WebViews don't).
    const onVoices = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      resolve(cachedVoices)
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }, 1500)
  })

  return voicesReadyPromise
}

// Kick off loading immediately on import so voices are usually ready
// by the time the first speak() call happens.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoicesOnce()
}

// Per-language voice preference. Each entry is an array of matcher
// functions, tried in order — first match wins. This lets us prefer
// high-quality engines (Google, Natural, Enhanced, Neural) over the
// generic OS default for the same language code.
const VOICE_RANKERS = {
  'hi-IN': [
    v => /google/i.test(v.name) && /hi[-_]?in/i.test(v.lang),
    v => /natural|enhanced|neural/i.test(v.name) && /hi/i.test(v.lang),
    v => /hi[-_]?in/i.test(v.lang),
    v => /hi/i.test(v.lang) || /hindi/i.test(v.name),
  ],
  'en-IN': [
    v => /google/i.test(v.name) && /en[-_]?in/i.test(v.lang),
    v => /natural|enhanced|neural/i.test(v.name) && /en[-_]?in/i.test(v.lang),
    v => /en[-_]?in/i.test(v.lang),
    v => /google/i.test(v.name) && /en/i.test(v.lang),
    v => /en/i.test(v.lang),
  ],
}

function pickBestVoice(langCode) {
  const rankers = VOICE_RANKERS[langCode] || VOICE_RANKERS['hi-IN']
  for (const matches of rankers) {
    const found = cachedVoices.find(matches)
    if (found) return found
  }
  return null
}

// Slight per-language tuning so Hindi/Punjabi (spoken via Hindi voice)
// and English don't all sound identically flat.
const LANG_TUNING = {
  'hi-IN': { rate: 0.88, pitch: 1.05 },
  'en-IN': { rate: 0.92, pitch: 1.0 },
}

// Split long text into natural chunks on sentence-ending punctuation
// (Hindi danda ।, period, question mark, exclamation) so the engine
// doesn't rush through long sentences or clip the end.
function chunkText(text) {
  const parts = text
    .split(/(?<=[।.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [text]
}

let currentUtterances = []

/**
 * Speak text aloud using the best available voice for the given language.
 *
 * @param {string} text - Text to speak. For Punjabi, pass romanized text
 *   (not Gurmukhi script) — see WELCOME pattern in ElderBook.jsx/ElderCompanion.jsx.
 * @param {string} langCode - BCP-47 code, e.g. 'hi-IN' or 'en-IN'. Use 'hi-IN'
 *   for Punjabi too, since pa-IN voices are unreliable in browsers.
 * @param {object} [options]
 * @param {number} [options.rate] - Override default rate for this call.
 * @param {number} [options.pitch] - Override default pitch for this call.
 */
export async function speak(text, langCode, options = {}) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  currentUtterances = []

  // Make sure we have voices before picking one. If they were already
  // cached this resolves instantly.
  await loadVoicesOnce()

  const tuning = LANG_TUNING[langCode] || LANG_TUNING['hi-IN']
  const rate = options.rate ?? tuning.rate
  const pitch = options.pitch ?? tuning.pitch
  const voice = pickBestVoice(langCode)

  const chunks = chunkText(text)

  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk)
    u.lang = langCode
    u.rate = rate
    u.pitch = pitch
    if (voice) u.voice = voice
    // Tiny breathing room between chunks so it doesn't sound like one
    // run-on sentence, without the long dead air of system pauses.
    if (i > 0) u.text = chunk
    currentUtterances.push(u)
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
  currentUtterances = []
}

export function isSpeechAvailable() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

// Convenience: map Sahara's internal language keys (hi/en/pa) to BCP-47
// codes, with Punjabi deliberately routed through the Hindi voice.
export function getLangCode(lang) {
  return { hi: 'hi-IN', en: 'en-IN', pa: 'hi-IN' }[lang] || 'hi-IN'
}
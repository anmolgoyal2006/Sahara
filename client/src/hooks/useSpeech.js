import { useState, useCallback, useRef } from 'react'

// pa falls back to hi-IN — no Punjabi TTS voice available on most devices
const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', pa: 'hi-IN' }

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  const speak = useCallback((text, language = 'en') => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_MAP[language] || 'en-IN'
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend   = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return { speak, stop, isSpeaking }
}

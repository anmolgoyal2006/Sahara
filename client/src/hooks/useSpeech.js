import { useCallback } from 'react'

export function useSpeech() {
  const speak = useCallback((text, lang = 'hi-IN') => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voices = window.speechSynthesis.getVoices()
    
    // Try to find a more natural-sounding Indian voice
    const indianVoice = voices.find(v =>
      (v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India')) &&
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Enhanced'))
    ) || voices.find(v =>
      v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India')
    )
    
    if (indianVoice) utterance.voice = indianVoice
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}

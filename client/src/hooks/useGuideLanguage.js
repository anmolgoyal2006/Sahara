import { useState } from 'react'

const STORAGE_KEY = 'sahara_guide_language'

export function useGuideLanguage() {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'en'
  )
  function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang)
    setLanguageState(lang)
  }
  return [language, setLanguage]
}

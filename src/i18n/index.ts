import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import he from './locales/he.json'

export const SUPPORTED_LANGUAGES = ['en', 'he'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Languages written right-to-left. */
export const RTL_LANGUAGES: Language[] = ['he']

export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.includes(language as Language)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      // React already escapes values, so i18next doesn't need to.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n

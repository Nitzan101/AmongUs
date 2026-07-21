import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '../i18n'

const LABELS: Record<Language, string> = {
  en: 'EN',
  he: 'עב',
}

/** A compact pill that toggles the app language. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? 'en') as Language

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-full border border-line bg-surface-raised p-1"
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = lng === current
        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            aria-pressed={active}
            className={
              'rounded-full px-3 py-1 text-sm font-bold transition-colors ' +
              (active
                ? 'bg-brand-600 text-white'
                : 'text-content-muted hover:text-content')
            }
          >
            {LABELS[lng]}
          </button>
        )
      })}
    </div>
  )
}

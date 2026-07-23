import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import type { Language } from '../i18n'
import { getWords, pickWords, type Difficulty, type WordAssignment } from '../words'

export function WordsPage() {
  const { t, i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? 'en') as Language
  const words = getWords(language)

  const [example, setExample] = useState<{
    difficulty: Difficulty
    words: WordAssignment
  } | null>(null)

  function roll(difficulty: Difficulty) {
    setExample({ difficulty, words: pickWords(language, difficulty) })
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-3xl font-black text-content">{t('words.title')}</h1>
      <p className="mt-1 text-content-muted">
        {t('words.count', { count: words.length })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => roll('easy')}>
          {t('words.rollEasy')}
        </Button>
        <Button variant="secondary" onClick={() => roll('medium')}>
          {t('words.rollMedium')}
        </Button>
        <Button variant="secondary" onClick={() => roll('hard')}>
          {t('words.rollHard')}
        </Button>
      </div>

      {example && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-3 text-center dark:bg-brand-500/10">
            <div className="text-xs font-bold uppercase text-content-muted">
              {t('words.crewGets')}
            </div>
            <div className="text-lg font-black text-content">
              {example.words.main}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-accent-500 bg-accent-500/10 p-3 text-center">
            <div className="text-xs font-bold uppercase text-content-muted">
              {t('words.imposterGets')} · {t(`words.${example.difficulty}`)}
            </div>
            <div className="text-lg font-black text-content">
              {example.words.confusing}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-2 text-sm">
        <div className="font-bold uppercase tracking-wide text-content-muted">
          {t('words.main')}
        </div>
        <div className="font-bold uppercase tracking-wide text-content-muted">
          {t('words.easy')}
        </div>
        <div className="font-bold uppercase tracking-wide text-content-muted">
          {t('words.medium')}
        </div>
        {words.map((w, i) => (
          <div key={i} className="contents">
            <div className="rounded-xl bg-surface-raised px-3 py-2 font-bold text-content">
              {w.main}
            </div>
            <div className="rounded-xl bg-surface-raised px-3 py-2 text-content-muted">
              {w.easy}
            </div>
            <div className="rounded-xl bg-surface-raised px-3 py-2 text-content-muted">
              {w.medium}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

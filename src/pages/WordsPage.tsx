import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import type { Language } from '../i18n'
import {
  countWords,
  getCategories,
  pickWords,
  type Difficulty,
  type WordAssignment,
} from '../words'

export function WordsPage() {
  const { t, i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? 'en') as Language
  const categories = getCategories(language)

  const [example, setExample] = useState<{
    difficulty: Difficulty
    words: WordAssignment
  } | null>(null)

  function roll(difficulty: Difficulty) {
    // Nothing is excluded here, so the bank can never come back empty — but
    // the type says it might, and rolling a sample is not worth a crash if
    // that ever stops being true.
    const words = pickWords(language, difficulty)
    if (words) setExample({ difficulty, words })
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-3xl font-black text-content">{t('words.title')}</h1>
      <p className="mt-1 text-content-muted">
        {t('words.count', { count: countWords(language) })}
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
            {/* Hard gives the imposter nothing at all, so the sample has to
                be able to show that rather than an empty box. */}
            <div
              dir="auto"
              className={
                'text-lg font-black ' +
                (example.words.confusing ? 'text-content' : 'text-content-muted')
              }
            >
              {example.words.confusing || t('words.imposterGetsNothing')}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {categories.map((cat) => (
          <div key={cat.id}>
            <h2 className="text-lg font-black text-content">{cat.emoji}</h2>
            <div className="mt-1 flex flex-col gap-2">
              {cat.clusters.map((cluster, ci) => (
                <div key={ci} className="flex flex-wrap gap-1.5">
                  {cluster.map((word) => (
                    <span
                      key={word}
                      className="rounded-full bg-surface-raised px-2.5 py-1 text-sm text-content"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

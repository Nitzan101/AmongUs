import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const STEPS = [
  { key: 'step1', emoji: '🃏' },
  { key: 'step2', emoji: '💡' },
  { key: 'step3', emoji: '🕵️' },
  { key: 'step4', emoji: '🗳️' },
  { key: 'step5', emoji: '🏆' },
]

export function RulesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">{t('rules.title')}</h1>

      <ol className="mt-4 flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li
            key={step.key}
            className="flex gap-4 rounded-2xl border border-line bg-surface-raised p-4"
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl">{step.emoji}</span>
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {i + 1}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-content">
                {t(`rules.${step.key}Title`)}
              </h2>
              <p className="mt-0.5 text-sm text-content-muted">
                {t(`rules.${step.key}Body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-auto pt-8">
        <Button size="lg" fullWidth onClick={() => navigate('/')}>
          {t('rules.gotIt')}
        </Button>
      </div>
    </div>
  )
}

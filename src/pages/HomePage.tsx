import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-7xl">🕵️</div>
        <h1 className="text-4xl font-black text-content">
          {t('common.appName')}
        </h1>
        <p className="max-w-xs text-lg text-content-muted">{t('home.tagline')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth onClick={() => navigate('/create')}>
          {t('home.createGame')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          onClick={() => navigate('/join')}
        >
          {t('home.joinGame')}
        </Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/rules')}>
          {t('home.howToPlay')}
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface-raised p-4 text-center">
        <p className="text-sm text-content-muted">{t('home.signInHint')}</p>
        <Button variant="ghost" className="mt-1 text-brand-600">
          {t('home.signIn')} →
        </Button>
      </div>
    </div>
  )
}

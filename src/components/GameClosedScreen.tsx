import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/Button'

/**
 * Shown when the host closes the room out from under everyone.
 *
 * A full screen rather than a dialog: there is no lobby left behind it to
 * return to, so a modal floating over a dead screen would be pretending
 * otherwise. It holds until the player acknowledges, instead of yanking them
 * home mid-sentence with no idea what happened.
 */
export function GameClosedScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="text-6xl">🚪</div>
      <h1 className="text-2xl font-black text-content">
        {t('lobby.closedTitle')}
      </h1>
      <p className="max-w-xs text-content-muted">{t('lobby.closedBody')}</p>
      <Button size="lg" onClick={() => navigate('/', { replace: true })}>
        {t('lobby.closedAction')}
      </Button>
    </div>
  )
}

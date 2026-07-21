import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'

// Placeholder players — real ones arrive over Firebase in a later milestone.
const MOCK_PLAYERS = [
  { id: '1', name: 'Dana', character: '🦊', host: true },
  { id: '2', name: 'Yossi', character: '🐼', host: false },
  { id: '3', name: 'Maya', character: '🦄', host: false },
]

export function LobbyPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">{t('lobby.title')}</h1>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-content-muted">
            {t('lobby.pinLabel')}
          </div>
          <div className="text-3xl font-black tracking-[0.3em] text-brand-600">
            428913
          </div>
        </div>
        <Button variant="secondary">🔗 {t('lobby.shareLink')}</Button>
      </div>

      <div className="mt-6 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-content-muted">
          {t('lobby.players')}
        </h2>
        <span className="text-sm font-bold text-content-muted">
          {MOCK_PLAYERS.length}
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {MOCK_PLAYERS.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
          >
            <span className="text-3xl">{p.character}</span>
            <span className="flex-1 font-bold text-content">{p.name}</span>
            {p.host && (
              <span className="rounded-full bg-sunny-400/20 px-2 py-0.5 text-xs font-bold text-sunny-500">
                HOST
              </span>
            )}
          </li>
        ))}
        <li className="rounded-2xl border-2 border-dashed border-line p-3 text-center text-sm text-content-muted">
          {t('lobby.waiting')}
        </li>
      </ul>

      <div className="mt-auto pt-8">
        <p className="mb-2 text-center text-sm text-content-muted">
          {t('lobby.hostNote')}
        </p>
        <Button size="lg" fullWidth>
          {t('lobby.startGame')}
        </Button>
      </div>
    </div>
  )
}

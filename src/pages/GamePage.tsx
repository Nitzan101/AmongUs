import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { useGame, useSecret } from '../game/useGame'
import { setPhase } from '../game/gameService'
import type { Player, Secret } from '../game/types'

function WordCard({ secret }: { secret: Secret | null }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  if (!secret) {
    return (
      <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center text-content-muted">
        {t('game.dealing')}
      </div>
    )
  }

  const isImposter = secret.role === 'imposter'

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="w-full rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 p-8 text-center dark:bg-brand-500/10"
      >
        <div className="text-4xl">🤫</div>
        <div className="mt-2 font-bold text-content">{t('game.tapToReveal')}</div>
        <div className="text-sm text-content-muted">{t('game.keepItSecret')}</div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(false)}
      className={
        'w-full rounded-2xl border-2 p-6 text-center ' +
        (isImposter
          ? 'border-accent-500 bg-accent-500/10'
          : 'border-brand-500 bg-brand-50 dark:bg-brand-500/10')
      }
    >
      {isImposter ? (
        <>
          <div className="text-4xl">🕵️</div>
          <div className="mt-1 text-lg font-black text-accent-600">
            {t('game.imposterTitle')}
          </div>
          <div className="mt-3 text-xs font-bold uppercase text-content-muted">
            {t('game.yourWord')}
          </div>
          <div className="text-3xl font-black text-content">{secret.word}</div>
          <div className="mt-2 text-sm text-content-muted">
            {t('game.imposterHint')}
          </div>
        </>
      ) : (
        <>
          <div className="text-xs font-bold uppercase text-content-muted">
            {t('game.yourWord')}
          </div>
          <div className="text-4xl font-black text-content">{secret.word}</div>
          <div className="mt-2 text-sm text-content-muted">
            {t('game.crewHint')}
          </div>
        </>
      )}
      <div className="mt-3 text-xs text-content-muted">{t('game.tapToHide')}</div>
    </button>
  )
}

export function GamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const { user } = useAuth()
  const { game, players, loading } = useGame(pin)
  const secret = useSecret(pin, user?.uid)

  // If the game returns to the lobby (or doesn't exist), follow it there.
  useEffect(() => {
    if (!loading && (!game || game.status === 'lobby')) {
      navigate(`/lobby/${pin}`, { replace: true })
    }
  }, [loading, game, pin, navigate])

  if (loading || !game || !game.round) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.loading')}</div>
      </div>
    )
  }

  const round = game.round
  const isHost = game.hostId === user?.uid
  const byId = new Map<string, Player>(players.map((p) => [p.id, p]))

  if (round.phase === 'clues') {
    const order = round.turnOrder
      .map((id) => byId.get(id))
      .filter((p): p is Player => Boolean(p))

    return (
      <div className="flex flex-1 flex-col">
        <h1 className="text-2xl font-black text-content">
          {t('game.cluesTitle')}
        </h1>
        <p className="mt-1 text-sm text-content-muted">{t('game.cluesHint')}</p>

        <div className="mt-4">
          <WordCard secret={secret} />
        </div>

        <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
          {t('game.turnOrder')}
        </h2>
        <ol className="mt-2 flex flex-col gap-2">
          {order.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
            >
              <span className="w-5 text-center font-black text-content-muted">
                {i + 1}
              </span>
              <span className="text-2xl">{p.character}</span>
              <span className="flex-1 font-bold text-content">
                {p.name}
                {p.id === user?.uid && (
                  <span className="ms-1 text-sm font-normal text-content-muted">
                    ({t('lobby.you')})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-auto pt-8">
          {isHost ? (
            <Button size="lg" fullWidth onClick={() => setPhase(pin, 'voting')}>
              {t('game.finishToVote')}
            </Button>
          ) : (
            <p className="text-center text-sm text-content-muted">
              {t('game.waitingHostVote')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Voting, tally and results arrive in the next stages.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="text-5xl">🗳️</div>
      <h1 className="text-2xl font-black text-content">{t('game.votingSoon')}</h1>
      <p className="max-w-xs text-content-muted">{t('game.votingSoonHint')}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { useGame } from '../game/useGame'
import {
  closeGame,
  forgetGame,
  kickPlayer,
  leaveGame,
  startGame,
} from '../game/gameService'
import { LeaveGameDialog } from '../components/LeaveGameDialog'
import { isStale, STALE_AFTER_MS, useNow, usePresence } from '../game/presence'

const MIN_PLAYERS = 4

export function LobbyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const { user } = useAuth()
  const { game, players, loading } = useGame(pin)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const me = players.find((p) => p.id === user?.uid)

  usePresence(pin, user?.uid, game, players)
  const now = useNow()

  // When the host starts the game, everyone in the lobby follows into it.
  useEffect(() => {
    if (game?.status === 'playing') {
      navigate(`/game/${pin}`, { replace: true })
    }
  }, [game?.status, pin, navigate])

  // If we're no longer a player here (kicked, or the host closed the room), forget it.
  useEffect(() => {
    if (loading) return
    if (!game) {
      forgetGame()
      navigate('/', { replace: true })
    } else if (!me) {
      forgetGame()
    }
  }, [loading, game, me, navigate])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.loading')}</div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🕳️</div>
        <h1 className="text-2xl font-black text-content">{t('lobby.notFound')}</h1>
        <Button onClick={() => navigate('/join')}>{t('home.joinGame')}</Button>
      </div>
    )
  }

  const isHost = game.hostId === user?.uid

  if (game.status === 'playing') {
    // The effect above redirects into the game; show a brief hand-off.
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.starting')}</div>
      </div>
    )
  }

  if (!me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">👋</div>
        <h1 className="text-2xl font-black text-content">{t('lobby.notInGame')}</h1>
        <Button onClick={() => navigate(`/join/${pin}`)}>{t('join.submit')}</Button>
      </div>
    )
  }

  const shareLink = `${window.location.origin}/join/${pin}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be unavailable; the PIN is still shown */
    }
  }

  async function handleLeave(newHostId?: string) {
    if (user) await leaveGame(pin, user.uid, newHostId)
    navigate('/')
  }

  async function handleCloseGame() {
    await closeGame(pin)
    navigate('/')
  }

  // Sort so the host shows first, then by join order isn't tracked — keep stable by name.
  const sorted = [...players].sort((a, b) =>
    a.isHost === b.isHost ? a.name.localeCompare(b.name) : a.isHost ? -1 : 1,
  )

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">{t('lobby.title')}</h1>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-content-muted">
            {t('lobby.pinLabel')}
          </div>
          <div className="text-3xl font-black tracking-[0.3em] text-brand-600">
            {pin}
          </div>
        </div>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? `✓ ${t('lobby.copied')}` : `🔗 ${t('lobby.shareLink')}`}
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-content-muted">
          {t('lobby.players')}
        </h2>
        <span className="text-sm font-bold text-content-muted">
          {players.length}
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {sorted.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
          >
            <span className="text-3xl">{p.character}</span>
            <span className="flex-1 font-bold text-content">
              {p.name}
              {p.id === user?.uid && (
                <span className="ms-1 text-sm font-normal text-content-muted">
                  ({t('lobby.you')})
                </span>
              )}
            </span>
            {isStale(p.lastSeen, now, STALE_AFTER_MS) && (
              <span className="rounded-full bg-content-muted/10 px-2 py-0.5 text-xs font-bold text-content-muted">
                {t('lobby.disconnected')}
              </span>
            )}
            {p.isHost && (
              <span className="rounded-full bg-sunny-400/20 px-2 py-0.5 text-xs font-bold text-sunny-500">
                {t('lobby.host')}
              </span>
            )}
            {isHost && !p.isHost && (
              <button
                type="button"
                onClick={() => kickPlayer(pin, p.id)}
                className="rounded-full px-2 py-0.5 text-sm text-accent-500 hover:bg-accent-500/10"
                aria-label={t('lobby.kick')}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {isHost ? (
          <>
            {players.length < MIN_PLAYERS && (
              <p className="mb-2 text-center text-sm text-content-muted">
                {t('lobby.needMore', { count: MIN_PLAYERS })}
              </p>
            )}
            <Button
              size="lg"
              fullWidth
              disabled={players.length < MIN_PLAYERS}
              onClick={() => startGame(pin)}
            >
              {t('lobby.startGame')}
            </Button>
          </>
        ) : (
          <p className="mb-2 text-center text-sm text-content-muted">
            {t('lobby.hostNote')}
          </p>
        )}
        <Button
          variant="ghost"
          fullWidth
          className="mt-2"
          onClick={() => setLeaving(true)}
        >
          {t('lobby.leave')}
        </Button>
      </div>

      {leaving && (
        <LeaveGameDialog
          isHost={isHost}
          others={players.filter((p) => p.id !== user?.uid)}
          onCancel={() => setLeaving(false)}
          onLeave={handleLeave}
          onClose={handleCloseGame}
        />
      )}
    </div>
  )
}

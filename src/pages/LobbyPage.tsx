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
  MAX_PLAYERS,
  MIN_PLAYERS,
  startGame,
} from '../game/gameService'
import { LeaveGameDialog } from '../components/LeaveGameDialog'
import { PlayerDepartures } from '../components/PlayerDepartures'
import { useBackGuard } from '../game/useBackGuard'
import { report } from '../lib/reportError'
import { shareLink } from '../lib/share'
import { GameSettingsPanel } from '../components/GameSettingsPanel'
import { EditIdentityDialog } from '../components/EditIdentityDialog'
import { colorForBadge } from '../game/badges'
import { BadgeIcon } from '../components/BadgeIcon'
import { GameClosedScreen } from '../components/GameClosedScreen'
import { useGameClosed } from '../game/useGameClosed'
import { isStale, STALE_AFTER_MS, useNow, usePresence } from '../game/presence'
import { useMyWordSets, useWordSetById } from '../game/wordSets'
import type { WordSetHandover } from '../game/gameService'
import type { Player } from '../game/types'

export function LobbyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const { user } = useAuth()
  const { game, players, loading } = useGame(pin)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [editingIdentity, setEditingIdentity] = useState(false)
  const me = players.find((p) => p.id === user?.uid)

  usePresence(pin, user?.uid, game, players)
  const now = useNow()

  // Only the host can switch word sets, so only their own sets are needed.
  const isHostUser = game?.hostId === user?.uid
  // Not gated on `isGuest`: hosting implies an account, and passing the guest
  // flag here silently returned an empty list, so the Words section vanished
  // from the panel with nothing to explain why.
  // All of them, not only the ones big enough to deal from: the panel has to
  // be able to tell "your set has shrunk" from "this set was never yours".
  const { sets } = useMyWordSets(isHostUser ? user?.uid : undefined, false)
  // A set a previous host lent the room, and the set in play — the latter only
  // to find out whether it's ours, which decides if leaving has to ask about it.
  const loanedSet = useWordSetById(isHostUser ? game?.sharedWordSetId : null)
  const activeSet = useWordSetById(isHostUser ? game?.wordSetId : null)
  const myWordSet = activeSet?.ownerId === user?.uid ? activeSet : null

  // When the host starts the game, everyone in the lobby follows into it.
  // Follow the host into the game — but only if we're actually in it. Sending
  // a non-player to the game screen started a loop: it bounced them straight
  // back here, and this sent them again, flickering between the two forever.
  useEffect(() => {
    if (game?.status === 'playing' && me) {
      navigate(`/game/${pin}`, { replace: true })
    }
  }, [game?.status, me, pin, navigate])

  const closed = useGameClosed(loading, game)

  // Same as in a running game: the screens behind the lobby all bounce you
  // back into it, so Back asks about leaving instead of looking broken.
  useBackGuard(!closed, () => setLeaving((open) => !open))

  // If we're no longer a player here (kicked, or the host closed the room), forget it.
  useEffect(() => {
    if (loading) return
    if (!game) {
      forgetGame()
      // Someone whose room was closed gets told why and leaves on their own
      // terms; only a PIN that never existed goes straight home.
      if (!closed) navigate('/', { replace: true })
    } else if (!me) {
      forgetGame()
    }
  }, [loading, game, me, navigate, closed])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.loading')}</div>
      </div>
    )
  }

  if (closed) return <GameClosedScreen />

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

  // Checked before the hand-off below: someone who has left or been removed is
  // not "about to start a game", and telling them so was half of a redirect
  // loop. They can rejoin with the PIN and wait for the next game.
  if (!me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">👋</div>
        <h1 className="text-2xl font-black text-content">{t('lobby.notInGame')}</h1>
        <Button onClick={() => navigate(`/join/${pin}`)}>{t('join.submit')}</Button>
      </div>
    )
  }

  if (game.status === 'playing') {
    // The effect above redirects into the game; show a brief hand-off.
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.starting')}</div>
      </div>
    )
  }

  const invite = `${window.location.origin}/join/${pin}`

  async function share() {
    const result = await shareLink(invite, t('lobby.shareInvite'))
    if (result !== 'copied') return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleLeave(newHostId?: string, wordSet?: WordSetHandover) {
    if (user) await leaveGame(pin, user.uid, newHostId, wordSet)
    navigate('/')
  }

  async function handleCloseGame() {
    await closeGame(pin)
    navigate('/')
  }

  function handleKick(player: Player) {
    if (!window.confirm(t('game.confirmKick', { name: player.name }))) return
    kickPlayer(pin, player.id).catch(report('remove that player'))
  }

  // Sort so the host shows first, then by join order isn't tracked — keep stable by name.
  const sorted = [...players].sort((a, b) =>
    a.isHost === b.isHost ? a.name.localeCompare(b.name) : a.isHost ? -1 : 1,
  )

  return (
    <div className="flex flex-1 flex-col">
      <PlayerDepartures players={players} active={!closed} selfId={user?.uid} />

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
        <Button variant="secondary" onClick={share}>
          {copied ? `✓ ${t('lobby.copied')}` : `🔗 ${t('lobby.shareLink')}`}
        </Button>
      </div>

      <GameSettingsPanel
        pin={pin}
        game={game}
        isHost={isHost}
        uid={user?.uid ?? ''}
        mySets={sets}
        loanedSet={loanedSet}
      />

      <div className="mt-6 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-content-muted">
          {t('lobby.players')}
        </h2>
        {/* Out of the maximum, not just a bare count: a room filling up is
            worth seeing before somebody is turned away at the door. */}
        <span
          className={
            'text-sm font-bold ' +
            (players.length >= MAX_PLAYERS
              ? 'text-accent-600'
              : 'text-content-muted')
          }
        >
          {players.length} / {MAX_PLAYERS}
        </span>
      </div>

      {players.length >= MAX_PLAYERS && (
        <p className="mt-2 rounded-xl bg-sunny-400/15 px-3 py-2 text-sm font-medium text-content">
          {t('lobby.roomFull', { count: MAX_PLAYERS })}
        </p>
      )}

      <ul className="mt-2 flex flex-col gap-2">
        {sorted.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
          >
            {/* Your own row is a button: the host was never asked for a name
                or character, so this is where they set them. */}
            {p.id === user?.uid ? (
              <button
                type="button"
                onClick={() => setEditingIdentity(true)}
                className="flex flex-1 items-center gap-3 text-start"
              >
                <span className="text-3xl">{p.character}</span>
                <span className="flex-1 font-bold text-content">
                  <span className="flex items-center gap-1.5">
                    {p.name}
                    <span className="text-sm font-normal text-content-muted">
                      ({t('lobby.you')})
                    </span>
                    {p.displayedBadge && (
                      <BadgeIcon
                        icon={p.displayedBadge.icon}
                        color={colorForBadge(p.displayedBadge)}
                        filled={1}
                        size="sm"
                        showStars={false}
                      />
                    )}
                  </span>
                  <span className="block text-xs font-normal text-brand-600">
                    {t('lobby.editIdentityHint')}
                  </span>
                </span>
              </button>
            ) : (
              <>
                <span className="text-3xl">{p.character}</span>
                <span className="flex flex-1 items-center gap-1.5 font-bold text-content">
                  {p.name}
                  {p.displayedBadge && (
                    <BadgeIcon
                      icon={p.displayedBadge.icon}
                      color={colorForBadge(p.displayedBadge)}
                      filled={1}
                      size="sm"
                      showStars={false}
                    />
                  )}
                </span>
              </>
            )}
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
            {/* Ask first, as the in-game version already does. This is a bare
                ✕ sitting beside every name on a phone, and removing someone
                cannot be undone — they have to be sent the link again. */}
            {isHost && !p.isHost && (
              <button
                type="button"
                onClick={() => handleKick(p)}
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
              onClick={() => startGame(pin).catch(report('start the game'))}
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
          myWordSet={myWordSet}
          onCancel={() => setLeaving(false)}
          onLeave={handleLeave}
          onClose={handleCloseGame}
        />
      )}

      {editingIdentity && me && (
        <EditIdentityDialog
          pin={pin}
          me={me}
          onClose={() => setEditingIdentity(false)}
        />
      )}
    </div>
  )
}

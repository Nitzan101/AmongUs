import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { useGame, useSecret, useVotes } from '../game/useGame'
import {
  backToLobby,
  castGuess,
  castVote,
  continueAfterReveal,
  openVoting,
  resolveGuess,
  resolveVote,
  revealVotes,
  startGame,
} from '../game/gameService'
import type { Player, Round, Secret, Vote } from '../game/types'

type PlayerMap = Map<string, Player>

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

function PlayerRow({
  player,
  isYou,
  index,
}: {
  player: Player
  isYou: boolean
  index?: number
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3">
      {index != null && (
        <span className="w-5 text-center font-black text-content-muted">
          {index}
        </span>
      )}
      <span className="text-2xl">{player.character}</span>
      <span className="flex-1 font-bold text-content">
        {player.name}
        {isYou && (
          <span className="ms-1 text-sm font-normal text-content-muted">
            ({t('lobby.you')})
          </span>
        )}
      </span>
    </div>
  )
}

function HostOrWait({
  isHost,
  label,
  onClick,
  waitKey,
}: {
  isHost: boolean
  label: string
  onClick: () => void
  waitKey: string
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-auto pt-8">
      {isHost ? (
        <Button size="lg" fullWidth onClick={onClick}>
          {label}
        </Button>
      ) : (
        <p className="text-center text-sm text-content-muted">{t(waitKey)}</p>
      )}
    </div>
  )
}

function CluePhase({
  pin,
  round,
  byId,
  uid,
  secret,
  isHost,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  uid: string
  secret: Secret | null
  isHost: boolean
}) {
  const { t } = useTranslation()
  const order = round.turnOrder
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p))

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-black text-content">{t('game.cluesTitle')}</h1>
      <p className="mt-1 text-sm text-content-muted">{t('game.cluesHint')}</p>

      <div className="mt-4">
        <WordCard secret={secret} />
      </div>

      <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
        {t('game.turnOrder')}
      </h2>
      <ol className="mt-2 flex flex-col gap-2">
        {order.map((p, i) => (
          <li key={p.id}>
            <PlayerRow player={p} isYou={p.id === uid} index={i + 1} />
          </li>
        ))}
      </ol>

      <HostOrWait
        isHost={isHost}
        label={t('game.finishToVote')}
        onClick={() => openVoting(pin)}
        waitKey="game.waitingHostVote"
      />
    </div>
  )
}

function VotingPhase({
  pin,
  round,
  byId,
  uid,
  votes,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  uid: string
  votes: Vote[]
}) {
  const { t } = useTranslation()
  const meAlive = round.aliveIds.includes(uid)
  const myVote = votes.find((v) => v.voter === uid)?.target
  const candidates = (round.candidates ?? round.aliveIds).filter(
    (id) => id !== uid,
  )
  const progress = `${votes.length}/${round.aliveIds.length}`

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-black text-content">{t('game.voteTitle')}</h1>
      <p className="mt-1 text-sm text-content-muted">
        {round.votingRound === 'revote'
          ? t('game.revoteHint')
          : t('game.voteHint')}
      </p>
      <p className="mt-1 text-sm font-bold text-content-muted">
        {t('game.votedCount', { progress })}
      </p>

      {meAlive ? (
        <div className="mt-4 flex flex-col gap-2">
          {candidates.map((id) => {
            const p = byId.get(id)
            if (!p) return null
            const selected = myVote === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => castVote(pin, uid, id)}
                aria-pressed={selected}
                className={
                  'flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition-colors ' +
                  (selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-line bg-surface-raised hover:border-brand-300')
                }
              >
                <span className="text-2xl">{p.character}</span>
                <span className="flex-1 font-bold text-content">{p.name}</span>
                {selected && <span className="text-brand-600">✓</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-line p-6 text-center text-content-muted">
          {t('game.youAreOut')}
        </div>
      )}
    </div>
  )
}

function TallyPhase({
  pin,
  byId,
  votes,
  isHost,
}: {
  pin: string
  byId: PlayerMap
  votes: Vote[]
  isHost: boolean
}) {
  const { t } = useTranslation()
  // Group voters under each target.
  const byTarget = new Map<string, Player[]>()
  for (const v of votes) {
    const voter = byId.get(v.voter)
    if (!voter) continue
    const list = byTarget.get(v.target) ?? []
    list.push(voter)
    byTarget.set(v.target, list)
  }
  const targets = [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-black text-content">{t('game.tallyTitle')}</h1>
      <p className="mt-1 text-sm text-content-muted">{t('game.tallyHint')}</p>

      <div className="mt-4 flex flex-col gap-3">
        {targets.map(([targetId, voters]) => {
          const target = byId.get(targetId)
          if (!target) return null
          return (
            <div
              key={targetId}
              className="rounded-2xl border border-line bg-surface-raised p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{target.character}</span>
                <span className="flex-1 font-black text-content">
                  {target.name}
                </span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-sm font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  {voters.length}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {voters.map((voter) => (
                  <span
                    key={voter.id}
                    className="rounded-full bg-surface px-2 py-0.5 text-sm text-content-muted"
                  >
                    {voter.character} {voter.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <HostOrWait
        isHost={isHost}
        label={t('game.continue')}
        onClick={() => resolveVote(pin)}
        waitKey="game.waitingHost"
      />
    </div>
  )
}

function RevealPhase({
  pin,
  round,
  byId,
  isHost,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  isHost: boolean
}) {
  const { t } = useTranslation()
  const eliminated = round.eliminatedId ? byId.get(round.eliminatedId) : null
  const wasImposter = round.eliminatedRole === 'imposter'

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-6xl">{eliminated?.character ?? '❓'}</div>
        <h1 className="text-2xl font-black text-content">
          {t('game.wasVotedOut', { name: eliminated?.name ?? '' })}
        </h1>
        <div
          className={
            'rounded-2xl border-2 px-5 py-3 text-lg font-black ' +
            (wasImposter
              ? 'border-accent-500 bg-accent-500/10 text-accent-600'
              : 'border-brand-500 bg-brand-50 text-content dark:bg-brand-500/10')
          }
        >
          {wasImposter ? t('game.wasImposter') : t('game.wasCrew')}
        </div>
        <p className="max-w-xs text-content-muted">
          {wasImposter ? t('game.caughtHint') : t('game.notImposterHint')}
        </p>
      </div>

      <HostOrWait
        isHost={isHost}
        label={t('game.continue')}
        onClick={() => continueAfterReveal(pin)}
        waitKey="game.waitingHost"
      />
    </div>
  )
}

function GuessPhase({
  pin,
  round,
  secret,
  isHost,
}: {
  pin: string
  round: Round
  secret: Secret | null
  isHost: boolean
}) {
  const { t } = useTranslation()
  const [guess, setGuess] = useState('')
  const amImposter = secret?.role === 'imposter'
  const submitted = round.guessText != null

  if (amImposter && !submitted) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-6xl">🎯</div>
        <h1 className="mt-2 text-2xl font-black text-content">
          {t('game.guessTitle')}
        </h1>
        <p className="mt-1 text-content-muted">{t('game.guessHint')}</p>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={t('game.guessPlaceholder')}
          className="mt-4 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-lg text-content outline-none focus:border-brand-500"
        />
        <div className="mt-auto pt-8">
          <Button
            size="lg"
            fullWidth
            disabled={guess.trim().length === 0}
            onClick={() => castGuess(pin, guess.trim())}
          >
            {t('game.submitGuess')}
          </Button>
        </div>
      </div>
    )
  }

  // Everyone else (and the imposter after submitting) waits for the result.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="animate-pulse text-5xl">🎯</div>
      <h1 className="text-2xl font-black text-content">
        {t('game.imposterGuessing')}
      </h1>
      {!isHost && (
        <p className="text-sm text-content-muted">{t('game.waitingHost')}</p>
      )}
    </div>
  )
}

function Scoreboard({ players }: { players: Player[] }) {
  const { t } = useTranslation()
  const ranked = [...players].sort((a, b) => b.score - a.score)
  return (
    <div>
      <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
        {t('game.scoreboard')}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
          >
            <span className="w-5 text-center font-black text-content-muted">
              {i + 1}
            </span>
            <span className="text-2xl">{p.character}</span>
            <span className="flex-1 font-bold text-content">{p.name}</span>
            <span className="text-lg font-black text-brand-600">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultPhase({
  pin,
  round,
  byId,
  players,
  isHost,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  players: Player[]
  isHost: boolean
}) {
  const { t } = useTranslation()
  const crewWon = round.outcome === 'crew-wins'
  const imposter = round.imposterId ? byId.get(round.imposterId) : null
  const guessed = round.guessText != null

  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="text-6xl">{crewWon ? '🎉' : '😈'}</div>
        <h1 className="text-3xl font-black text-content">
          {crewWon ? t('game.crewWins') : t('game.imposterWins')}
        </h1>
        {imposter && (
          <p className="text-content-muted">
            {t('game.theImposterWas')}{' '}
            <span className="font-black text-content">
              {imposter.character} {imposter.name}
            </span>
          </p>
        )}
        {round.mainWord && (
          <p className="text-content-muted">
            {t('game.theWordWas')}{' '}
            <span className="font-black text-content">{round.mainWord}</span>
          </p>
        )}
        {guessed && (
          <p
            className={
              'rounded-full px-3 py-1 text-sm font-bold ' +
              (round.guessCorrect
                ? 'bg-accent-500/15 text-accent-600'
                : 'bg-surface-raised text-content-muted')
            }
          >
            {round.guessCorrect
              ? t('game.guessRight', { guess: round.guessText })
              : t('game.guessWrong', { guess: round.guessText })}
          </p>
        )}
      </div>

      <div className="mt-6">
        <Scoreboard players={players} />
      </div>

      <div className="mt-auto pt-6">
        {isHost ? (
          <>
            <Button size="lg" fullWidth onClick={() => startGame(pin)}>
              {t('game.nextGame')}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => backToLobby(pin)}
            >
              {t('game.backToLobby')}
            </Button>
          </>
        ) : (
          <p className="text-center text-sm text-content-muted">
            {t('game.waitingHostNext')}
          </p>
        )}
      </div>
    </div>
  )
}

export function GamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const { user } = useAuth()
  const { game, players, loading } = useGame(pin)
  const secret = useSecret(pin, user?.uid)
  const votes = useVotes(pin)

  const uid = user?.uid ?? ''
  const isHost = game?.hostId === uid
  const round = game?.round ?? null

  // Follow the game back to the lobby when it ends there.
  useEffect(() => {
    if (!loading && (!game || game.status === 'lobby')) {
      navigate(`/lobby/${pin}`, { replace: true })
    }
  }, [loading, game, pin, navigate])

  // The host drives the reveal once everyone has voted.
  useEffect(() => {
    if (
      isHost &&
      round?.phase === 'voting' &&
      round.aliveIds.length > 0 &&
      votes.length >= round.aliveIds.length
    ) {
      revealVotes(pin)
    }
  }, [isHost, round?.phase, round?.aliveIds.length, votes.length, pin])

  // The host scores the imposter's guess once it's submitted.
  useEffect(() => {
    if (
      isHost &&
      round?.phase === 'guess' &&
      round.guessText != null &&
      round.guessCorrect == null
    ) {
      resolveGuess(pin)
    }
  }, [isHost, round?.phase, round?.guessText, round?.guessCorrect, pin])

  if (loading || !game || !round) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.loading')}</div>
      </div>
    )
  }

  const byId: PlayerMap = new Map(players.map((p) => [p.id, p]))

  switch (round.phase) {
    case 'clues':
      return (
        <CluePhase
          pin={pin}
          round={round}
          byId={byId}
          uid={uid}
          secret={secret}
          isHost={isHost}
        />
      )
    case 'voting':
      return (
        <VotingPhase pin={pin} round={round} byId={byId} uid={uid} votes={votes} />
      )
    case 'tally':
      return <TallyPhase pin={pin} byId={byId} votes={votes} isHost={isHost} />

    case 'reveal':
      return <RevealPhase pin={pin} round={round} byId={byId} isHost={isHost} />
    case 'guess':
      return (
        <GuessPhase pin={pin} round={round} secret={secret} isHost={isHost} />
      )
    case 'result':
      return (
        <ResultPhase
          pin={pin}
          round={round}
          byId={byId}
          players={players}
          isHost={isHost}
        />
      )
    default:
      return null
  }
}

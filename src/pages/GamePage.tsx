import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { useClues, useGame, useSecret, useVotes } from '../game/useGame'
import {
  backToLobby,
  castGuess,
  castVote,
  closeGame,
  continueAfterReveal,
  continueToScoreboard,
  forgetGame,
  GameError,
  leaveGame,
  openVoting,
  resolveGuess,
  resolveGuessReview,
  resolveVote,
  skipGuess,
  revealVotes,
  startGame,
  submitClue,
} from '../game/gameService'
import { GameClosedScreen } from '../components/GameClosedScreen'
import { GameHeaderBar } from '../components/GameHeaderBar'
import { HostPlayerManager } from '../components/HostPlayerManager'
import { useGameClosed } from '../game/useGameClosed'
import { recordGameResult } from '../game/stats'
import { LeaveGameDialog } from '../components/LeaveGameDialog'
import { TurnCircle } from '../components/TurnCircle'
import { isStale, STALE_AFTER_MS, useNow, usePresence } from '../game/presence'
import type { Clue, Player, Round, Secret, Vote } from '../game/types'

type PlayerMap = Map<string, Player>

/** Stable empty set, so the ring's memoisation isn't defeated by a new one. */
const EMPTY_IDS: Set<string> = new Set()

/** Kept in step with the lobby's own minimum. */
const MIN_PLAYERS = 4

function WordCard({
  secret,
  imposterAware,
}: {
  secret: Secret | null
  /** False in the hidden-role variant: nobody is told what they are. */
  imposterAware: boolean
}) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  if (!secret) {
    return (
      <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center text-content-muted">
        {t('game.dealing')}
      </div>
    )
  }

  // In the hidden-role variant the imposter is shown the ordinary crew card,
  // so their word looks like everyone else's and they give clues sincerely.
  // The deal itself is unchanged — they still hold the confusing word.
  const isImposter = secret.role === 'imposter' && imposterAware

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
  disconnected,
  eliminated,
}: {
  player: Player
  isYou: boolean
  index?: number
  disconnected?: boolean
  eliminated?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={
        'flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3' +
        (eliminated ? ' opacity-50' : '')
      }
    >
      {index != null && (
        <span className="w-5 text-center font-black text-content-muted">
          {index}
        </span>
      )}
      <span className="text-2xl">{player.character}</span>
      <span
        className={
          'flex-1 font-bold text-content' + (eliminated ? ' line-through' : '')
        }
      >
        {player.name}
        {isYou && (
          <span className="ms-1 text-sm font-normal text-content-muted">
            ({t('lobby.you')})
          </span>
        )}
      </span>
      {eliminated && (
        <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-bold text-accent-500">
          {t('game.eliminated')}
        </span>
      )}
      {disconnected && (
        <span className="rounded-full bg-content-muted/10 px-2 py-0.5 text-xs font-bold text-content-muted">
          {t('lobby.disconnected')}
        </span>
      )}
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

/** The running list of words typed this game (full-virtual mode). */
function ClueFeed({
  clues,
  byId,
  currentRound,
}: {
  clues: Clue[]
  byId: PlayerMap
  currentRound: number
}) {
  const { t } = useTranslation()

  if (clues.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-line p-5 text-center text-sm text-content-muted">
        {t('game.noCluesYet')}
      </div>
    )
  }

  const rounds = [...new Set(clues.map((c) => c.round))].sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-3">
      {rounds.map((roundNo) => (
        <div key={roundNo}>
          <div className="px-1 text-xs font-bold uppercase tracking-wide text-content-muted">
            {t('game.roundLabel', { number: roundNo })}
            {roundNo === currentRound && ` · ${t('game.currentRound')}`}
          </div>
          <div className="mt-1 flex flex-col gap-1.5">
            {clues
              .filter((c) => c.round === roundNo)
              .map((c) => {
                const p = byId.get(c.playerId)
                return (
                  <div
                    key={`${c.round}_${c.playerId}`}
                    className="flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2"
                  >
                    <span className="text-xl">{p?.character ?? '❓'}</span>
                    <span className="text-sm text-content-muted">
                      {p?.name ?? '—'}
                    </span>
                    <span className="ms-auto font-black text-content">
                      {c.word}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Type-your-word input, shown only when it's your turn (full-virtual mode). */
function ClueInput({
  pin,
  uid,
  isMyTurn,
  waitingFor,
}: {
  pin: string
  uid: string
  isMyTurn: boolean
  waitingFor: Player | undefined
}) {
  const { t } = useTranslation()
  const [word, setWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isMyTurn) {
    return (
      <div className="rounded-2xl border border-line bg-surface-raised p-4 text-center text-sm text-content-muted">
        {waitingFor
          ? t('game.waitingForClue', { name: waitingFor.name })
          : t('game.waitingHostVote')}
      </div>
    )
  }

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      await submitClue(pin, uid, word)
      setWord('')
    } catch (err) {
      const code = err instanceof GameError ? err.code : 'generic'
      setError(t(`game.clueErrors.${code}`, t('game.clueErrors.generic')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-4 dark:bg-brand-500/10">
      <div className="text-sm font-bold text-brand-600">
        {t('game.yourTurnToType')}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && word.trim() && !busy) submit()
          }}
          placeholder={t('game.cluePlaceholder')}
          className="min-w-0 flex-1 rounded-xl border-2 border-line bg-surface-raised px-3 py-2 text-content outline-none focus:border-brand-500"
        />
        <Button disabled={!word.trim() || busy} onClick={submit}>
          {t('game.sendClue')}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-accent-600">{error}</p>
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
  staleIds,
  isFullVirtual,
  clues,
  imposterAware,
  turnCircle,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  uid: string
  secret: Secret | null
  isHost: boolean
  staleIds: Set<string>
  isFullVirtual: boolean
  clues: Clue[]
  imposterAware: boolean
  /** In-person only: draw the order as a ring instead of a numbered list. */
  turnCircle: boolean
}) {
  const { t } = useTranslation()
  // Absent from the turn order entirely means this game was dealt before they
  // arrived — a very different thing from being voted out of it.
  const iAmWaiting = !round.turnOrder.includes(uid)
  const iAmEliminated = !iAmWaiting && !round.aliveIds.includes(uid)
  const order = round.turnOrder
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p))

  // Whose turn it is in full-virtual mode: the next alive player in turn order
  // who hasn't submitted a clue this round.
  const aliveOrder = round.turnOrder.filter((id) => round.aliveIds.includes(id))
  const thisRoundCount = clues.filter((c) => c.round === round.number).length
  const currentTurnId = aliveOrder[thisRoundCount]
  const allSubmitted = thisRoundCount >= aliveOrder.length

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-2xl font-black text-content">{t('game.cluesTitle')}</h1>
      <p className="mt-1 text-sm text-content-muted">
        {isFullVirtual ? t('game.cluesHintTyped') : t('game.cluesHint')}
      </p>

      <div className="mt-4">
        {iAmWaiting ? (
          <div className="rounded-2xl border-2 border-dashed border-brand-400 p-6 text-center">
            <div className="text-3xl">👋</div>
            <div className="mt-1 font-bold text-content">
              {t('game.waitingNextTitle')}
            </div>
            <div className="mt-1 text-sm text-content-muted">
              {t('game.waitingNextBody')}
            </div>
          </div>
        ) : iAmEliminated ? (
          <div className="rounded-2xl border-2 border-dashed border-line p-6 text-center text-content-muted">
            {t('game.youAreEliminated')}
          </div>
        ) : (
          <WordCard secret={secret} imposterAware={imposterAware} />
        )}
      </div>

      {isFullVirtual ? (
        <>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
            {t('game.turnOrder')}
          </h2>
          <div className="mt-2">
            <TurnCircle
              order={order}
              currentTurnId={currentTurnId}
              doneIds={
                new Set(
                  clues
                    .filter((c) => c.round === round.number)
                    .map((c) => c.playerId),
                )
              }
              uid={uid}
              eliminatedIds={
                new Set(
                  round.turnOrder.filter((id) => !round.aliveIds.includes(id)),
                )
              }
              staleIds={staleIds}
            />
          </div>

          {!iAmEliminated && !iAmWaiting && !allSubmitted && (
            <div className="mt-4">
              <ClueInput
                pin={pin}
                uid={uid}
                isMyTurn={currentTurnId === uid}
                waitingFor={currentTurnId ? byId.get(currentTurnId) : undefined}
              />
            </div>
          )}

          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
            {t('game.wordsSaid')}
          </h2>
          <div className="mt-2">
            <ClueFeed clues={clues} byId={byId} currentRound={round.number} />
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
            {t('game.turnOrder')}
          </h2>
          {/* In person the app hears nothing, so the ring shows the seating and
              who begins — never a "now speaking" highlight it can't know. */}
          {turnCircle ? (
            <div className="mt-2">
              <TurnCircle
                variant="order"
                order={order}
                doneIds={EMPTY_IDS}
                uid={uid}
                eliminatedIds={
                  new Set(
                    round.turnOrder.filter((id) => !round.aliveIds.includes(id)),
                  )
                }
                staleIds={staleIds}
              />
            </div>
          ) : (
            <ol className="mt-2 flex flex-col gap-2">
              {order.map((p, i) => (
                <li key={p.id}>
                  <PlayerRow
                    player={p}
                    isYou={p.id === uid}
                    index={i + 1}
                    disconnected={staleIds.has(p.id)}
                    eliminated={!round.aliveIds.includes(p.id)}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="mt-auto pt-6">
        {isHost ? (
          <>
            {isFullVirtual && !allSubmitted && (
              <p className="mb-2 text-center text-xs text-content-muted">
                {t('game.cluesIncompleteHint')}
              </p>
            )}
            <Button size="lg" fullWidth onClick={() => openVoting(pin)}>
              {t('game.finishToVote')}
            </Button>
          </>
        ) : (
          <p className="text-center text-sm text-content-muted">
            {t('game.waitingHostVote')}
          </p>
        )}
      </div>
    </div>
  )
}

function VotingPhase({
  pin,
  round,
  byId,
  uid,
  votes,
  isHost,
  staleIds,
  isFullVirtual,
  clues,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  uid: string
  votes: Vote[]
  isHost: boolean
  staleIds: Set<string>
  isFullVirtual: boolean
  clues: Clue[]
}) {
  const { t } = useTranslation()
  const meAlive = round.aliveIds.includes(uid)
  // Joined after this game was dealt — watching, not eliminated.
  const iAmWaiting = !round.turnOrder.includes(uid)
  const myVote = votes.find((v) => v.voter === uid)?.target
  const candidates = (round.candidates ?? round.aliveIds).filter(
    (id) => id !== uid,
  )
  const allVoted = votes.length >= round.aliveIds.length
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
                {staleIds.has(id) && (
                  <span className="rounded-full bg-content-muted/10 px-2 py-0.5 text-xs font-bold text-content-muted">
                    {t('lobby.disconnected')}
                  </span>
                )}
                {selected && <span className="text-brand-600">✓</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-line p-6 text-center text-content-muted">
          {iAmWaiting ? t('game.waitingNextBody') : t('game.youAreOut')}
        </div>
      )}

      {isFullVirtual && clues.length > 0 && (
        <details className="mt-4 rounded-2xl border border-line bg-surface-raised p-3">
          <summary className="cursor-pointer text-sm font-bold text-content-muted">
            {t('game.wordsSaid')}
          </summary>
          <div className="mt-2">
            <ClueFeed clues={clues} byId={byId} currentRound={round.number} />
          </div>
        </details>
      )}

      {isHost && !allVoted && (
        <div className="mt-auto pt-6 text-center">
          <p className="mb-2 text-xs text-content-muted">
            {t('game.revealNowHint')}
          </p>
          <Button variant="secondary" fullWidth onClick={() => revealVotes(pin)}>
            {t('game.revealNow')}
          </Button>
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
  const [revealed, setRevealed] = useState(false)
  const eliminated = round.eliminatedId ? byId.get(round.eliminatedId) : null
  const wasImposter = round.eliminatedRole === 'imposter'

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 900)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {!revealed ? (
          <>
            <div className="animate-suspense-pulse text-6xl">🤔</div>
            <h1 className="text-2xl font-black text-content">
              {t('game.revealing', { name: eliminated?.name ?? '' })}
            </h1>
          </>
        ) : (
          <>
            <div
              className={
                'text-6xl ' +
                (wasImposter ? 'animate-ominous-shake' : 'animate-pop-in')
              }
            >
              {eliminated?.character ?? '❓'}
            </div>
            <h1 className="animate-pop-in text-2xl font-black text-content">
              {t('game.wasVotedOut', { name: eliminated?.name ?? '' })}
            </h1>
            <div
              className={
                'animate-pop-in rounded-2xl border-2 px-5 py-3 text-lg font-black ' +
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
          </>
        )}
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

  if (round.guessNeedsReview) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="text-2xl font-black text-content">
          {t('game.guessReviewTitle')}
        </h1>
        <p className="max-w-xs text-content-muted">
          {t('game.guessReviewHint')}
        </p>
        <div className="rounded-2xl border-2 border-line bg-surface-raised px-6 py-4 text-2xl font-black text-content">
          "{round.guessText}"
        </div>
        {isHost ? (
          <div className="mt-2 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => resolveGuessReview(pin, false)}
            >
              ✕ {t('game.guessReviewWrong')}
            </Button>
            <Button onClick={() => resolveGuessReview(pin, true)}>
              ✓ {t('game.guessReviewCorrect')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-content-muted">{t('game.waitingHost')}</p>
        )}
      </div>
    )
  }

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
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="animate-pulse text-5xl">🎯</div>
        <h1 className="text-2xl font-black text-content">
          {t('game.imposterGuessing')}
        </h1>
        {!isHost && (
          <p className="text-sm text-content-muted">{t('game.waitingHost')}</p>
        )}
      </div>

      {isHost && !amImposter && !submitted && (
        <div className="pt-6 text-center">
          <p className="mb-2 text-xs text-content-muted">
            {t('game.skipGuessHint')}
          </p>
          <Button variant="secondary" fullWidth onClick={() => skipGuess(pin)}>
            {t('game.skipGuess')}
          </Button>
        </div>
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

const CONFETTI_COLORS = ['#8b5cf6', '#f43f5e', '#fbbf24', '#34d399', '#60a5fa']

function Confetti() {
  const pieces = Array.from({ length: 24 })
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100
        const delay = ((i * 13) % 40) / 100
        const duration = 1.2 + ((i * 7) % 8) / 10
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: 0,
              width: 8,
              height: 8,
              backgroundColor: color,
              borderRadius: i % 2 === 0 ? '9999px' : '2px',
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
            }}
          />
        )
      })}
    </div>
  )
}

function RecapPhase({
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
  const breakdown = round.scoreBreakdown ?? {}

  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="relative flex flex-col items-center gap-2 pt-2 text-center">
        {crewWon && <Confetti />}
        <div
          className={
            'text-6xl ' + (crewWon ? 'animate-pop-in' : 'animate-ominous-shake')
          }
        >
          {crewWon ? '🎉' : '😈'}
        </div>
        <h1 className="animate-pop-in text-3xl font-black text-content">
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
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
          {t('game.pointsTitle')}
        </h2>
        <ul className="mt-2 flex flex-col gap-2">
          {players.map((p) => {
            const line = breakdown[p.id]
            if (!line) return null
            return (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-2xl border border-line bg-surface-raised p-3"
              >
                <span className="text-2xl">{p.character}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1 font-bold text-content">
                    {p.name}
                    {p.id === round.imposterId && <span>🕵️</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-content-muted">
                    {line.reasons.map((r, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        {t(`game.reasons.${r.key}`, r.params)}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={
                    'text-lg font-black ' +
                    (line.delta > 0 ? 'text-brand-600' : 'text-content-muted')
                  }
                >
                  +{line.delta}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <HostOrWait
        isHost={isHost}
        label={t('game.toScoreboard')}
        onClick={() => continueToScoreboard(pin)}
        waitKey="game.waitingHostNext"
      />
    </div>
  )
}

function ResultPhase({
  pin,
  players,
  isHost,
  isGuest,
}: {
  pin: string
  players: Player[]
  isHost: boolean
  isGuest: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const enoughPlayers = players.length >= MIN_PLAYERS

  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="flex-1">
        <Scoreboard players={players} />

        {/* The one moment a guest can see what an account would have kept:
            they've just finished a game that counted for nobody. A quiet line
            under the scores, not a popup — joining is meant to stay
            frictionless, and this is an offer rather than a toll. */}
        {isGuest && (
          <div className="mt-4 rounded-2xl border border-line bg-surface-raised p-4 text-center">
            <p className="text-sm text-content-muted">{t('game.guestNudge')}</p>
            <Button
              variant="ghost"
              className="mt-1 text-brand-600"
              onClick={() => navigate('/signin')}
            >
              {t('home.signIn')} →
            </Button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        {isHost ? (
          <>
            {/* Say why up front. This button used to call startGame, get
                "not enough players" back, and swallow it — so it looked
                broken, and you only learned the reason back in the lobby. */}
            {!enoughPlayers && (
              <p className="mb-2 text-center text-sm text-content-muted">
                {t('lobby.needMore', { count: MIN_PLAYERS })}
              </p>
            )}
            <Button
              size="lg"
              fullWidth
              disabled={!enoughPlayers}
              onClick={() => startGame(pin)}
            >
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
  const { user, isGuest } = useAuth()
  const { game, players, loading } = useGame(pin)
  const secret = useSecret(pin, user?.uid)
  const votes = useVotes(pin)

  const uid = user?.uid ?? ''
  const isHost = game?.hostId === uid
  const round = game?.round ?? null
  const me = players.find((p) => p.id === uid)
  const isFullVirtual = game?.mode === 'full'
  // Games created before this option existed have no field; those played the
  // classic way, so a missing value means "the imposter knows".
  const imposterAware = game?.imposterAware !== false
  // Older rooms have no such field, and those all used the numbered list.
  const turnCircle = game?.turnCircle === true
  const clues = useClues(pin, isFullVirtual)
  const [leaving, setLeaving] = useState(false)

  async function handleLeave(newHostId?: string) {
    if (user) await leaveGame(pin, user.uid, newHostId)
    navigate('/')
  }

  async function handleCloseGame() {
    await closeGame(pin)
    navigate('/')
  }

  usePresence(pin, user?.uid, game, players)
  const now = useNow()
  const staleIds = new Set(
    players.filter((p) => isStale(p.lastSeen, now, STALE_AFTER_MS)).map((p) => p.id),
  )

  const closed = useGameClosed(loading, game)

  // Follow the game back to the lobby when it ends there — or, if the host
  // closed the room, stop and say so rather than vanishing mid-round.
  useEffect(() => {
    if (loading) return
    if (!game) {
      forgetGame()
      if (!closed) navigate('/', { replace: true })
    } else if (game.status === 'lobby') {
      navigate(`/lobby/${pin}`, { replace: true })
    }
  }, [loading, game, pin, navigate, closed])

  // Kicked mid-game → forget it and bounce out to the lobby.
  //
  // `players.length > 0` is what separates a kick from the room being torn
  // down: `closeGame` deletes the players before the game document, so for a
  // moment everyone looks kicked. Without this, closing a room mid-round
  // bounced players to a lobby that had never seen the game, which then sent
  // them home with no explanation — the very thing the closed notice exists to
  // prevent. A real kick always leaves the other players behind.
  useEffect(() => {
    if (!loading && game && user && !me && players.length > 0) {
      forgetGame()
      // Home, not the lobby. While a game is running the lobby sends everyone
      // in it straight back here, so bouncing there flickered between the two
      // screens forever. They can rejoin with the PIN if they want back in.
      navigate('/', { replace: true })
    }
  }, [loading, game, user, me, players.length, pin, navigate])

  // Add this game to your own totals, once it has ended.
  //
  // Every device records its own: the rules only let a user write their own
  // `users/{uid}`, so the host can't do it for the table. Guests are skipped —
  // their identity is per-device and won't be there tomorrow — as is anyone
  // who joined mid-game and only watched, who is absent from `turnOrder`.
  const recordedRef = useRef<string | null>(null)
  useEffect(() => {
    if (isGuest || !user || !game || !round) return
    if (round.phase !== 'recap' && round.phase !== 'result') return
    if (!round.turnOrder.includes(user.uid)) return

    const key = `${pin}:${game.gameNumber ?? 1}`
    // Cheap in-memory guard against re-renders; `recordGameResult` also checks
    // Firestore, which covers a reload.
    if (recordedRef.current === key) return
    recordedRef.current = key

    const wasImposter = round.imposterId === user.uid
    recordGameResult(user.uid, {
      pin,
      gameNumber: game.gameNumber ?? 1,
      wasImposter,
      wasHost: game.hostId === user.uid,
      won:
        round.outcome === (wasImposter ? 'imposter-wins' : 'crew-wins'),
      points: round.scoreBreakdown?.[user.uid]?.delta ?? 0,
    }).catch(() => {
      // Stats are a keepsake, never a reason to interrupt the game.
      recordedRef.current = null
    })
  }, [isGuest, user, game, round, pin])

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

  // The host scores the imposter's guess once it's submitted (auto-match or
  // flag it for the host's own Correct/Wrong call — see resolveGuess).
  useEffect(() => {
    if (
      isHost &&
      round?.phase === 'guess' &&
      round.guessText != null &&
      round.guessCorrect == null &&
      !round.guessNeedsReview
    ) {
      resolveGuess(pin)
    }
  }, [
    isHost,
    round?.phase,
    round?.guessText,
    round?.guessCorrect,
    round?.guessNeedsReview,
    pin,
  ])

  // Checked before the loading state: once the room is gone there is nothing
  // left to wait for, and a spinner would be the wrong thing to show.
  if (closed) return <GameClosedScreen />

  if (loading || !game || !round) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">{t('lobby.loading')}</div>
      </div>
    )
  }

  const byId: PlayerMap = new Map(players.map((p) => [p.id, p]))

  let phaseView: React.ReactNode = null
  switch (round.phase) {
    case 'clues':
      phaseView = (
        <CluePhase
          pin={pin}
          round={round}
          byId={byId}
          uid={uid}
          secret={secret}
          isHost={isHost}
          staleIds={staleIds}
          isFullVirtual={isFullVirtual}
          clues={clues}
          imposterAware={imposterAware}
          turnCircle={turnCircle}
        />
      )
      break
    case 'voting':
      phaseView = (
        <VotingPhase
          pin={pin}
          round={round}
          byId={byId}
          uid={uid}
          votes={votes}
          isHost={isHost}
          staleIds={staleIds}
          isFullVirtual={isFullVirtual}
          clues={clues}
        />
      )
      break
    case 'tally':
      phaseView = (
        <TallyPhase pin={pin} byId={byId} votes={votes} isHost={isHost} />
      )
      break
    case 'reveal':
      phaseView = (
        <RevealPhase pin={pin} round={round} byId={byId} isHost={isHost} />
      )
      break
    case 'guess':
      phaseView = (
        <GuessPhase pin={pin} round={round} secret={secret} isHost={isHost} />
      )
      break
    case 'recap':
      phaseView = (
        <RecapPhase
          pin={pin}
          round={round}
          byId={byId}
          players={players}
          isHost={isHost}
        />
      )
      break
    case 'result':
      phaseView = (
        <ResultPhase
          pin={pin}
          players={players}
          isHost={isHost}
          isGuest={isGuest}
        />
      )
      break
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameHeaderBar pin={pin} wordSetName={game.wordSetName} />

      {phaseView}

      {/* Available in every phase: the host shouldn't have to wait for the
          round to end to remove a player whose phone died. */}
      {isHost && <HostPlayerManager pin={pin} players={players} uid={uid} />}

      <button
        type="button"
        onClick={() => setLeaving(true)}
        className="mt-3 py-1 text-center text-sm text-content-muted hover:text-content"
      >
        {t('lobby.leave')}
      </button>

      {leaving && (
        <LeaveGameDialog
          isHost={isHost}
          others={players.filter((p) => p.id !== uid)}
          onCancel={() => setLeaving(false)}
          onLeave={handleLeave}
          onClose={handleCloseGame}
        />
      )}
    </div>
  )
}

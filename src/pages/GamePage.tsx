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
  MIN_PLAYERS,
  openVoting,
  resolveGuess,
  resolveGuessReview,
  resolveVote,
  setPlayerBadge,
  skipGuess,
  applyMyScore,
  endIfTooFewAlive,
  revealVotes,
  startGame,
  submitClue,
  type WordSetHandover,
} from '../game/gameService'
import { useWordSetById } from '../game/wordSets'
import { GameClosedScreen } from '../components/GameClosedScreen'
import { GameHeaderBar } from '../components/GameHeaderBar'
import { HostGameControls } from '../components/HostGameControls'
import { HostPlayerManager } from '../components/HostPlayerManager'
import { Podium } from '../components/Podium'
import { useGameClosed } from '../game/useGameClosed'
import { recordGameResult, type GameResult } from '../game/stats'
import { colorForBadge, diffBadges, type BadgeDelta } from '../game/badges'
import { saveProfile, useProfile } from '../game/profile'
import { BadgeEarnedDialog } from '../components/BadgeEarnedDialog'
import { BadgeIcon } from '../components/BadgeIcon'
import { LeaveGameDialog } from '../components/LeaveGameDialog'
import { PlayerDepartures } from '../components/PlayerDepartures'
import { TurnCircle } from '../components/TurnCircle'
import { isStale, STALE_AFTER_MS, useNow, usePresence } from '../game/presence'
import { useBackGuard } from '../game/useBackGuard'
import { usePrefersReducedMotion } from '../lib/motion'
import { report } from '../lib/reportError'
import { holdAppReload } from '../lib/swReload'
import type {
  Clue,
  Player,
  PlayerBadge,
  Round,
  SeatName,
  Secret,
  Vote,
} from '../game/types'

type PlayerMap = Map<string, Player>

/** Stable empty set, so the ring's memoisation isn't defeated by a new one. */
const EMPTY_IDS: Set<string> = new Set()

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
          {/* On hard — and on a custom set whose author left the pair blank —
              there is no word at all. Nothing to show, and nothing to hide
              behind: the clue has to be built out of what everyone else says. */}
          {secret.word ? (
            <>
              <div className="mt-3 text-xs font-bold uppercase text-content-muted">
                {t('game.yourWord')}
              </div>
              <div dir="auto" className="text-3xl font-black text-content">
                {secret.word}
              </div>
              <div className="mt-2 text-sm text-content-muted">
                {t('game.imposterHint')}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-content-muted">
              {t('game.imposterNoWordHint')}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-xs font-bold uppercase text-content-muted">
            {t('game.yourWord')}
          </div>
          <div dir="auto" className="text-4xl font-black text-content">
            {secret.word}
          </div>
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
        dir="auto"
        className={
          'flex flex-1 items-center gap-1.5 font-bold text-content' +
          (eliminated ? ' line-through' : '')
        }
      >
        {player.name}
        {isYou && (
          <span className="ms-1 text-sm font-normal text-content-muted">
            ({t('lobby.you')})
          </span>
        )}
        {player.displayedBadge && (
          <BadgeIcon
            icon={player.displayedBadge.icon}
            color={colorForBadge(player.displayedBadge)}
            filled={1}
            size="sm"
            showStars={false}
          />
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
  seatNames,
  currentRound,
}: {
  clues: Clue[]
  byId: PlayerMap
  /**
   * The roster as dealt. A clue outlives the player who typed it — only the
   * host may delete one — so without this a word said by someone who has since
   * left showed up in the feed attributed to "—".
   */
  seatNames?: Record<string, SeatName> | null
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
                const p = byId.get(c.playerId) ?? seatNames?.[c.playerId]
                return (
                  <div
                    key={`${c.round}_${c.playerId}`}
                    className="flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2"
                  >
                    <span className="text-xl">{p?.character ?? '❓'}</span>
                    <span dir="auto" className="text-sm text-content-muted">
                      {p?.name ?? '—'}
                    </span>
                    <span dir="auto" className="ms-auto font-black text-content">
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
  seatNames,
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
  seatNames?: Record<string, SeatName> | null
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

  // Whose turn it is in full-virtual mode: the first player still in who
  // hasn't spoken this round.
  //
  // Read off *who has spoken*, never off how many clues there are. A player
  // who leaves after speaking keeps their clue — only the host may delete one
  // — while dropping out of the order, so the count ran one seat ahead and
  // silently skipped whoever came next. Two such leavers and the round could
  // look finished with two people never asked at all. `submitClue` guards the
  // same way, so the screen and the server agree.
  const aliveOrder = round.turnOrder.filter((id) => round.aliveIds.includes(id))
  const spokenThisRound = new Set(
    clues.filter((c) => c.round === round.number).map((c) => c.playerId),
  )
  const currentTurnId = aliveOrder.find((id) => !spokenThisRound.has(id))
  const allSubmitted = currentTurnId === undefined

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
              doneIds={spokenThisRound}
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
            <ClueFeed
              clues={clues}
              byId={byId}
              seatNames={seatNames}
              currentRound={round.number}
            />
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
            <Button size="lg" fullWidth onClick={() => openVoting(pin).catch(report('open the vote'))}>
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
  seatNames,
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
  seatNames?: Record<string, SeatName> | null
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
                onClick={() => castVote(pin, uid, id).catch(report('cast your vote'))}
                aria-pressed={selected}
                className={
                  'flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition-colors ' +
                  (selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-line bg-surface-raised hover:border-brand-300')
                }
              >
                <span className="text-2xl">{p.character}</span>
                <span dir="auto" className="flex-1 font-bold text-content">
                  {p.name}
                </span>
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
            <ClueFeed
              clues={clues}
              byId={byId}
              seatNames={seatNames}
              currentRound={round.number}
            />
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
                <span dir="auto" className="flex-1 font-black text-content">
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
                    dir="auto"
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
        onClick={() => resolveVote(pin).catch(report('resolve the vote'))}
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
        // Logged rather than swallowed: a Continue that quietly did nothing
        // gave a stuck game with no clue why.
        onClick={() =>
          continueAfterReveal(pin).catch((e) =>
            console.error('continueAfterReveal failed', e),
          )
        }
        waitKey="game.waitingHost"
      />
    </div>
  )
}

function GuessPhase({
  pin,
  round,
  byId,
  seatNames,
  secret,
  isHost,
  isFullVirtual,
  clues,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  seatNames?: Record<string, SeatName> | null
  secret: Secret | null
  isHost: boolean
  isFullVirtual: boolean
  clues: Clue[]
}) {
  const { t } = useTranslation()
  const [guess, setGuess] = useState('')
  const amImposter = secret?.role === 'imposter'
  const submitted = round.guessText != null
  // Reached by winning rather than by being caught, which changes what the
  // screen should say — and means nobody is waiting to find out who it was.
  const won = round.imposterWon === true

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
              onClick={() =>
                resolveGuessReview(pin, false).catch(report('judge the guess'))
              }
            >
              ✕ {t('game.guessReviewWrong')}
            </Button>
            <Button onClick={() =>
                resolveGuessReview(pin, true).catch(report('judge the guess'))
              }>
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
        <div className="text-6xl">{won ? '😈' : '🎯'}</div>
        <h1 className="mt-2 text-2xl font-black text-content">
          {won ? t('game.guessWonTitle') : t('game.guessTitle')}
        </h1>
        <p className="mt-1 text-content-muted">
          {won ? t('game.guessWonHint') : t('game.guessHint')}
        </p>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={t('game.guessPlaceholder')}
          className="mt-4 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-lg text-content outline-none focus:border-brand-500"
        />

        {/* The words everyone said, right where the guess is made. The whole
            point of typing them was that they can be read back — and this is
            the one moment they matter most. */}
        {isFullVirtual && clues.length > 0 && (
          <div className="mt-4">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
              {t('game.wordsSaid')}
            </h2>
            <div className="mt-2">
              <ClueFeed
                clues={clues}
                byId={byId}
                seatNames={seatNames}
                currentRound={round.number}
              />
            </div>
          </div>
        )}
        <div className="mt-auto pt-8">
          <Button
            size="lg"
            fullWidth
            disabled={guess.trim().length === 0}
            onClick={() =>
              castGuess(pin, guess.trim()).catch(report('submit your guess'))
            }
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
          <Button variant="secondary" fullWidth onClick={() => skipGuess(pin).catch(report('skip the guess'))}>
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
  // Live and derived only — never written anywhere. Whoever is on top right
  // now gets a flame; the moment someone else passes them, it moves. A tie at
  // the very top (including everyone tied at zero before the first game ends)
  // shows nobody, since "leading by nothing" isn't leading.
  const topScore = ranked[0]?.score ?? 0
  const leaders =
    topScore > 0 ? ranked.filter((p) => p.score === topScore) : []
  const soleLeader = leaders.length === 1 ? leaders[0].id : null

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
            <span
              dir="auto"
              className="flex flex-1 items-center gap-1.5 font-bold text-content"
            >
              {p.name}
              {p.id === soleLeader && (
                <span title={t('game.leading')} aria-label={t('game.leading')}>
                  🔥
                </span>
              )}
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
            <span className="text-lg font-black text-brand-600">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const CONFETTI_COLORS = ['#8b5cf6', '#f43f5e', '#fbbf24', '#34d399', '#60a5fa']
/** Gold, for the imposter's win — the one everybody should look up for. */
const GOLD_CONFETTI = ['#fbbf24', '#f59e0b', '#fcd34d', '#eab308', '#fde68a']

function Confetti({
  colors = CONFETTI_COLORS,
  count = 24,
}: {
  colors?: readonly string[]
  count?: number
}) {
  const pieces = Array.from({ length: count })
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100
        const delay = ((i * 13) % 40) / 100
        const duration = 1.2 + ((i * 7) % 8) / 10
        const color = colors[i % colors.length]
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

/**
 * How many ways there are to say "you got them, eventually".
 *
 * Kept in i18n as `game.caught1`…`game.caughtN`; the round number picks one,
 * so every device shows the same line and a run of games doesn't repeat it.
 */
const CAUGHT_LINES = 4

function RecapPhase({
  pin,
  round,
  byId,
  players,
  seatNames,
  isHost,
}: {
  pin: string
  round: Round
  byId: PlayerMap
  players: Player[]
  /** The roster as dealt, so a player who has since left can still be named. */
  seatNames?: Record<string, SeatName> | null
  isHost: boolean
}) {
  const { t } = useTranslation()
  const reducedMotion = usePrefersReducedMotion()
  const crewWon = round.outcome === 'crew-wins'
  // "Crew wins" is for ending it on the first vote, and nothing else. Being
  // fooled for two rounds and then getting there is catching the imposter, not
  // winning — and calling it a win made every game read the same.
  const cleanWin = crewWon && (round.imposterRounds ?? 0) === 0
  const caughtLine = `game.caught${(round.number % CAUGHT_LINES) + 1}`
  // Fall back to the dealt roster. A game that ends *because* the imposter
  // walked out has no player document left to look them up in, so this line —
  // the one thing everyone is waiting for — simply vanished, and the recap
  // said "Crew wins" and nothing else.
  const imposter = round.imposterId
    ? (byId.get(round.imposterId) ?? seatNames?.[round.imposterId] ?? null)
    : null
  const guessed = round.guessText != null
  const breakdown = round.scoreBreakdown ?? {}

  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="relative flex flex-col items-center gap-2 pt-2 text-center">
        {/* The two endings are not the same size of moment.

            Catching the imposter is the table doing its job — a tick and a
            line. Getting away with it is one person fooling everybody at once,
            which happens rarely and deserves the whole screen: gold, their
            name on a plaque, and how long they held it. */}
        {!crewWon && !reducedMotion && (
          <Confetti colors={GOLD_CONFETTI} count={36} />
        )}
        <div className={'animate-pop-in ' + (crewWon ? 'text-5xl' : 'text-7xl')}>
          {cleanWin ? '✅' : crewWon ? '🕵️' : '👑'}
        </div>
        <h1
          className={
            'animate-pop-in font-black ' +
            (crewWon ? 'text-2xl text-content' : 'text-4xl text-sunny-500')
          }
        >
          {crewWon
            ? cleanWin
              ? t('game.crewWins')
              : t(caughtLine)
            : t('game.imposterWins')}
        </h1>

        {/* Won: the imposter's name is the headline, on a plaque of its own. */}
        {!crewWon && imposter && (
          <div className="animate-pop-in mt-1 rounded-2xl border-2 border-sunny-400 bg-sunny-400/10 px-6 py-3">
            <div className="text-4xl">{imposter.character}</div>
            <div dir="auto" className="text-xl font-black text-content">
              {imposter.name}
            </div>
            <div className="mt-0.5 text-xs text-content-muted">
              {t('game.imposterHonour', { count: round.imposterRounds ?? 0 })}
            </div>
          </div>
        )}

        {/* Caught: they are named in passing, which is all it is. */}
        {crewWon && imposter && (
          <p className="text-content-muted">
            {t('game.theImposterWas')}{' '}
            <span dir="auto" className="font-black text-content">
              {imposter.character} {imposter.name}
            </span>
          </p>
        )}
        {round.mainWord && (
          <p className="text-content-muted">
            {t('game.theWordWas')}{' '}
            <span dir="auto" className="font-black text-content">
              {round.mainWord}
            </span>
          </p>
        )}
        {guessed && (
          <p
            className={
              'rounded-full px-3 py-1 text-sm font-bold ' +
              // Green. It was showing the app's error colour for the one
              // thing on the screen that had gone right for the imposter.
              (round.guessCorrect
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
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
                  <div
                    dir="auto"
                    className="flex items-center gap-1.5 font-bold text-content"
                  >
                    {p.name}
                    {p.id === round.imposterId && <span>🕵️</span>}
                    {p.displayedBadge && (
                      <BadgeIcon
                        icon={p.displayedBadge.icon}
                        color={colorForBadge(p.displayedBadge)}
                        filled={1}
                        size="sm"
                        showStars={false}
                      />
                    )}
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
        onClick={() =>
          continueToScoreboard(pin).catch(report('show the scoreboard'))
        }
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
  const enoughPlayers = players.length >= MIN_PLAYERS

  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="flex-1">
        <Scoreboard players={players} />

        {/* The one moment a guest can see what an account would have kept:
            they've just finished a game that counted for nobody. A quiet line
            under the scores, not a popup — joining is meant to stay
            frictionless, and this is an offer rather than a toll.

            Deliberately not a button. Signing in mints a *new* Firebase user,
            so the uid changes and the guest stops matching the player document
            they are sitting in — leaving a ghost in the room that the next
            deal happily includes, and that can be dealt the imposter card,
            making the imposter someone nobody can vote for. This was the only
            way into sign-in from inside a room, so saying it in words instead
            of offering the tap closes that off entirely. Anyone who wants an
            account can leave the room first, which already cleans up properly. */}
        {isGuest && (
          <div className="mt-4 rounded-2xl border border-line bg-surface-raised p-4 text-center">
            <p className="text-sm text-content-muted">{t('game.guestNudge')}</p>
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
              onClick={() => startGame(pin).catch(report('start the next game'))}
            >
              {t('game.nextGame')}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => backToLobby(pin).catch(report('return to the lobby'))}
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

  // A deploy claims every open page at once and reloads it. That is fine on
  // the home screen and awful here — mid-reveal, mid-vote, card in hand — so
  // the new version waits until this screen is behind us.
  useEffect(() => holdAppReload(), [])

  // Only to learn whether the set in play is this host's own, which decides
  // whether leaving has to ask what becomes of it.
  const activeSet = useWordSetById(isHost ? game?.wordSetId : null)
  const myWordSet = activeSet?.ownerId === uid ? activeSet : null

  // Only for the account's saved badge choice. `recordGameResult` returns the
  // totals either side of its own write, so the badge diff no longer needs a
  // "before" snapshot from here.
  const { profile, loading: profileLoading } = useProfile(user?.uid, isGuest)
  const [badgeDeltas, setBadgeDeltas] = useState<BadgeDelta[] | null>(null)
  // Which badge this player is showing, tracked locally because `useProfile`
  // loads once and never refreshes — without it, picking a badge from the
  // announcement would leave the dialog still offering the one just chosen.
  const [activeBadgeKey, setActiveBadgeKey] = useState<string | null>(null)
  useEffect(() => {
    if (!profileLoading) setActiveBadgeKey(profile?.displayedBadge?.key ?? null)
  }, [profile, profileLoading])

  // Updates the account's saved default (so future rooms start with it already
  // showing) and this room's player document (so it shows here immediately,
  // without waiting for a rejoin).
  async function handleSetActiveBadge(badge: PlayerBadge) {
    if (!user) return
    setActiveBadgeKey(badge.key)
    await saveProfile(user.uid, { displayedBadge: badge }).catch(() => {})
    await setPlayerBadge(pin, user.uid, badge).catch(() => {})
  }

  async function handleLeave(newHostId?: string, wordSet?: WordSetHandover) {
    if (user) await leaveGame(pin, user.uid, newHostId, wordSet)
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

  // Back has nowhere sensible to go from a running game: every screen behind
  // this one notices you're still in it and sends you straight back, so the
  // button reads as broken. Ask about leaving instead — the only real way out
  // — and let a second press close that question again. Once the room itself
  // is gone there is nothing to leave, so Back goes back.
  useBackGuard(!closed, () => setLeaving((open) => !open))

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
    // 'finished' deliberately stays put: the podium is shown right here rather
    // than bouncing everyone somewhere else the moment the evening ends.
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
    const voteHistory = round.voteHistory ?? []
    const survived = round.aliveIds.includes(user.uid)
    const votedFor = voteHistory.some((v) => v.target === user.uid)
    const caught = wasImposter && round.outcome === 'crew-wins'
    const result: GameResult = {
      pin,
      gameNumber: game.gameNumber ?? 1,
      wasImposter,
      wasHost: game.hostId === user.uid,
      won: round.outcome === (wasImposter ? 'imposter-wins' : 'crew-wins'),
      points: round.scoreBreakdown?.[user.uid]?.delta ?? 0,
      playerCount: (game.seatOrder ?? round.turnOrder).length,
      roundCount: round.number,
      mode: game.mode,
      scoring: game.scoring,
      guess: game.guess,
      customSet: Boolean(game.wordSetId),
      survived,
      // Every round you held the card and the vote went elsewhere. Getting
      // caught costs you the round you were caught in; getting away with it
      // to the end means all of them.
      imposterRoundsSurvived: wasImposter
        ? Math.max(0, round.number - (caught ? 1 : 0))
        : 0,
      correctImposterVotes: voteHistory.filter(
        (v) => v.voter === user.uid && v.target === round.imposterId,
      ).length,
      neverVotedFor: voteHistory.length > 0 && !votedFor,
      caughtRound1:
        round.number === 1 &&
        round.outcome === 'crew-wins' &&
        round.eliminatedRole === 'imposter',
      guessedRightAsImposter: caught && round.guessCorrect === true,
      // Suspected and still standing — true for crew and imposter alike.
      houdini: votedFor && survived,
      unanimousCatch: round.eliminationUnanimous === true,
    }

    recordGameResult(user.uid, result)
      .then((written) => {
        // Null means this game was already counted, so nothing was earned now.
        if (!written) return
        const deltas = diffBadges(written.before, written.after)
        if (deltas.length > 0) setBadgeDeltas(deltas)
      })
      .catch(() => {
        // Stats are a keepsake, never a reason to interrupt the game.
        recordedRef.current = null
      })
  }, [isGuest, user, game, round, pin])

  // End the game once the table is down to two, or once the imposter has left
  // — people walking out can reach the final two just as an elimination can.
  //
  // In practice this is the host's job: deciding either of those means reading
  // who holds the imposter's card, and only the host may. Other devices call
  // it, find they cannot see, and stop (see `endIfTooFewAlive`).
  //
  // The signature is a cost guard, not a correctness one. `someoneGone` stays
  // true for the rest of the game once anybody leaves, so this fired on every
  // snapshot — and with a heartbeat per player every eight seconds, that meant
  // 2 + N Firestore reads several times a second against a 50k/day free quota.
  // Now it runs only when something it actually looks at has changed.
  const lastCheck = useRef('')
  useEffect(() => {
    if (!me || !round || !game) return
    // Mirrors the guard in `endIfTooFewAlive`: only between rounds' work, never
    // during tally/reveal/guess, which resolve their own endings.
    if (round.phase !== 'clues' && round.phase !== 'voting') return
    // Compared against the *dealt* seating, not the live turn order.
    //
    // This is what made the imposter-leaving case fail at random. When the
    // leaver's cleanup succeeded, it trimmed `turnOrder` to match the player
    // list — so "someone gone" read as false, and with three still alive the
    // check returned before ever asking whether the imposter was among them.
    // It only worked when the cleanup had *failed* and left the lists ragged.
    // `seatOrder` is written once when the game is dealt and never shrinks, so
    // it is a truthful record of how many started.
    const dealtCount = game.seatOrder?.length ?? round.turnOrder.length
    const someoneGone = players.length < dealtCount
    if (round.aliveIds.length > 2 && !someoneGone) return

    const signature = `${round.phase}:${round.number}:${round.aliveIds.length}:${players.length}`
    if (lastCheck.current === signature) return
    lastCheck.current = signature

    // Several devices may reach this at once; the writes are identical, so the
    // duplicates are harmless.
    endIfTooFewAlive(pin).catch((e) =>
      console.error('endIfTooFewAlive failed', e),
    )
  }, [me, game, round, players.length, pin])

  // Once a game is over, pay yourself the points it awarded. Each device does
  // its own, because writing another player's document is host-only and
  // finalising is no longer the host's job alone.
  useEffect(() => {
    if (!me || !user || !game || !round) return
    if (round.phase !== 'recap' && round.phase !== 'result') return
    const line = round.scoreBreakdown?.[user.uid]
    if (!line) return
    const iWon =
      round.outcome ===
      (round.imposterId === user.uid ? 'imposter-wins' : 'crew-wins')
    applyMyScore(pin, user.uid, game.gameNumber ?? 1, line.delta, iWon).catch(
      (e) => console.error('applyMyScore failed', e),
    )
  }, [me, user, game, round, pin])

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

  if (!loading && game?.status === 'finished') {
    return (
      <div className="flex flex-1 flex-col pb-4">
        <Podium players={players} />
      </div>
    )
  }

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
          seatNames={game.seatNames}
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
          seatNames={game.seatNames}
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
        <GuessPhase
          pin={pin}
          round={round}
          byId={byId}
          seatNames={game.seatNames}
          secret={secret}
          isHost={isHost}
          isFullVirtual={isFullVirtual}
          clues={clues}
        />
      )
      break
    case 'recap':
      phaseView = (
        <RecapPhase
          pin={pin}
          round={round}
          byId={byId}
          players={players}
          seatNames={game.seatNames}
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
      <PlayerDepartures players={players} active={!closed} selfId={uid} />

      <GameHeaderBar pin={pin} wordSetName={game.wordSetName} />

      {phaseView}

      {/* Available in every phase: the host shouldn't have to wait for the
          round to end to remove a player whose phone died. */}
      {isHost && <HostPlayerManager pin={pin} players={players} uid={uid} />}
      {isHost && <HostGameControls pin={pin} />}

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
          myWordSet={myWordSet}
          midGame={game?.status === 'playing'}
          onCancel={() => setLeaving(false)}
          onLeave={handleLeave}
          onClose={handleCloseGame}
        />
      )}

      {badgeDeltas && (
        <BadgeEarnedDialog
          deltas={badgeDeltas}
          activeKey={activeBadgeKey}
          onSetActive={handleSetActiveBadge}
          onDismiss={() => setBadgeDeltas(null)}
        />
      )}
    </div>
  )
}

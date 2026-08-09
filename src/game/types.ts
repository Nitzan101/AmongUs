import type { Timestamp } from 'firebase/firestore'
import type { Difficulty } from '../words'
import type { Language } from '../i18n'

export type GameMode = 'half' | 'full'
export type Scoring = 'teamRace' | 'survivors' | 'detective'
export type GuessRule = 'final' | 'steal' | 'off'
export type GameStatus = 'lobby' | 'playing' | 'ended'

/** The phase within an active game. */
export type RoundPhase =
  | 'clues'
  | 'voting'
  | 'tally'
  | 'reveal'
  | 'guess'
  | 'recap'
  | 'result'

/** Which vote within a round: the first vote, or a revote after a tie. */
export type VotingRound = 'first' | 'revote'

/** How a finished game ended. */
export type Outcome = 'crew-wins' | 'imposter-wins'

/** The choices the host makes when creating a game. */
export interface GameOptions {
  language: Language
  mode: GameMode
  difficulty: Difficulty
  scoring: Scoring
  guess: GuessRule
  /**
   * A custom word set to deal from. When absent the built-in bank is used,
   * and `difficulty` applies; custom sets carry their own pairings instead.
   */
  wordSetId?: string | null
  /**
   * In-person games only: draw the turn order as the ring the online mode
   * uses, instead of the numbered list. Purely how the order is displayed —
   * the app still can't tell who has spoken aloud, so the ring shows the
   * seating and who begins, and nothing else.
   *
   * Optional; a missing value means the list, which is what every game before
   * this option used.
   */
  turnCircle?: boolean
  /**
   * Whether the imposter is told they're the imposter.
   *
   * Default (`true`) is the classic game: the imposter knows, and plays a
   * deliberate bluff. When `false` nobody is told anything — the imposter
   * gives clues sincerely, unaware their word is the odd one out, and the
   * fun is watching them work it out. The deal is identical either way; only
   * the card changes.
   *
   * Optional because games created before this option existed have no such
   * field; treat a missing value as `true`.
   */
  imposterAware?: boolean
}

/** The state of the current round within an active game. */
export interface Round {
  number: number
  phase: RoundPhase
  /** Circular clue-giving order for this game (player uids). */
  turnOrder: string[]
  /** Players still in the game this round (player uids). */
  aliveIds: string[]
  /** First vote or a post-tie revote. */
  votingRound?: VotingRound | null
  /** Who may be voted for this sub-round (tied players on a revote). */
  candidates?: string[] | null
  /** Set when a player is eliminated, for the reveal screen. */
  eliminatedId?: string | null
  eliminatedRole?: 'crew' | 'imposter' | null
  /** Every vote cast this game, accumulated for the Detective scoring bonus. */
  voteHistory?: Vote[]
  /** The caught imposter's typed guess at the main word (guess phase). */
  guessText?: string | null
  guessCorrect?: boolean | null
  /** True once a guess didn't auto-match and needs the host's Correct/Wrong call. */
  guessNeedsReview?: boolean | null
  /** Set when the game ends. */
  outcome?: Outcome | null
  /** The imposter, revealed only once the game is over. */
  imposterId?: string | null
  /** The real word, revealed only once the game is over. */
  mainWord?: string | null
  /** This game's point breakdown, shown on the recap screen before the scoreboard. */
  scoreBreakdown?: Record<string, ScoreLineItem> | null
}

/** A short, translatable explanation for part of a score change. */
export interface ScoreReason {
  /** Looked up as `game.reasons.<key>`. */
  key: string
  params?: Record<string, number>
}

/** One player's point change for a single finished game. */
export interface ScoreLineItem {
  delta: number
  reasons: ScoreReason[]
}

/**
 * One typed clue word in full-virtual mode (stored at games/{pin}/clues/{id},
 * where id is `r{round}_{playerId}` so each player has one clue per round).
 */
export interface Clue {
  playerId: string
  word: string
  round: number
  /** Position in the round's clue sequence, for stable ordering. */
  index: number
}

/** A single cast vote (stored at games/{pin}/votes/{voterId}). */
export interface Vote {
  voter: string
  target: string
}

/** A game room document (stored at games/{pin}). */
export interface Game extends GameOptions {
  pin: string
  hostId: string
  status: GameStatus
  /** Persistent seating order, set on first start and reused for rotation. */
  seatOrder?: string[]
  /** Which game number this is in the room (rotates turn order, drives scoring). */
  gameNumber?: number
  round?: Round
}

/** A player in a game (stored at games/{pin}/players/{uid}). */
export interface Player {
  id: string
  name: string
  character: string
  isHost: boolean
  score: number
  /** Updated periodically while the app is open; drives the "disconnected" tag. */
  lastSeen?: Timestamp | null
}

/**
 * A player's secret assignment (stored at games/{pin}/secrets/{uid}).
 * Kept in a per-player doc so only its owner can read it (enforced by
 * security rules in a later milestone; hidden by the UI until then).
 */
export interface Secret {
  role: 'crew' | 'imposter'
  word: string
}

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
  /** Set when the game ends. */
  outcome?: Outcome | null
  /** The imposter, revealed only once the game is over. */
  imposterId?: string | null
  /** The real word, revealed only once the game is over. */
  mainWord?: string | null
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

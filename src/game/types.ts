import type { Difficulty } from '../words'
import type { Language } from '../i18n'

export type GameMode = 'half' | 'full'
export type Scoring = 'teamRace' | 'survivors' | 'detective'
export type GuessRule = 'final' | 'steal' | 'off'
export type GameStatus = 'lobby' | 'playing' | 'ended'

/** The phase within an active game. */
export type RoundPhase = 'clues' | 'voting' | 'tally' | 'result'

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

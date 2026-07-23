import type { Difficulty } from '../words'
import type { Language } from '../i18n'

export type GameMode = 'half' | 'full'
export type Scoring = 'teamRace' | 'survivors' | 'detective'
export type GuessRule = 'final' | 'steal' | 'off'
export type GameStatus = 'lobby' | 'playing' | 'ended'

/** The choices the host makes when creating a game. */
export interface GameOptions {
  language: Language
  mode: GameMode
  difficulty: Difficulty
  scoring: Scoring
  guess: GuessRule
}

/** A game room document (stored at games/{pin}). */
export interface Game extends GameOptions {
  pin: string
  hostId: string
  status: GameStatus
}

/** A player in a game (stored at games/{pin}/players/{uid}). */
export interface Player {
  id: string
  name: string
  character: string
  isHost: boolean
  score: number
}

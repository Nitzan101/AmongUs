import { pickWords, type Difficulty } from '../words'
import type { Language } from '../i18n'
import type { Secret } from './types'
import { pickWordsFromSet, type WordSetEntry } from './wordSets'

export interface Assignment {
  seatOrder: string[]
  gameNumber: number
  turnOrder: string[]
  imposterId: string
  secrets: Record<string, Secret>
}

/** Rotate an array left by k (negative and large k are handled). */
export function rotate<T>(arr: T[], k: number): T[] {
  const n = arr.length
  if (n === 0) return arr
  const s = ((k % n) + n) % n
  return arr.slice(s).concat(arr.slice(0, s))
}

/**
 * Bring the stored seating in line with who is actually in the room.
 *
 * A room hosts many games and `seatOrder` persists between them so the
 * rotation means something. But nothing kept it in step with the player list:
 * `removeFromRound` only edits `round.*`, so from the second game on, anyone
 * who joined in between held a word without ever getting a turn (and could not
 * be voted for), while anyone who left still occupied a seat the game waited on
 * and the others could vote for.
 *
 * Players who were here keep their relative order — that is the whole point of
 * a stable seating — leavers drop out, and newcomers take the last seats, the
 * way someone joining a table would.
 */
export function reconcileSeatOrder(
  previous: string[] | undefined,
  playerIds: string[],
): string[] {
  const present = new Set(playerIds)
  const kept = (previous ?? []).filter((id) => present.has(id))
  const seated = new Set(kept)
  return [...kept, ...playerIds.filter((id) => !seated.has(id))]
}

/**
 * Build a game's role/word assignment. Pure (aside from randomness) so it can
 * be reasoned about and tested without Firestore.
 * - Turn order rotates one seat per game (game 1 starts at seat 0, game 2 at 1…).
 * - One random imposter gets the confusing word; everyone else gets the main word.
 * - Words come from a custom set when `setEntries` is given, otherwise from the
 *   built-in bank at the chosen difficulty.
 */
export function buildAssignment(
  playerIds: string[],
  opts: {
    language: Language
    difficulty: Difficulty
    seatOrder?: string[]
    prevGameNumber?: number
    setEntries?: WordSetEntry[]
  },
): Assignment {
  const seatOrder = reconcileSeatOrder(opts.seatOrder, playerIds)
  const gameNumber = (opts.prevGameNumber ?? 0) + 1
  const startIndex = (gameNumber - 1) % seatOrder.length
  const turnOrder = rotate(seatOrder, startIndex)

  const imposterId = playerIds[Math.floor(Math.random() * playerIds.length)]
  const { main, confusing } =
    opts.setEntries && opts.setEntries.length > 0
      ? pickWordsFromSet(opts.setEntries)
      : pickWords(opts.language, opts.difficulty)

  const secrets: Record<string, Secret> = {}
  for (const id of playerIds) {
    secrets[id] =
      id === imposterId
        ? { role: 'imposter', word: confusing }
        : { role: 'crew', word: main }
  }

  return { seatOrder, gameNumber, turnOrder, imposterId, secrets }
}

import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Profile } from './profile'

/**
 * An account's running totals across every game it has played (stored under
 * `users/{uid}.stats`).
 *
 * **Each player records their own.** The security rules only let a user write
 * their own `users/{uid}` document, so the host — who resolves everything else
 * about the ending — cannot do this on everyone's behalf. Every device writes
 * its own line when it sees the game end.
 *
 * Account holders only: a guest's identity is per-device and disappears, so
 * there is nothing worth accumulating against it.
 */
export interface Stats {
  played: number
  won: number
  asImposter: number
  imposterWins: number
  hosted: number
  /** Cumulative points, for an average per game. */
  points: number
  firstPlayedAt?: Timestamp | null
  /**
   * `pin:gameNumber` of the last game counted. Reopening a finished game — a
   * reload, a re-render, coming back to the recap — must not count it twice,
   * and this pair is unique per game within a room.
   */
  lastGame?: string
}

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  asImposter: 0,
  imposterWins: 0,
  hosted: 0,
  points: 0,
}

/** One finished game, from the perspective of the player recording it. */
export interface GameResult {
  pin: string
  gameNumber: number
  wasImposter: boolean
  wasHost: boolean
  won: boolean
  points: number
}

/**
 * Add a finished game to this account's totals, unless it's already counted.
 * Returns whether anything was written, which is what the tests assert on.
 */
export async function recordGameResult(
  uid: string,
  result: GameResult,
): Promise<boolean> {
  if (!db) return false
  const key = `${result.pin}:${result.gameNumber}`
  const ref = doc(db, 'users', uid)

  const snap = await getDoc(ref)
  const existing = (snap.data() as Profile | undefined)?.stats
  if (existing?.lastGame === key) return false

  await setDoc(
    ref,
    {
      stats: {
        played: increment(1),
        won: increment(result.won ? 1 : 0),
        asImposter: increment(result.wasImposter ? 1 : 0),
        imposterWins: increment(result.wasImposter && result.won ? 1 : 0),
        hosted: increment(result.wasHost ? 1 : 0),
        points: increment(result.points),
        lastGame: key,
        // Set once, so "playing for a year" has something to measure from.
        ...(existing?.firstPlayedAt ? {} : { firstPlayedAt: serverTimestamp() }),
      },
    },
    { merge: true },
  )
  return true
}

/** A milestone, shown earned or still to come. */
export interface Badge {
  /** Looked up as `stats.badges.<key>`. */
  key: string
  emoji: string
  earned: boolean
  /** How far along, for the ones that are counted. */
  have: number
  need: number
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Milestones derived from the totals rather than stored, so the thresholds can
 * change without migrating anyone's data — and nobody can end up holding a
 * badge the numbers no longer support.
 */
export function badgesFor(stats: Stats, now = Date.now()): Badge[] {
  const startedMs = stats.firstPlayedAt?.toMillis?.()
  const aYearIn = startedMs != null && now - startedMs >= YEAR_MS

  const counted = (key: string, emoji: string, have: number, need: number) => ({
    key,
    emoji,
    have: Math.min(have, need),
    need,
    earned: have >= need,
  })

  return [
    counted('firstGame', '🎲', stats.played, 1),
    counted('played10', '🔟', stats.played, 10),
    counted('won5', '🏆', stats.won, 5),
    counted('hosted3', '👑', stats.hosted, 3),
    counted('imposter5', '🕵️', stats.asImposter, 5),
    counted('imposterWins3', '🎭', stats.imposterWins, 3),
    { key: 'oneYear', emoji: '🎂', earned: aYearIn, have: aYearIn ? 1 : 0, need: 1 },
  ]
}

/** Average points per game, to one decimal; 0 before anything is played. */
export function averagePoints(stats: Stats): number {
  if (stats.played === 0) return 0
  return Math.round((stats.points / stats.played) * 10) / 10
}

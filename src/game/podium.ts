import type { Player } from './types'

/**
 * Order the table for the podium.
 *
 * Points first, obviously. Level on points, the player who *won* more games
 * goes higher — a tie on the scoreboard is best broken by how often you were
 * on the winning side, which is the nearest thing to "who played better".
 *
 * Still level, the order is settled by comparing player ids. That is
 * arbitrary, which is the point: nothing left distinguishes them, and
 * something arbitrary but *stable* beats a random pick that would reshuffle
 * the medals on every render — and on every other player's screen.
 */
export function rankPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      b.score - a.score ||
      (b.wins ?? 0) - (a.wins ?? 0) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

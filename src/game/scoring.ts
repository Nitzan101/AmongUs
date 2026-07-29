import type { GuessRule, Outcome, Scoring, Vote } from './types'

export interface ScoreInput {
  preset: Scoring
  /** All players who started this game (N). */
  playerIds: string[]
  imposterId: string
  outcome: Outcome
  /** Players still in the game at the end. */
  aliveIds: string[]
  guessRule: GuessRule
  /** Whether the caught imposter guessed the word (only relevant on a crew win). */
  guessCorrect: boolean
  /** Every vote cast this game (for the Detective bonus). */
  voteHistory: Vote[]
}

/**
 * Score one finished game. Returns each player's points for this game.
 *
 * Let N = players, V = N − 2 (max crew that can be wrongly eliminated before the
 * imposter auto-wins at the final two), and c = crew wrongly eliminated.
 * - Imposter: 2·c per vote survived, +2 for reaching the final two.
 * - Team Race: every crew member (even eliminated ones) gets V − c on a crew win.
 * - Survivors: only crew still alive on a crew win get +3.
 * - Detective: Team Race, plus +1 per vote a player cast for the true imposter.
 * Guess (crew win only): Final Guess → imposter +2; Steal the Win → crew zeroed,
 * imposter +3.
 */
export function computeScores(input: ScoreInput): Record<string, number> {
  const {
    preset,
    playerIds,
    imposterId,
    outcome,
    aliveIds,
    guessRule,
    guessCorrect,
    voteHistory,
  } = input

  const n = playerIds.length
  const vMax = n - 2
  const crewWins = outcome === 'crew-wins'
  const crewEliminated = n - aliveIds.length - (crewWins ? 1 : 0)
  const crewIds = playerIds.filter((id) => id !== imposterId)

  const scores: Record<string, number> = {}
  playerIds.forEach((id) => (scores[id] = 0))

  // Imposter's survival points.
  scores[imposterId] = 2 * crewEliminated + (crewWins ? 0 : 2)

  // Crew base points by preset.
  const teamRaceCrew = crewWins ? vMax - crewEliminated : 0
  if (preset === 'survivors') {
    if (crewWins) {
      crewIds
        .filter((id) => aliveIds.includes(id))
        .forEach((id) => (scores[id] += 3))
    }
  } else {
    // teamRace and detective share the Team Race base.
    crewIds.forEach((id) => (scores[id] += teamRaceCrew))
  }

  // Detective: reward voting for the true imposter.
  if (preset === 'detective') {
    for (const v of voteHistory) {
      if (v.target === imposterId && scores[v.voter] != null) {
        scores[v.voter] += 1
      }
    }
  }

  // Caught-imposter guess.
  if (crewWins && guessRule !== 'off' && guessCorrect) {
    if (guessRule === 'final') {
      scores[imposterId] += 2
    } else if (guessRule === 'steal') {
      crewIds.forEach((id) => (scores[id] = 0))
      scores[imposterId] += 3
    }
  }

  return scores
}

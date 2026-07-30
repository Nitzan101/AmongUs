import type { GuessRule, Outcome, ScoreLineItem, Scoring, Vote } from './types'

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
 * Score one finished game. Returns each player's points *and* a short,
 * translatable explanation of where they came from (shown on the recap
 * screen before the cumulative scoreboard).
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
export function computeScores(input: ScoreInput): Record<string, ScoreLineItem> {
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

  const lines: Record<string, ScoreLineItem> = {}
  playerIds.forEach((id) => (lines[id] = { delta: 0, reasons: [] }))

  // Imposter's survival points.
  if (crewEliminated > 0) {
    lines[imposterId].delta += 2 * crewEliminated
    lines[imposterId].reasons.push({
      key: 'survivedVotes',
      params: { count: crewEliminated },
    })
  }
  if (!crewWins) {
    lines[imposterId].delta += 2
    lines[imposterId].reasons.push({ key: 'imposterEscaped' })
  } else if (crewEliminated === 0) {
    lines[imposterId].reasons.push({ key: 'caughtImmediately' })
  }

  // Crew base points by preset.
  const teamRaceCrew = crewWins ? vMax - crewEliminated : 0
  if (preset === 'survivors') {
    crewIds.forEach((id) => {
      if (crewWins && aliveIds.includes(id)) {
        lines[id].delta += 3
        lines[id].reasons.push({ key: 'survivedToTheCatch' })
      } else if (crewWins) {
        lines[id].reasons.push({ key: 'eliminatedBeforeCatch' })
      } else {
        lines[id].reasons.push({ key: 'imposterGotAway' })
      }
    })
  } else {
    crewIds.forEach((id) => {
      if (crewWins) {
        lines[id].delta += teamRaceCrew
        lines[id].reasons.push({ key: 'teamRaceBonus' })
      } else {
        lines[id].reasons.push({ key: 'imposterGotAway' })
      }
    })
  }

  // Detective: reward voting for the true imposter.
  if (preset === 'detective') {
    const correctVotesByVoter: Record<string, number> = {}
    for (const v of voteHistory) {
      if (v.target === imposterId) {
        correctVotesByVoter[v.voter] = (correctVotesByVoter[v.voter] ?? 0) + 1
      }
    }
    for (const [voter, count] of Object.entries(correctVotesByVoter)) {
      if (lines[voter]) {
        lines[voter].delta += count
        lines[voter].reasons.push({ key: 'detectiveBonus', params: { count } })
      }
    }
  }

  // Caught-imposter guess.
  if (crewWins && guessRule !== 'off' && guessCorrect) {
    if (guessRule === 'final') {
      lines[imposterId].delta += 2
      lines[imposterId].reasons.push({ key: 'guessBonus' })
    } else if (guessRule === 'steal') {
      crewIds.forEach((id) => {
        lines[id].delta = 0
        lines[id].reasons = [{ key: 'guessStolen' }]
      })
      lines[imposterId].delta += 3
      lines[imposterId].reasons.push({ key: 'guessSteal' })
    }
  }

  return lines
}

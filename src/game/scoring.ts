import type { GuessRule, Outcome, ScoreLineItem, Scoring, Vote } from './types'

/**
 * Every number the scoring is made of, in one place.
 *
 * The crew were paid far too much and too easily, so they now score for one
 * thing per style, worth one point, instead of a handful every game. The
 * imposter is paid for lasting: the rounds they were not voted out in.
 *
 * Deliberately small and few. An earlier version paid the imposter for every
 * vote they sent the wrong way as well, which read as a pile of bonuses
 * stacking up and made a long game worth ten ordinary ones. Being hard to
 * catch is the whole job, and surviving a round already measures it.
 */
export const POINTS = {
  /** Team Race and Detective: the imposter, per round they survived uncaught. */
  imposterPerRound: 3,
  /** Survivors: the imposter, per crew member voted out along the way. */
  imposterPerCrewLost: 3,
  /** Team Race: each crew member, and only on a first-vote catch. */
  crewInstantCatch: 1,
  /** Survivors: each crew member still standing when the imposter falls. */
  survivorBonus: 1,
  /** Detective: per vote this player cast at the true imposter. */
  detectivePerVote: 1,
  /** A correct guess at the real word. */
  guessBonus: 2,
  /** Steal the Win: what a caught imposter takes, having zeroed the crew. */
  guessSteal: 4,
} as const

export interface ScoreInput {
  preset: Scoring
  /** All players who started this game (N). */
  playerIds: string[]
  imposterId: string
  outcome: Outcome
  /** Players still in the game at the end. */
  aliveIds: string[]
  guessRule: GuessRule
  /** Whether the imposter guessed the real word, when they were offered one. */
  guessCorrect: boolean
  /** Every vote cast this game — the Detective bonus and misdirection pay. */
  voteHistory: Vote[]
  /**
   * Rounds the imposter got through without being voted out — the whole of
   * their score under Team Race and Detective. Zero when caught on the first
   * vote, and zero when the game ended because they walked out.
   */
  roundsSurvived: number
  /** Crew members voted out along the way. Zero for an imposter who walked out. */
  crewEliminated: number
}

/**
 * Score one finished game. Returns each player's points *and* a short,
 * translatable explanation of where they came from (shown on the recap
 * screen before the cumulative scoreboard).
 *
 * **Every preset scores both sides on the same theme.** The presets used to
 * change only how the crew scored, which meant the imposter earned the same in
 * all three while the crew earned more and more — so the preset that was
 * kindest to the crew was quietly the worst one to be dealt the card in.
 *
 * - **Team Race** — speed. Crew score only for ending it on the first vote;
 *   the imposter scores for every round they draw it out.
 * - **Survivors** — attrition. Crew score for still being in the game when the
 *   imposter falls; the imposter scores for every crew member who doesn't.
 * - **Detective** — accuracy. Crew score per vote they cast at the real
 *   imposter; the imposter still scores by the round.
 *
 * A correct guess at the real word pays on top, whoever won.
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
    roundsSurvived,
    crewEliminated,
  } = input

  const crewWins = outcome === 'crew-wins'
  /** Caught on the very first vote — what Team Race pays the crew for. */
  const instantCatch = crewWins && roundsSurvived === 0
  const crewIds = playerIds.filter((id) => id !== imposterId)

  const lines: Record<string, ScoreLineItem> = {}
  playerIds.forEach((id) => (lines[id] = { delta: 0, reasons: [] }))

  /**
   * The imposter's line — which is not simply `lines[imposterId]`.
   *
   * They may not be among the players being scored at all. `endIfTooFewAlive`
   * trims the round to whoever is still present and *then* finalises naming
   * the person who just left, so the id it passes is deliberately absent from
   * that list. And when nobody can be identified — `findImposter` coming back
   * empty because the secrets weren't readable — the id is the empty string.
   * Both used to index straight into `lines` and throw a TypeError, which,
   * from inside `finalizeGame`, meant the game never ended at all.
   */
  let imposterLine: ScoreLineItem | null = null
  if (imposterId) {
    if (!(imposterId in lines)) lines[imposterId] = { delta: 0, reasons: [] }
    imposterLine = lines[imposterId]
  }

  if (imposterLine) {
    if (preset !== 'survivors' && roundsSurvived > 0) {
      imposterLine.delta += POINTS.imposterPerRound * roundsSurvived
      imposterLine.reasons.push({
        key: 'survivedRounds',
        params: { count: roundsSurvived },
      })
    }
    if (preset === 'survivors' && crewEliminated > 0) {
      imposterLine.delta += POINTS.imposterPerCrewLost * crewEliminated
      imposterLine.reasons.push({
        key: 'crewVotedOut',
        params: { count: crewEliminated },
      })
    }
    if (!crewWins) imposterLine.reasons.push({ key: 'imposterEscaped' })
    // Every line needs a reason, or the recap shows a number with nothing
    // beside it to explain where it came from.
    if (imposterLine.reasons.length === 0) {
      imposterLine.reasons.push({ key: 'caughtImmediately' })
    }
  }

  // Crew, by preset.
  if (preset === 'survivors') {
    crewIds.forEach((id) => {
      if (crewWins && aliveIds.includes(id)) {
        lines[id].delta += POINTS.survivorBonus
        lines[id].reasons.push({ key: 'survivedToTheCatch' })
      } else if (crewWins) {
        lines[id].reasons.push({ key: 'eliminatedBeforeCatch' })
      } else {
        lines[id].reasons.push({ key: 'imposterGotAway' })
      }
    })
  } else if (preset === 'detective') {
    const correct: Record<string, number> = {}
    for (const v of voteHistory) {
      if (v.target === imposterId && v.voter !== imposterId) {
        correct[v.voter] = (correct[v.voter] ?? 0) + 1
      }
    }
    crewIds.forEach((id) => {
      const count = correct[id] ?? 0
      if (count > 0) {
        lines[id].delta += POINTS.detectivePerVote * count
        lines[id].reasons.push({ key: 'detectiveBonus', params: { count } })
      } else {
        lines[id].reasons.push({ key: 'neverSpottedThem' })
      }
    })
  } else {
    crewIds.forEach((id) => {
      if (instantCatch) {
        lines[id].delta += POINTS.crewInstantCatch
        lines[id].reasons.push({ key: 'instantCatch' })
      } else if (crewWins) {
        lines[id].reasons.push({ key: 'caughtTooLate' })
      } else {
        lines[id].reasons.push({ key: 'imposterGotAway' })
      }
    })
  }

  // The imposter's guess at the real word.
  //
  // Offered to a winning imposter as well as a caught one, so this no longer
  // assumes a crew win. Stealing, though, is only meaningful when there is a
  // win to take: an imposter who already reached the final two and then names
  // the word takes the ordinary bonus, not the crew's points as well.
  if (guessRule !== 'off' && guessCorrect && imposterLine) {
    if (guessRule === 'steal' && crewWins) {
      crewIds.forEach((id) => {
        lines[id].delta = 0
        lines[id].reasons = [{ key: 'guessStolen' }]
      })
      imposterLine.delta += POINTS.guessSteal
      imposterLine.reasons.push({ key: 'guessSteal' })
    } else {
      imposterLine.delta += POINTS.guessBonus
      imposterLine.reasons.push({ key: 'guessBonus' })
    }
  }

  return lines
}

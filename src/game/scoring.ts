import type { GuessRule, Outcome, ScoreLineItem, Scoring, Vote } from './types'

/**
 * Every number the scoring is made of, in one place.
 *
 * Two things shape it, both learned by playing rather than guessed.
 *
 * **The crew were paid far too much, and too easily.** They now score for one
 * thing per preset, worth one point, instead of a handful every game.
 *
 * **The imposter is caught on the very first vote most of the time.** At a
 * table of six that is roughly four games in five — so paying them only for
 * surviving rounds paid them almost nothing, however high the rate went.
 * Raising it to sixteen a round would barely have reached parity. What fires
 * in *every* game, including the ones they lose immediately, is the votes they
 * sent the wrong way: that is the imposter's actual craft, and it is now their
 * base pay under every preset.
 */
export const POINTS = {
  /**
   * The imposter, per vote that landed on somebody innocent — in any preset.
   *
   * Their own vote doesn't count, and neither does a vote for them. This is
   * what makes a game they lose on the first vote still worth playing.
   *
   * **Capped at one per crew member** (see `computeScores`). Uncapped it grew
   * with rounds *times* players, so it compounded with the per-round pay
   * instead of complementing it: a long game paid 25 where an ordinary one
   * paid 2, and a single lucky escape outweighed a whole evening of everyone
   * else's play. Fooling the table once over is the achievement; fooling it
   * five times running is mostly the table's doing.
   */
  imposterPerMissedVote: 1,
  /** Team Race: the imposter, per round they were not voted out in. */
  imposterPerRound: 3,
  /** Survivors: the imposter, per crew member voted out along the way. */
  imposterPerCrewLost: 3,
  /** The imposter, on top, for actually getting away with it. */
  imposterEscape: 3,
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
   * Rounds the imposter got through without being voted out. Zero when caught
   * on the first vote, and zero when the game ended because they walked out,
   * which earns nothing.
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
 *   imposter; the imposter, per vote they sent elsewhere. Nothing else counts.
 *
 * Underneath all three, the imposter is paid for misdirection, and a correct
 * guess pays whoever made it.
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

  /**
   * Votes somebody else cast that landed on somebody other than the imposter,
   * counted at most once per crew member — one round of the whole table being
   * wrong, however many rounds it actually took.
   */
  const missedVotes = imposterId
    ? Math.min(
        voteHistory.filter(
          (v) => v.voter !== imposterId && v.target !== imposterId,
        ).length,
        crewIds.length,
      )
    : 0

  if (imposterLine) {
    if (missedVotes > 0) {
      imposterLine.delta += POINTS.imposterPerMissedVote * missedVotes
      imposterLine.reasons.push({
        key: 'misdirected',
        params: { count: missedVotes },
      })
    }
    if (preset === 'teamRace' && roundsSurvived > 0) {
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
    if (!crewWins) {
      imposterLine.delta += POINTS.imposterEscape
      imposterLine.reasons.push({ key: 'imposterEscaped' })
    }
    // Caught at once, with nobody fooled on the way. Every line needs a
    // reason, or the recap shows a number with no explanation beside it.
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

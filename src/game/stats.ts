import {
  doc,
  getDoc,
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

  /** Rounds held the imposter card and the vote landed on somebody else. */
  imposterRoundsSurvived: number
  /** Games still alive when the game ended. */
  survived: number
  /** Games where at least one vote cast landed on the true imposter. */
  detectiveGames: number
  /** Games where the imposter was caught on the very first vote. */
  instantReads: number
  /** Games whose deciding vote was unanimous. */
  cleanSweeps: number
  /** Games where votes were cast against this account and it survived anyway. */
  houdinis: number
  /** Games where nobody voted for this account at all. */
  invisibles: number
  /** Games this account was the imposter, got caught, and still guessed right. */
  lastLaughs: number
  /** Games played at a table of eight or more. */
  fullHouses: number
  /** Games dealt from somebody's custom word set. */
  customSetGames: number
  /** Most points scored in a single game. */
  bestGamePoints: number
  /** Most rounds seen in a single game. */
  longestGame: number
  /**
   * Distinct game "flavours" played — `mode:half`, `scoring:teamRace`,
   * `guess:steal` and so on. A string array rather than a boolean per option,
   * so adding an option later is a new tag rather than a migration.
   */
  triedVariants?: string[]

  /**
   * Runs currently going, keyed by streak name (see `STREAKS`). A map rather
   * than a field per streak, so a new streak track is a new key instead of
   * another schema change every account has to be migrated onto.
   */
  streaks?: Record<string, number>
  /** The best each run has ever reached — what the gold and platinum rungs read. */
  bestStreaks?: Record<string, number>

  /**
   * Bumped when a stored number starts meaning something different, so it can
   * be corrected rather than quietly compared against thresholds it was never
   * measured for. See `STATS_VERSION`.
   */
  version?: number

  firstPlayedAt?: Timestamp | null
  /**
   * `pin:gameNumber` of the last game counted. Reopening a finished game — a
   * reload, a re-render, coming back to the recap — must not count it twice,
   * and this pair is unique per game within a room.
   */
  lastGame?: string
}

/**
 * What the stored numbers mean.
 *
 * 2 — the scoring was rebalanced. A crew member's best possible game went from
 * four points to one, and the imposter's from about ten to thirty, so every
 * `bestGamePoints` recorded before it was measured on a scale that no longer
 * exists. Left alone, an old four-point crew game would have sat there as a
 * "best game" nobody could match under the new rules.
 *
 * The counters themselves need no correction: games played is games played,
 * and the badge tiers are computed live, so a threshold that moved simply
 * moves everybody's tier with it.
 */
export const STATS_VERSION = 2

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  asImposter: 0,
  imposterWins: 0,
  hosted: 0,
  points: 0,
  imposterRoundsSurvived: 0,
  survived: 0,
  detectiveGames: 0,
  instantReads: 0,
  cleanSweeps: 0,
  houdinis: 0,
  invisibles: 0,
  lastLaughs: 0,
  fullHouses: 0,
  customSetGames: 0,
  bestGamePoints: 0,
  longestGame: 0,
  triedVariants: [],
  streaks: {},
  bestStreaks: {},
  version: STATS_VERSION,
}

/**
 * Fill in whatever a stored profile is missing.
 *
 * An account written before any given counter existed simply has no such
 * field, and `undefined >= 5` is false rather than an error — so a missing
 * counter would quietly read as "no progress" instead of zero, and arithmetic
 * on it would produce `NaN` and stay there. Everything entering the badge
 * system passes through here first.
 */
export function normalizeStats(stats: Stats | undefined | null): Stats {
  const merged = { ...EMPTY_STATS, ...(stats ?? {}) }
  // Read the version off what was *stored*, never off the merged object: the
  // defaults carry the current version, so merging first would stamp every
  // old profile as up to date and quietly skip the correction below.
  // Nothing stored at all is a new account, which needs no correcting.
  const storedVersion = stats ? (stats.version ?? 1) : STATS_VERSION
  if (storedVersion >= STATS_VERSION) return merged
  // Recorded before the rebalance, so it counts points that cannot be scored
  // any more. Starting it again is fairer than leaving a high-water mark set
  // by different rules.
  return { ...merged, bestGamePoints: 0, version: STATS_VERSION }
}

/**
 * One finished game, from the perspective of the player recording it.
 *
 * Everything here is derivable from the game and round documents the
 * recording device already has open on the recap screen — nothing extra is
 * read from Firestore to build one.
 */
export interface GameResult {
  pin: string
  gameNumber: number
  wasImposter: boolean
  wasHost: boolean
  won: boolean
  points: number
  playerCount: number
  roundCount: number
  mode: 'half' | 'full'
  scoring: 'teamRace' | 'survivors' | 'detective'
  guess: 'final' | 'steal' | 'off'
  /** Dealt from a custom word set rather than the built-in bank. */
  customSet: boolean
  /** Still alive when the game ended. */
  survived: boolean
  /** Rounds spent holding the imposter card without being voted out. */
  imposterRoundsSurvived: number
  /** Votes this account cast, all game, that landed on the true imposter. */
  correctImposterVotes: number
  /** Nobody voted for this account, the entire game. */
  neverVotedFor: boolean
  /** The imposter was caught on the first vote. */
  caughtRound1: boolean
  /** This account was the imposter, got caught, and still guessed the word. */
  guessedRightAsImposter: boolean
  /** Votes were cast against this account and it was still alive at the end. */
  houdini: boolean
  /** Every vote in the deciding round landed on the player who went out. */
  unanimousCatch: boolean
}

/**
 * A run of consecutive games.
 *
 * `applies` is what keeps these fair. Which side you are dealt is not a
 * choice, so a crew game must not break an imposter run — it is skipped
 * entirely, and the run picks up where it left off next time the card comes
 * round. What `applies` must *not* do is skip a game where the thing was
 * possible and simply didn't happen: that is precisely the miss a streak
 * exists to be broken by, and skipping it would leave "five in a row"
 * meaning nothing more than "five".
 */
interface StreakSpec {
  key: string
  applies: (r: GameResult) => boolean
  achieved: (r: GameResult) => boolean
}

const STREAKS: StreakSpec[] = [
  { key: 'wins', applies: () => true, achieved: (r) => r.won },
  // Only the games where the card actually came your way.
  { key: 'imposterWins', applies: (r) => r.wasImposter, achieved: (r) => r.won },
  { key: 'survivor', applies: () => true, achieved: (r) => r.survived },
  // You cannot vote for yourself, so an imposter game is no evidence either way.
  {
    key: 'detective',
    applies: (r) => !r.wasImposter,
    achieved: (r) => r.correctImposterVotes > 0,
  },
  // Being caught in round 1 yourself is not your own instant read.
  {
    key: 'instantRead',
    applies: (r) => !r.wasImposter,
    achieved: (r) => r.caughtRound1,
  },
  {
    key: 'cleanSweep',
    applies: (r) => !r.wasImposter,
    achieved: (r) => r.unanimousCatch,
  },
  { key: 'houdini', applies: () => true, achieved: (r) => r.houdini },
  { key: 'invisible', applies: () => true, achieved: (r) => r.neverVotedFor },
]

/** The Explorer tags a finished game contributes. Eight exist in total. */
function variantTags(result: GameResult): string[] {
  return [`mode:${result.mode}`, `scoring:${result.scoring}`, `guess:${result.guess}`]
}

/**
 * The totals this account would have once a finished game is added.
 *
 * Computed rather than left to Firestore's `increment()`, because the streaks
 * have to read their own previous value to decide whether to continue or
 * reset. Once the write is read-modify-write anyway, having the exact
 * resulting totals in hand is what lets the badge announcement diff against
 * them without a second round trip.
 */
export function applyResult(before: Stats, result: GameResult): Stats {
  const streaks = { ...(before.streaks ?? {}) }
  const bestStreaks = { ...(before.bestStreaks ?? {}) }
  for (const spec of STREAKS) {
    if (!spec.applies(result)) continue
    const next = spec.achieved(result) ? (streaks[spec.key] ?? 0) + 1 : 0
    streaks[spec.key] = next
    bestStreaks[spec.key] = Math.max(bestStreaks[spec.key] ?? 0, next)
  }

  const tags = new Set([...(before.triedVariants ?? []), ...variantTags(result)])

  return {
    played: before.played + 1,
    won: before.won + (result.won ? 1 : 0),
    asImposter: before.asImposter + (result.wasImposter ? 1 : 0),
    imposterWins: before.imposterWins + (result.wasImposter && result.won ? 1 : 0),
    hosted: before.hosted + (result.wasHost ? 1 : 0),
    points: before.points + result.points,
    imposterRoundsSurvived:
      before.imposterRoundsSurvived + result.imposterRoundsSurvived,
    survived: before.survived + (result.survived ? 1 : 0),
    detectiveGames: before.detectiveGames + (result.correctImposterVotes > 0 ? 1 : 0),
    instantReads:
      before.instantReads + (!result.wasImposter && result.caughtRound1 ? 1 : 0),
    cleanSweeps:
      before.cleanSweeps + (!result.wasImposter && result.unanimousCatch ? 1 : 0),
    houdinis: before.houdinis + (result.houdini ? 1 : 0),
    invisibles: before.invisibles + (result.neverVotedFor ? 1 : 0),
    lastLaughs: before.lastLaughs + (result.guessedRightAsImposter ? 1 : 0),
    fullHouses: before.fullHouses + (result.playerCount >= 8 ? 1 : 0),
    customSetGames: before.customSetGames + (result.customSet ? 1 : 0),
    bestGamePoints: Math.max(before.bestGamePoints, result.points),
    longestGame: Math.max(before.longestGame, result.roundCount),
    triedVariants: [...tags].sort(),
    streaks,
    bestStreaks,
    version: STATS_VERSION,
    firstPlayedAt: before.firstPlayedAt ?? null,
    lastGame: `${result.pin}:${result.gameNumber}`,
  }
}

/**
 * Add a finished game to this account's totals, unless it's already counted.
 *
 * Returns the totals either side of the write, which is what the badge
 * announcement compares to find what was just earned — or `null` when the
 * game had already been recorded and nothing changed.
 */
export async function recordGameResult(
  uid: string,
  result: GameResult,
): Promise<{ before: Stats; after: Stats } | null> {
  if (!db) return null
  const key = `${result.pin}:${result.gameNumber}`
  const ref = doc(db, 'users', uid)

  const snap = await getDoc(ref)
  const stored = (snap.data() as Profile | undefined)?.stats
  if (stored?.lastGame === key) return null

  const before = normalizeStats(stored)
  const after = applyResult(before, result)

  await setDoc(
    ref,
    {
      stats: {
        ...after,
        // Set once, so "playing for six months" has something to measure from.
        // Deliberately left off the returned `after`, which keeps whatever was
        // loaded: on the very first game that is null either way, and every
        // game after this one re-reads the real timestamp from the server.
        ...(before.firstPlayedAt ? {} : { firstPlayedAt: serverTimestamp() }),
      },
    },
    { merge: true },
  )
  return { before, after }
}

/** Average points per game, to one decimal; 0 before anything is played. */
export function averagePoints(stats: Stats): number {
  if (stats.played === 0) return 0
  return Math.round((stats.points / stats.played) * 10) / 10
}

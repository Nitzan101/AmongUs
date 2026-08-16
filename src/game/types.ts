import type { Timestamp } from 'firebase/firestore'
import type { Difficulty } from '../words'
import type { Language } from '../i18n'

export type GameMode = 'half' | 'full'
export type Scoring = 'teamRace' | 'survivors' | 'detective'
export type GuessRule = 'final' | 'steal' | 'off'
/**
 * Waiting, playing, or done for the night.
 *
 * `finished` is the podium: the host has called it, or the word pool ran dry.
 * The room stays alive so everyone can see where they came, and nobody is
 * thrown back to the home screen the moment the last game ends.
 */
export type GameStatus = 'lobby' | 'playing' | 'finished'

/** The phase within an active game. */
export type RoundPhase =
  | 'clues'
  | 'voting'
  | 'tally'
  | 'reveal'
  | 'guess'
  | 'recap'
  | 'result'

/** Which vote within a round: the first vote, or a revote after a tie. */
export type VotingRound = 'first' | 'revote'

/** How a finished game ended. */
export type Outcome = 'crew-wins' | 'imposter-wins'

/** The choices the host makes when creating a game. */
export interface GameOptions {
  language: Language
  mode: GameMode
  difficulty: Difficulty
  scoring: Scoring
  guess: GuessRule
  /**
   * A custom word set to deal from. When absent the built-in bank is used,
   * and `difficulty` applies; custom sets carry their own pairings instead.
   */
  wordSetId?: string | null
  /**
   * In-person games only: draw the turn order as the ring the online mode
   * uses, instead of the numbered list. Purely how the order is displayed —
   * the app still can't tell who has spoken aloud, so the ring shows the
   * seating and who begins, and nothing else.
   *
   * Optional; a missing value means the list, which is what every game before
   * this option used.
   */
  turnCircle?: boolean
  /**
   * Whether the imposter is told they're the imposter.
   *
   * Default (`true`) is the classic game: the imposter knows, and plays a
   * deliberate bluff. When `false` nobody is told anything — the imposter
   * gives clues sincerely, unaware their word is the odd one out, and the
   * fun is watching them work it out. The deal is identical either way; only
   * the card changes.
   *
   * Optional because games created before this option existed have no such
   * field; treat a missing value as `true`.
   */
  imposterAware?: boolean
}

/** The state of the current round within an active game. */
export interface Round {
  number: number
  phase: RoundPhase
  /** Circular clue-giving order for this game (player uids). */
  turnOrder: string[]
  /** Players still in the game this round (player uids). */
  aliveIds: string[]
  /** First vote or a post-tie revote. */
  votingRound?: VotingRound | null
  /** Who may be voted for this sub-round (tied players on a revote). */
  candidates?: string[] | null
  /** Set when a player is eliminated, for the reveal screen. */
  eliminatedId?: string | null
  eliminatedRole?: 'crew' | 'imposter' | null
  /** Every vote cast this game, accumulated for the Detective scoring bonus. */
  voteHistory?: Vote[]
  /**
   * Whether every vote cast this round targeted the player who got eliminated
   * — stamped at the moment of the tally, because by the time the game ends
   * `voteHistory` has piled every round's votes together and a later round
   * (or a tie's revote) can no longer be told apart from this one. Reset
   * whenever the round moves on without ending the game, so a unanimous
   * round 1 doesn't leak into a split round 2. Feeds the "Clean Sweep" badge.
   */
  eliminationUnanimous?: boolean | null
  /**
   * Set when the guess phase was reached by the imposter *winning* rather than
   * being caught, so resolving the guess finalises the right outcome. Getting
   * to the final two is not a reason to be denied the fun of naming the word.
   */
  imposterWon?: boolean | null
  /** The imposter's typed guess at the main word (guess phase). */
  guessText?: string | null
  guessCorrect?: boolean | null
  /** True once a guess didn't auto-match and needs the host's Correct/Wrong call. */
  guessNeedsReview?: boolean | null
  /** Set when the game ends. */
  outcome?: Outcome | null
  /** The imposter, revealed only once the game is over. */
  imposterId?: string | null
  /** The real word, revealed only once the game is over. */
  mainWord?: string | null
  /** This game's point breakdown, shown on the recap screen before the scoreboard. */
  scoreBreakdown?: Record<string, ScoreLineItem> | null
}

/** A short, translatable explanation for part of a score change. */
export interface ScoreReason {
  /** Looked up as `game.reasons.<key>`. */
  key: string
  params?: Record<string, number>
}

/** One player's point change for a single finished game. */
export interface ScoreLineItem {
  delta: number
  reasons: ScoreReason[]
}

/**
 * One typed clue word in full-virtual mode (stored at games/{pin}/clues/{id},
 * where id is `r{round}_{playerId}` so each player has one clue per round).
 */
export interface Clue {
  playerId: string
  word: string
  round: number
  /** Position in the round's clue sequence, for stable ordering. */
  index: number
}

/** A single cast vote (stored at games/{pin}/votes/{voterId}). */
export interface Vote {
  voter: string
  target: string
}

/** Enough of a player to name them once their document is gone. */
export interface SeatName {
  name: string
  character: string
}

/** A game room document (stored at games/{pin}). */
export interface Game extends GameOptions {
  pin: string
  hostId: string
  status: GameStatus
  /** Persistent seating order, set on first start and reused for rotation. */
  seatOrder?: string[]
  /**
   * Who was dealt in, by name, snapshotted when the game started.
   *
   * A player document is the only place a name lives, and it is deleted the
   * instant someone leaves — so anything shown after the fact about a player
   * who has gone had nothing to show. The recap is the case that matters: a
   * game that ends *because* the imposter walked out could not say who the
   * imposter was. Not secret; the same names are readable from the player
   * list by anyone in the room.
   */
  seatNames?: Record<string, SeatName> | null
  /**
   * Every main word this room has already been dealt.
   *
   * A word coming round twice in one evening is the fastest way to spoil a
   * game — whoever had it last time knows the answer, and the imposter who
   * held its partner knows it too. Kept on the room rather than per player,
   * because it is the room that must not repeat itself. When nothing is left
   * unused the room finishes on the podium rather than dealing a repeat.
   */
  usedWords?: string[]
  /** Which game number this is in the room (rotates turn order, drives scoring). */
  gameNumber?: number
  /**
   * The name of the custom set this game was dealt from, captured at deal time
   * so every player can see it — only the host can read their own sets. Null
   * when the built-in bank was used.
   */
  wordSetName?: string | null
  /**
   * A custom set lent to the room by a host who left.
   *
   * Kept apart from `wordSetId` so it survives the new host switching to the
   * built-in bank: sets belong to accounts, and the person who inherits the
   * room never sees this one in their own list, so once `wordSetId` moved off
   * it there would be no way back to it.
   */
  sharedWordSetId?: string | null
  /**
   * Set when a departing host kept their set to themselves while a game was
   * running. The round in progress was already dealt from it, so the room
   * returns to the built-in bank once that game finishes rather than mid-play.
   */
  wordSetRevertAfterGame?: boolean | null
  round?: Round
}

/** How far up a badge track someone has climbed. */
export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum'

/**
 * The badge an account has chosen to show off, snapshotted rather than
 * looked up live: other players in a room can't read this account's own
 * stats (`users/{uid}` is owner-only), so the icon and tier have to travel
 * with the player document itself. It goes stale the moment the account
 * earns something better, until they visit their profile or the room again —
 * a stale badge is a much smaller problem than widening who can read a
 * profile.
 *
 * Lives here rather than in `badges.ts` because it is stored on the player
 * document, and `badges.ts` imports the game types rather than the other way
 * around.
 */
export interface PlayerBadge {
  /** Which track it came from. */
  key: string
  icon: string
  tier: TierName
}

/** A player in a game (stored at games/{pin}/players/{uid}). */
export interface Player {
  id: string
  name: string
  character: string
  isHost: boolean
  score: number
  /** Updated periodically while the app is open; drives the "disconnected" tag. */
  lastSeen?: Timestamp | null
  /** The badge shown beside this player's name, if they've earned and picked one. */
  displayedBadge?: PlayerBadge | null
  /**
   * The last game this player has already been paid for, as `{pin}:{n}`.
   *
   * Every device applies its own points from `round.scoreBreakdown` — writing
   * another player's document is host-only — and each of them sees the
   * finished round over and over, so this is what stops a reload paying out
   * twice. See `applyMyScore`.
   */
  scoredGame?: string
  /**
   * Games won in this room. Written alongside `score` by the player's own
   * device, and used to break a tie on the podium — level on points, the one
   * who won more often is placed higher.
   */
  wins?: number
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

import type { Stats } from './stats'
import type { PlayerBadge, TierName } from './types'

export const TIER_NAMES = ['bronze', 'silver', 'gold', 'platinum'] as const

/**
 * One colour per tier, for a badge's ring and its star row.
 *
 * Platinum is deliberately an icy cyan rather than the brand purple: it has
 * to read as "rarer than gold" at a glance, and borrowing the app's own
 * signature colour made the top tier blend into every other purple control
 * on the screen instead of standing apart from them.
 */
export const TIER_COLORS: Record<TierName, string> = {
  bronze: '#b45309',
  silver: '#94a3b8',
  gold: '#eab308',
  platinum: '#22d3ee',
}

const STAR_COUNT: Record<TierName, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
}

/** How many stars a tier is worth, for anything that wants the number alone. */
export function starsFor(tierName: TierName | null): number {
  return tierName ? STAR_COUNT[tierName] : 0
}

/** A snapshotted player badge's colour. */
export function colorForBadge(badge: PlayerBadge): string {
  return TIER_COLORS[badge.tier]
}

/**
 * Which shelf a track sits on. Purely presentational, but the split is the
 * point of the whole table: the ladders that only measure showing up are kept
 * apart from the ones that measure playing well, so a wall of circles still
 * says *where* you can actually improve.
 */
export type TrackGroup = 'playing' | 'skill' | 'feats'

export const TRACK_GROUPS: TrackGroup[] = ['playing', 'skill', 'feats']

/** The tags a finished game contributes to the Explorer track. Eight in total. */
export const EXPLORER_TAG_COUNT = 8

/** One ascending progression, drawn as a single circle at its current tier. */
export interface TrackSpec {
  /** Looked up as `stats.tracks.<key>.name` / `.desc`. */
  key: string
  icon: string
  group: TrackGroup
  /**
   * Running-total thresholds, lowest first. These are always the *bottom*
   * rungs of the ladder.
   */
  thresholds: number[]
  metric: (s: Stats, nowMs: number) => number
  /**
   * Consecutive-games thresholds that continue the ladder above the counts.
   *
   * This is what keeps gold and platinum honest. A bigger pile of the same
   * thing only measures how many evenings you've played, so the top of every
   * skill ladder asks for a run instead: doing it again, and again, without
   * a miss in between. Tracks with no `streakKey` are ones where a streak
   * would measure the table's behaviour rather than yours (see `lastLaugh`).
   */
  streakKey?: string
  streakThresholds?: number[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(s: Stats, nowMs: number): number {
  const started = s.firstPlayedAt?.toMillis?.()
  return started ? Math.floor((nowMs - started) / DAY_MS) : 0
}

/**
 * Every track, in display order within its group.
 *
 * Three shelves:
 *
 * - **playing** — turning up, and the luck of the draw. Capped at silver on
 *   purpose: no threshold on "games played" or "times you were handed the
 *   imposter card" can ever be evidence of skill, so pretending otherwise by
 *   adding a gold rung would cheapen every gold that *is* earned.
 * - **skill** — the four core ladders, each topped by a streak.
 * - **feats** — rarer single moments. Most also top out in streaks; the three
 *   that don't are single-game peaks (`bestGame`, `marathon`) or depend on
 *   being caught first (`lastLaugh`), where a run would measure the crew.
 */
export const TRACKS: TrackSpec[] = [
  // ---- Playing: showing up, and the luck of the draw. Bronze/silver only. ----
  { key: 'played', icon: '🎲', group: 'playing', thresholds: [1, 50], metric: (s) => s.played },
  { key: 'hosted', icon: '👑', group: 'playing', thresholds: [5, 30], metric: (s) => s.hosted },
  {
    key: 'imposter',
    icon: '🕵️',
    group: 'playing',
    thresholds: [8, 40],
    metric: (s) => s.asImposter,
  },
  {
    key: 'imposterRounds',
    icon: '🎖️',
    group: 'playing',
    thresholds: [20, 80],
    metric: (s) => s.imposterRoundsSurvived,
  },
  {
    key: 'loyalty',
    icon: '🎂',
    group: 'playing',
    thresholds: [30, 182],
    metric: daysSince,
  },
  {
    key: 'explorer',
    icon: '🌈',
    group: 'playing',
    // Above what one game can hand over. A single game contributes three tags
    // at once — its mode, its scoring, its guess rule — so bronze at three was
    // awarded for turning up, before anyone had explored anything.
    thresholds: [6, 8],
    metric: (s) => (s.triedVariants ?? []).length,
  },
  {
    key: 'homemade',
    icon: '📝',
    group: 'playing',
    thresholds: [3, 15],
    metric: (s) => s.customSetGames,
  },
  {
    key: 'fullHouse',
    icon: '🏠',
    group: 'playing',
    thresholds: [3, 12],
    metric: (s) => s.fullHouses,
  },
  // Both of these are jokes about the randomiser, so they read the games-played
  // total but only while the pattern actually holds — the moment it stops being
  // true the metric drops to zero and the badge goes with it, which is the same
  // rule every other track follows: nothing is kept that the numbers no longer
  // support.
  {
    key: 'innocent',
    icon: '😇',
    group: 'playing',
    thresholds: [20, 40],
    metric: (s) => (s.asImposter === 0 ? s.played : 0),
  },
  {
    key: 'marked',
    icon: '🎯',
    group: 'playing',
    thresholds: [15, 30],
    metric: (s) => (s.played > 0 && s.asImposter / s.played > 0.4 ? s.played : 0),
  },

  // ---- Skill: the four core ladders, each topped by a run. ----
  {
    key: 'wins',
    icon: '🏆',
    group: 'skill',
    thresholds: [10, 50],
    metric: (s) => s.won,
    streakKey: 'wins',
    // Six and ten, not three and five. The crew win most games at most tables,
    // so a five-win run was an ordinary first evening — which is how a
    // platinum came home on the very first night anyone played.
    streakThresholds: [6, 10],
  },
  {
    key: 'imposterWins',
    icon: '🎭',
    group: 'skill',
    thresholds: [5, 15],
    metric: (s) => s.imposterWins,
    streakKey: 'imposterWins',
    streakThresholds: [4, 7],
  },
  {
    key: 'survivor',
    icon: '🛡️',
    group: 'skill',
    // Only one player goes out per round, so surviving is the common case and
    // has to be counted in much bigger numbers to mean anything.
    thresholds: [25, 75],
    metric: (s) => s.survived,
    streakKey: 'survivor',
    streakThresholds: [8, 14],
  },
  {
    key: 'detective',
    icon: '🔎',
    group: 'skill',
    thresholds: [20, 60],
    metric: (s) => s.detectiveGames,
    streakKey: 'detective',
    streakThresholds: [6, 10],
  },

  // ---- Feats: rarer moments. ----
  // Instant Read and Clean Sweep ask for five in a row at gold rather than
  // three: both land often enough at a sharp table that a three-run is an
  // ordinary evening, and a gold nobody notices earning is not worth having.
  {
    key: 'instantRead',
    icon: '⚡',
    group: 'feats',
    thresholds: [10, 35],
    metric: (s) => s.instantReads,
    streakKey: 'instantRead',
    streakThresholds: [6, 10],
  },
  {
    key: 'cleanSweep',
    icon: '🧹',
    group: 'feats',
    thresholds: [10, 35],
    metric: (s) => s.cleanSweeps,
    streakKey: 'cleanSweep',
    streakThresholds: [6, 10],
  },
  {
    key: 'houdini',
    icon: '🪄',
    group: 'feats',
    thresholds: [8, 25],
    metric: (s) => s.houdinis,
    streakKey: 'houdini',
    streakThresholds: [4, 7],
  },
  {
    key: 'invisible',
    icon: '👻',
    group: 'feats',
    thresholds: [12, 40],
    metric: (s) => s.invisibles,
    streakKey: 'invisible',
    streakThresholds: [5, 9],
  },
  // No streak: earning this at all needs the crew to catch you first, which
  // is their decision rather than yours, so a run of them would mostly
  // measure how often you get caught.
  {
    key: 'lastLaugh',
    icon: '😏',
    group: 'feats',
    thresholds: [2, 6, 15, 30],
    metric: (s) => s.lastLaughs,
  },
  // Single-game peaks: a best is already a high-water mark, so it climbs on
  // its own without needing a run to prove anything.
  {
    key: 'bestGame',
    icon: '💎',
    group: 'feats',
    // Re-cut for the scoring, not just made harder — twice, because the range
    // moved twice. A crew member's best possible game is now 1 (or about 3
    // under Detective); an imposter caught on the first vote takes ~2, one who
    // survives a round ~9, and one who gets away with it entirely can pass 30.
    // So bronze marks a good game whichever side you were on, and platinum
    // means you got away with it.
    thresholds: [4, 9, 16, 28],
    metric: (s) => s.bestGamePoints,
  },
  {
    key: 'marathon',
    icon: '⏱️',
    group: 'feats',
    // A game runs at most about one round per player above two, so fifteen was
    // unreachable at any table this app allows. These are long games rather
    // than impossible ones.
    thresholds: [5, 8, 11],
    metric: (s) => s.longestGame,
  },
]

/** One rung of a track's ladder: a running total, or a run of consecutive games. */
export interface Rung {
  kind: 'count' | 'streak'
  need: number
}

/** A track's ladder, bottom to top: every count rung, then every streak rung. */
export function rungsFor(spec: TrackSpec): Rung[] {
  return [
    ...spec.thresholds.map((need) => ({ kind: 'count' as const, need })),
    ...(spec.streakThresholds ?? []).map((need) => ({ kind: 'streak' as const, need })),
  ]
}

/** One track's current standing, ready to render as a circle. */
export interface TieredBadge {
  key: string
  icon: string
  group: TrackGroup
  /** 0 = nothing earned yet. */
  tier: number
  tierName: TierName | null
  /** How many rungs this track has in total — 2, 3 or 4. */
  maxTier: number
  /** What the next rung is measured in, so the caption can say "in a row". */
  nextKind: 'count' | 'streak' | null
  /** Where you are on the next rung's own measure. */
  value: number
  /** What the next rung needs, or null once the track is maxed out. */
  next: number | null
  /** 0..1, how far the ring should fill toward the next rung. */
  progress: number
}

function best(stats: Stats, streakKey: string | undefined): number {
  if (!streakKey) return 0
  return stats.bestStreaks?.[streakKey] ?? 0
}

export function computeTieredBadges(
  stats: Stats,
  nowMs: number = Date.now(),
): TieredBadge[] {
  return TRACKS.map((spec) => {
    const count = spec.metric(stats, nowMs)
    const streak = best(stats, spec.streakKey)
    const rungs = rungsFor(spec)

    // Strictly a ladder: a rung only counts once everything below it does.
    // Without this, three wins in a row on your first three games would hand
    // out gold while the silver rung underneath was still empty.
    let tier = 0
    for (const rung of rungs) {
      const have = rung.kind === 'count' ? count : streak
      if (have >= rung.need) tier++
      else break
    }

    const nextRung = tier < rungs.length ? rungs[tier] : null
    const tierName = tier > 0 ? TIER_NAMES[tier - 1] : null

    // Progress is measured against the previous rung *of the same kind*, so
    // the ring restarts sensibly when the ladder switches from totals to runs
    // rather than showing a bar that is already most of the way full.
    let progress = 1
    if (nextRung) {
      const have = nextRung.kind === 'count' ? count : streak
      const below = rungs
        .slice(0, tier)
        .filter((r) => r.kind === nextRung.kind)
        .map((r) => r.need)
      const floor = below.length > 0 ? below[below.length - 1] : 0
      const span = nextRung.need - floor
      progress = span <= 0 ? 1 : Math.min(1, Math.max(0, (have - floor) / span))
    }

    return {
      key: spec.key,
      icon: spec.icon,
      group: spec.group,
      tier,
      tierName,
      maxTier: rungs.length,
      nextKind: nextRung?.kind ?? null,
      value: nextRung?.kind === 'streak' ? streak : count,
      next: nextRung?.need ?? null,
      progress,
    }
  })
}

/** How much of the whole collection is filled in, for the meter at the top. */
export function collectionProgress(stats: Stats, nowMs: number = Date.now()) {
  const tracks = computeTieredBadges(stats, nowMs)
  const have = tracks.reduce((sum, t) => sum + t.tier, 0)
  const total = TRACKS.reduce((sum, t) => sum + rungsFor(t).length, 0)
  return { have, total, progress: total === 0 ? 0 : have / total }
}

/**
 * A snapshotted badge brought back in line with what the account now holds.
 *
 * `displayedBadge` is a copy — icon and tier and all — because other players
 * cannot read your profile to look it up. Copies go stale: raise a threshold
 * and somebody keeps wearing a platinum they would no longer be given. This
 * re-reads the tier from the live totals, hands back the same badge one rung
 * lower where that is what they now hold, and nothing at all where the track
 * has dropped off the bottom.
 */
export function refreshBadge(
  badge: PlayerBadge | null | undefined,
  stats: Stats,
  nowMs: number = Date.now(),
): PlayerBadge | null {
  if (!badge) return null
  const track = computeTieredBadges(stats, nowMs).find((t) => t.key === badge.key)
  if (!track?.tierName) return null
  return track.tierName === badge.tier ? badge : { ...badge, tier: track.tierName }
}

/** A track that just moved up a tier, for the announcement. */
export interface BadgeDelta {
  key: string
  icon: string
  tierName: TierName
}

/**
 * Which tracks moved up between two snapshots of the same account's totals.
 *
 * Called right after a finished game is recorded, comparing what was just
 * written against what it was a moment before, so something earned *now* can
 * be announced now — rather than sitting unnoticed on the profile screen for
 * whoever thinks to go looking.
 *
 * Only gains are reported. A track can go down (the joke ones in `playing`
 * do, the first time the randomiser catches up with you), and being told you
 * have *lost* a badge mid-party is not a moment anyone needs.
 */
export function diffBadges(
  before: Stats,
  after: Stats,
  nowMs: number = Date.now(),
): BadgeDelta[] {
  const was = computeTieredBadges(before, nowMs)
  const now = computeTieredBadges(after, nowMs)
  const deltas: (BadgeDelta & { tier: number })[] = []
  now.forEach((track, i) => {
    if (track.tier > was[i].tier && track.tierName) {
      deltas.push({
        key: track.key,
        icon: track.icon,
        tierName: track.tierName,
        tier: track.tier,
      })
    }
  })
  // Best first. One game can cross several rungs at once, and a platinum
  // listed underneath "Played — bronze" reads as an afterthought.
  deltas.sort((a, b) => b.tier - a.tier)
  return deltas.map(({ key, icon, tierName }) => ({ key, icon, tierName }))
}

import type { Language } from '../i18n'
import { EN_CATEGORIES } from './en'
import { HE_CATEGORIES } from './he'
import type { Category, Difficulty } from './types'

export type { Category, Difficulty }

const BANKS: Record<Language, Category[]> = {
  en: EN_CATEGORIES,
  he: HE_CATEGORIES,
}

/** All categories for a language (falls back to English for anything unexpected). */
export function getCategories(language: Language): Category[] {
  return BANKS[language] ?? BANKS.en
}

/** Total number of words in a language's bank. */
export function countWords(language: Language): number {
  return getCategories(language).reduce(
    (sum, cat) => sum + cat.clusters.reduce((s, c) => s + c.length, 0),
    0,
  )
}

/** The words a single game hands out. */
export interface WordAssignment {
  main: string
  /**
   * The imposter's word — empty when they are given none at all.
   *
   * On hard the imposter is told they are the imposter and nothing else. A
   * word from an unrelated category was never much of a disguise: saying
   * something vaguely about "hammer" while the table discusses a beach holiday
   * gives you away on your first turn. With no word they have to build a clue
   * out of what everyone else says, which is the game people actually wanted.
   */
  confusing: string
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Choose the main word (crew) and the confusing word (imposter). The confusing
 * word is drawn live by distance so nothing is a fixed, memorizable mapping:
 * - easy:   another word from the same cluster.
 * - medium: a word from a different cluster in the same category.
 * - hard:   no word at all — see `WordAssignment.confusing`.
 *
 * `exclude` holds the main words this room has already used, so no word comes
 * round twice in one evening. Returns null when every word in the bank has
 * been played, which is the room's cue to finish rather than repeat itself.
 */
export function pickWords(
  language: Language,
  difficulty: Difficulty,
  exclude: ReadonlySet<string> = new Set(),
): WordAssignment | null {
  const categories = getCategories(language)
  // Only clusters that still have something unplayed in them, so the random
  // walk down category → cluster → word can't dead-end on an exhausted branch.
  const available = categories
    .map((c) => ({
      ...c,
      clusters: c.clusters.filter((cl) => cl.some((w) => !exclude.has(w))),
    }))
    .filter((c) => c.clusters.length > 0)
  if (available.length === 0) return null

  const category = randomItem(available)
  const cluster = randomItem(category.clusters)
  const main = randomItem(cluster.filter((w) => !exclude.has(w)))

  // Hard hands over nothing, so there is no pool to draw from.
  if (difficulty === 'hard') return { main, confusing: '' }

  // The imposter's word may repeat freely: it is never said aloud as the
  // answer, and restricting it too would shrink the pool for no gain.
  const full = getCategories(language)
  const ownCategory = full.find((c) => c.id === category.id) ?? category
  const ownCluster =
    ownCategory.clusters.find((cl) => cl.includes(main)) ?? cluster

  let pool: string[]
  if (difficulty === 'easy') {
    pool = ownCluster.filter((w) => w !== main)
  } else {
    pool = ownCategory.clusters.filter((c) => c !== ownCluster).flat()
  }

  // Fallbacks keep selection safe even if a bank ever violates the invariants.
  if (pool.length === 0) {
    pool = full.flatMap((c) => c.clusters.flat()).filter((w) => w !== main)
  }

  return { main, confusing: randomItem(pool) }
}

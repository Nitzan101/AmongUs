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
 * - hard:   a word from a different category.
 */
export function pickWords(
  language: Language,
  difficulty: Difficulty,
): WordAssignment {
  const categories = getCategories(language)
  const category = randomItem(categories)
  const cluster = randomItem(category.clusters)
  const main = randomItem(cluster)

  let pool: string[]
  if (difficulty === 'easy') {
    pool = cluster.filter((w) => w !== main)
  } else if (difficulty === 'medium') {
    pool = category.clusters.filter((c) => c !== cluster).flat()
  } else {
    pool = categories.filter((c) => c !== category).flatMap((c) => c.clusters.flat())
  }

  // Fallbacks keep selection safe even if a bank ever violates the invariants.
  if (pool.length === 0) {
    pool = categories.flatMap((c) => c.clusters.flat()).filter((w) => w !== main)
  }

  return { main, confusing: randomItem(pool) }
}

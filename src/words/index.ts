import type { Language } from '../i18n'
import { EN_WORDS } from './en'
import { HE_WORDS } from './he'
import type { Difficulty, WordEntry } from './types'

export type { WordEntry, Difficulty }

const BANKS: Record<Language, WordEntry[]> = {
  en: EN_WORDS,
  he: HE_WORDS,
}

/** All entries for a language (falls back to English for anything unexpected). */
export function getWords(language: Language): WordEntry[] {
  return BANKS[language] ?? BANKS.en
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
 * Choose the main word (crew) and the confusing word (imposter):
 * - easy:   the near-twin variant.
 * - medium: the same-category-but-distinct variant.
 * - hard:   the main word of a different-category entry (genuinely unrelated).
 */
export function pickWords(
  language: Language,
  difficulty: Difficulty,
): WordAssignment {
  const words = getWords(language)
  const entry = randomItem(words)

  if (difficulty === 'easy') {
    return { main: entry.main, confusing: entry.easy }
  }
  if (difficulty === 'medium') {
    return { main: entry.main, confusing: entry.medium }
  }

  // hard: borrow an unrelated word from a different category.
  const others = words.filter((w) => w.category !== entry.category)
  const pool = others.length > 0 ? others : words.filter((w) => w !== entry)
  return { main: entry.main, confusing: randomItem(pool).main }
}

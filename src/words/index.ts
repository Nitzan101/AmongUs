import type { Language } from '../i18n'
import { EN_PAIRS } from './en'
import { HE_PAIRS } from './he'
import type { Difficulty, WordPair } from './types'

export type { WordPair, Difficulty }

const BANKS: Record<Language, WordPair[]> = {
  en: EN_PAIRS,
  he: HE_PAIRS,
}

/** All pairs for a language (falls back to English for anything unexpected). */
export function getPairs(language: Language): WordPair[] {
  return BANKS[language] ?? BANKS.en
}

/** The words a single game hands out. */
export interface WordAssignment {
  main: string
  confusing: string
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

/**
 * Choose the main word (for the crew) and the confusing word (for the imposter).
 * - normal: a genuinely related pair from the bank.
 * - hard:   two unrelated words — the main words of two different pairs.
 */
export function pickWords(
  language: Language,
  difficulty: Difficulty,
): WordAssignment {
  const pairs = getPairs(language)

  if (difficulty === 'normal') {
    const pair = pairs[randomIndex(pairs.length)]
    return { main: pair.main, confusing: pair.confusing }
  }

  const i = randomIndex(pairs.length)
  let j = randomIndex(pairs.length)
  while (j === i && pairs.length > 1) {
    j = randomIndex(pairs.length)
  }
  return { main: pairs[i].main, confusing: pairs[j].main }
}

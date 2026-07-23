/** How close the imposter's word is to the real word — i.e. how easy for the imposter. */
export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * A category groups tight "clusters" of near-twin words. The confusing word is
 * generated live by distance, so there is no fixed word→word mapping to memorize:
 * - easy:   another word from the SAME cluster.
 * - medium: a word from a DIFFERENT cluster in the SAME category.
 * - hard:   a word from a DIFFERENT category.
 *
 * Invariants for selection to always work: every cluster has >= 2 words, every
 * category has >= 2 clusters, and the bank has >= 2 categories.
 */
export interface Category {
  id: string
  emoji: string
  clusters: string[][]
}

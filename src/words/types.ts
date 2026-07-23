/** A related word pair used for a normal-difficulty game. */
export interface WordPair {
  /** The word the crew receives. */
  main: string
  /** The related word the imposter receives (normal difficulty). */
  confusing: string
}

export type Difficulty = 'normal' | 'hard'

/** How close the imposter's word is to the real word — i.e. how easy for the imposter. */
export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * One real word plus two confusing variants at different distances:
 * - `easy`:   a near-twin (imposter blends in effortlessly).
 * - `medium`: same category, clearly different (balanced — the default).
 * Hard mode ignores these and borrows the `main` of a different-category entry,
 * which is why every entry also carries a `category`.
 */
export interface WordEntry {
  main: string
  easy: string
  medium: string
  category: string
}

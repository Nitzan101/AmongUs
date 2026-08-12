/** Normalize a guess for comparison: trim, lowercase, collapse whitespace. */
export function normalizeGuess(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i++) dp[i][0] = i
  for (let j = 0; j < cols; j++) dp[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[rows - 1][cols - 1]
}

/**
 * Whether two guesses are close enough to auto-accept — an exact match or a
 * small typo. Genuinely different words (synonyms, wrong guesses) fall
 * through to the host's manual judgment instead of ever being auto-rejected.
 *
 * **Two edits at most, and never more than a quarter of the word.** It used to
 * forgive three on anything over eight characters, and three edits is not a
 * typo — it is a different word, waved through without anyone being asked.
 * The quarter also stops a short word being matched by proportion: "beach" and
 * "peace" are two apart in five letters, which is not a slip of the thumb.
 *
 * What this cannot do is separate a typo from a near miss, and it is worth
 * being plain about that. "computer" and "commuter" are one edit apart;
 * "elephant" and "elegant" are two. No edit distance will ever tell those from
 * a mistyped word, so some wrong guesses are still accepted without the host
 * seeing them. The bar is set where it is because the common legitimate cases
 * — a doubled letter, a transposition, a plural — are all one edit, and
 * stopping to ask about every one of those would make the guess phase tedious
 * for the sake of a rare unlucky collision.
 */
export function isCloseMatch(a: string, b: string): boolean {
  const na = normalizeGuess(a)
  const nb = normalizeGuess(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const maxLen = Math.max(na.length, nb.length)
  const threshold = Math.max(1, Math.min(2, Math.floor(maxLen / 4)))
  return levenshtein(na, nb) <= threshold
}

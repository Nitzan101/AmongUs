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
 */
export function isCloseMatch(a: string, b: string): boolean {
  const na = normalizeGuess(a)
  const nb = normalizeGuess(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const maxLen = Math.max(na.length, nb.length)
  const threshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : 3
  return levenshtein(na, nb) <= threshold
}

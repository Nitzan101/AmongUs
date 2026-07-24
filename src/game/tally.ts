import type { Vote } from './types'

export interface TallyResult {
  kind: 'eliminated' | 'tie'
  counts: Record<string, number>
  /** Set when kind === 'eliminated'. */
  eliminatedId?: string
  /** The players sharing the top count when kind === 'tie'. */
  tied?: string[]
}

/**
 * Count votes among the eligible candidates. A unique highest count means that
 * player is eliminated; anything else (a shared top, or no votes) is a tie.
 */
export function tallyVotes(votes: Vote[], candidates: string[]): TallyResult {
  const counts: Record<string, number> = {}
  for (const c of candidates) counts[c] = 0
  for (const v of votes) {
    if (v.target in counts) counts[v.target]++
  }

  let max = -1
  let top: string[] = []
  for (const c of candidates) {
    const n = counts[c]
    if (n > max) {
      max = n
      top = [c]
    } else if (n === max) {
      top.push(c)
    }
  }

  if (max <= 0 || top.length !== 1) {
    return { kind: 'tie', tied: top, counts }
  }
  return { kind: 'eliminated', eliminatedId: top[0], counts }
}

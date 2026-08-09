import { useRef } from 'react'
import type { Game } from './types'

/**
 * True once a game we were actually in has disappeared underneath us.
 *
 * The host closing a room deletes the document, and every other client used to
 * notice only by being silently thrown back to the home screen — no
 * explanation, mid-conversation. This distinguishes *that* from arriving at a
 * PIN that never existed, which deserves a different message: the difference is
 * simply whether we ever saw the game at all.
 *
 * Deliberately derived rather than held in state. The first version set a flag
 * from an effect, which lost a race — the page's own "game is gone, go home"
 * effect ran in the same commit and still saw the old `false`, so it navigated
 * away before the notice could render. Reading a ref during render is
 * synchronous, so the answer is already correct in the very render where the
 * game turns null, which also avoids flashing the "no such game" screen first.
 *
 * Players who leave or close the room themselves never see it — they navigate
 * away in their own handler, so this component is already gone.
 */
export function useGameClosed(loading: boolean, game: Game | null): boolean {
  const wasIn = useRef(false)
  if (game) wasIn.current = true
  return !loading && !game && wasIn.current
}

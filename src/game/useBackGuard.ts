import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Turn the browser's Back button into "do you want to leave the room?".
 *
 * The lobby and an active game deliberately have no Back button of their own —
 * you leave them through Leave game, which also settles what happens to the
 * room. The hardware button didn't know that. Pressing it went back to
 * whichever screen you happened to arrive from, that screen noticed you were
 * still in a running game and sent you straight back, and Back looked broken.
 *
 * Only POP is intercepted, so the app's own navigation — following the room
 * into a game, dropping back to the lobby, going home after leaving — is
 * untouched. That is also why this doesn't need the bypass dance
 * `useUnsavedChanges` does: there is nothing legitimate to bypass.
 */
export function useBackGuard(enabled: boolean, onBack: () => void): void {
  // Read at block time rather than captured, so the blocker isn't rebuilt
  // every render just because the handler closes over fresh state.
  const handler = useRef(onBack)
  handler.current = onBack

  const blocker = useBlocker(
    useCallback(
      ({ historyAction }) => enabled && historyAction === 'POP',
      [enabled],
    ),
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    // Stay exactly where we are, and ask instead.
    blocker.reset()
    handler.current()
  }, [blocker])
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { useLeaveGuard } from './leaveGuardContext'

/**
 * Guard a form against losing edits on the way out.
 *
 * Three exits, three mechanisms, because no single one covers them all:
 *
 * 1. **The header's Back button** — registered with `LeaveGuardProvider`, which
 *    Layout consults before navigating. `useBlocker` was the first attempt and
 *    did not intercept the `navigate(-1)` that button performs, so it is
 *    guarded directly instead of trusting a mechanism that misses the case
 *    people actually hit.
 * 2. **Any other in-app navigation** — `useBlocker` still covers pushes.
 * 3. **Closing or reloading the tab** — `beforeunload`, where the browser
 *    supplies its own wording.
 *
 * `dirty` must mean *changed*, not *non-empty*: prompting someone who opened a
 * form and touched nothing only teaches them to dismiss prompts.
 *
 * Returns `blocked` (render your confirmation when true), `stay`, `discard`,
 * and `allowNext` for the save path — leaving because you saved is not
 * something to warn about.
 */
export function useUnsavedChanges(dirty: boolean) {
  const ctx = useLeaveGuard()
  // Read at navigation time rather than captured, so a save can stand the
  // guard down immediately before navigating.
  const bypass = useRef(false)
  /** Set while the Back button is waiting on the user's answer. */
  const [pending, setPending] = useState<(() => void) | null>(null)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (bypass.current) return false
        return dirty && currentLocation.pathname !== nextLocation.pathname
      },
      [dirty],
    ),
  )

  // Register with Layout's Back button for as long as there's something to lose.
  useEffect(() => {
    if (!ctx) return
    // Captured so the cleanup clears the same store it registered with, even
    // if the context value were swapped underneath us.
    const store = ctx.guard
    if (!dirty) {
      store.current = null
      return
    }
    store.current = (proceed) => {
      if (bypass.current) return false
      // Store the continuation itself, not the result of calling it.
      setPending(() => proceed)
      return true
    }
    return () => {
      store.current = null
    }
  }, [ctx, dirty])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const allowNext = useCallback(() => {
    bypass.current = true
    if (ctx) ctx.guard.current = null
  }, [ctx])

  const stay = useCallback(() => {
    setPending(null)
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])

  const discard = useCallback(() => {
    bypass.current = true
    if (ctx) ctx.guard.current = null
    if (pending) {
      const go = pending
      setPending(null)
      go()
      return
    }
    if (blocker.state === 'blocked') blocker.proceed()
  }, [blocker, ctx, pending])

  return {
    blocked: pending !== null || blocker.state === 'blocked',
    stay,
    discard,
    allowNext,
  }
}

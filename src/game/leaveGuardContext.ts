import { createContext, useContext } from 'react'

/**
 * Called when something tries to navigate away. Returns true if it took over
 * (by showing a confirmation), false to let the navigation happen.
 */
export type LeaveGuard = (proceed: () => void) => boolean

export interface LeaveGuardStore {
  current: LeaveGuard | null
}

/**
 * Lets a form veto the header's Back button.
 *
 * The Back button lives in the shared `Layout` while the form state lives in
 * the page, so the page registers a guard here and Layout consults it before
 * navigating. A ref rather than state: registering must not re-render Layout,
 * and the value only ever needs to be read at click time.
 *
 * `useBlocker` was tried first and did not intercept the `navigate(-1)` the
 * button performed at the time, so it was guarded directly instead. Back has
 * since moved to an explicit parent route (see `parentRoute`), which
 * `useBlocker` would catch — but this guard stays, because it is the one that
 * has been shown to work and it costs nothing to keep.
 *
 * Kept apart from the provider component so the module exports only values,
 * which is what fast refresh needs.
 */
export const LeaveGuardContext = createContext<{
  guard: LeaveGuardStore
} | null>(null)

export function useLeaveGuard() {
  return useContext(LeaveGuardContext)
}

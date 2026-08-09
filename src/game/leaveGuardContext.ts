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
 * `useBlocker` was tried first and does catch pushes, but it did not intercept
 * the `navigate(-1)` this button performs, so the button is guarded directly
 * rather than trusting a mechanism that quietly misses the main case.
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

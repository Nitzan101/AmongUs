import { useRef, type ReactNode } from 'react'
import { LeaveGuardContext, type LeaveGuard } from '../game/leaveGuardContext'

/** Holds the current page's leave guard so Layout's Back button can ask it. */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const guard = useRef<LeaveGuard | null>(null)
  return (
    <LeaveGuardContext.Provider value={{ guard }}>
      {children}
    </LeaveGuardContext.Provider>
  )
}

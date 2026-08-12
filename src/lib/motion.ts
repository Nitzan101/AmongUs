import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Whether this device has asked for less movement.
 *
 * The CSS in `index.css` already stands the keyframe animations down; this is
 * for the effects CSS can't reach — chiefly the confetti, whose animation is
 * set inline per piece, and which is better not rendered at all than rendered
 * as two dozen motionless dots stuck to the top of the screen.
 *
 * Watched rather than read once: the setting can be changed while the app is
 * open, and on iOS it is a Control Centre toggle away.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.(QUERY).matches ?? false,
  )

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}

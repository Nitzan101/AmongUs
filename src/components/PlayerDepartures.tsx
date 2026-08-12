import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../game/types'

/** How long one notice stays up before the next takes its turn. */
const SHOW_MS = 5000
/** A pile-up of notices would cover the game; the newest few are enough. */
const MAX_QUEUED = 3

interface Departure {
  id: string
  name: string
  character: string
}

/**
 * "Ben left the game", for a few seconds, when somebody does.
 *
 * Players simply vanished from the list before this — mid-round, the turn
 * order would quietly get shorter and the table would spend a minute working
 * out who they were waiting for. There is no event to subscribe to, so it is
 * derived: the live player list is compared against the one before it.
 *
 * Two disappearances are deliberately *not* announced. The first list of the
 * session isn't everyone arriving, and an empty one isn't the whole table
 * walking out — that is the room being closed, which has a screen of its own.
 */
export function PlayerDepartures({
  players,
  active,
  selfId,
}: {
  players: Player[]
  /** False while loading, or once the room is gone. */
  active: boolean
  /** Your own uid — being kicked shouldn't announce you to yourself. */
  selfId?: string
}) {
  const { t } = useTranslation()
  const known = useRef<Map<string, Departure> | null>(null)
  const [queue, setQueue] = useState<Departure[]>([])

  useEffect(() => {
    const before = known.current
    const now = new Map(
      players.map((p) => [
        p.id,
        { id: p.id, name: p.name, character: p.character },
      ]),
    )
    known.current = now
    if (!before || !active || now.size === 0) return

    const gone: Departure[] = []
    for (const [id, who] of before) {
      if (!now.has(id) && id !== selfId) gone.push(who)
    }
    if (gone.length === 0) return
    setQueue((prev) => [...prev, ...gone].slice(-MAX_QUEUED))
  }, [players, active, selfId])

  useEffect(() => {
    if (queue.length === 0) return
    const timer = setTimeout(() => setQueue((prev) => prev.slice(1)), SHOW_MS)
    return () => clearTimeout(timer)
  }, [queue])

  const showing = queue[0]
  if (!showing) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-xs truncate rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-bold text-content shadow-lg">
        {showing.character}{' '}
        <span dir="auto">{t('game.playerLeft', { name: showing.name })}</span>
      </div>
    </div>
  )
}

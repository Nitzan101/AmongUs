import { useEffect, useRef, useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { promoteHost, touchPresence } from './gameService'
import type { Game, Player } from './types'

/** How often each client reports "I'm still here". */
export const HEARTBEAT_MS = 8000
/** Miss this long and a player shows a "disconnected" tag to others. */
export const STALE_AFTER_MS = 20000
/** Miss this long as host and leadership migrates to another player. */
export const HOST_STALE_AFTER_MS = 45000

/** A ticking clock so staleness re-renders even when Firestore data hasn't changed. */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Whether a player's last heartbeat is older than the given threshold. */
export function isStale(
  lastSeen: Timestamp | null | undefined,
  nowMs: number,
  thresholdMs: number,
): boolean {
  if (!lastSeen) return false
  return nowMs - lastSeen.toMillis() > thresholdMs
}

/**
 * Keep this player's presence alive, and — if the host has gone quiet for a
 * while — let the one deterministically-chosen backup player promote
 * themselves, so a vanished host (closed tab, dead battery) never freezes
 * the game for everyone else.
 */
export function usePresence(
  pin: string | undefined,
  uid: string | undefined,
  game: Game | null,
  players: Player[],
): void {
  useEffect(() => {
    if (!pin || !uid) return
    touchPresence(pin, uid)
    const id = setInterval(() => touchPresence(pin, uid), HEARTBEAT_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') touchPresence(pin, uid)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pin, uid])

  // Read at tick time, not depended on.
  //
  // This is what made the whole mechanism dead code. `game` and `players` are
  // fresh objects out of every Firestore snapshot, and with a heartbeat per
  // player every eight seconds the snapshots never stop — so the effect tore
  // the interval down and built a new one long before its ten seconds were up.
  // The timer that takes over from a vanished host had, in practice, never
  // fired once.
  const latest = useRef({ game, players })
  latest.current = { game, players }

  useEffect(() => {
    if (!pin || !uid) return
    const id = setInterval(() => {
      const { game, players } = latest.current
      if (!game) return
      const now = Date.now()
      const host = players.find((p) => p.id === game.hostId)
      const hostStale = !host || isStale(host.lastSeen, now, HOST_STALE_AFTER_MS)
      if (!hostStale) return

      // Deterministic so every client picks the same backup without racing.
      const fresh = players.filter(
        (p) => p.id !== game.hostId && !isStale(p.lastSeen, now, STALE_AFTER_MS),
      )
      if (fresh.length === 0) return
      const candidate = fresh.reduce((a, b) => (a.id < b.id ? a : b))
      if (candidate.id === uid) {
        promoteHost(pin, uid).catch(() => {})
      }
    }, 10000)
    return () => clearInterval(id)
  }, [pin, uid])
}

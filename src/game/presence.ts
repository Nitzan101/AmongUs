import { useEffect, useRef, useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { promoteHost, touchPresence } from './gameService'
import type { Game, Player } from './types'

/** How often each client reports "I'm still here". */
export const HEARTBEAT_MS = 8000
/** Miss this long and a player shows a "disconnected" tag to others. */
export const STALE_AFTER_MS = 20000
/**
 * **Being quiet never costs you the room.**
 *
 * There is deliberately no timeout here any more. Any threshold is the same
 * bad bargain with a different number on it: sit still for longer than it and
 * you lose the room you are running, which is a normal thing to do at a party
 * — your phone locks, and a locked phone stops the heartbeat completely.
 *
 * Hosting changes for one reason only: the host is no longer in the room. They
 * left and handed it on, or their player document is gone. That is what the
 * check below waits for, and what `hostAbsent()` in the rules permits.
 */

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
 * Keep this player's presence alive, and make sure the room always has a host.
 *
 * The heartbeat drives the "disconnected" tag beside a player's name; it no
 * longer decides who is in charge. A host who is asleep, out of signal, or in
 * somebody's pocket is still the host when they come back.
 *
 * The takeover below is only for a room with *no* host at all — the host's
 * player document has gone without leadership being handed on. That should not
 * happen, since leaving passes the room on, but a delete that half-landed
 * would otherwise leave a table nobody can start a game at.
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
      // Nothing to repair until the player list has actually arrived; an empty
      // one during loading must not read as "the host has gone".
      if (!game || players.length === 0) return
      // The only thing that costs someone the room: not being in it.
      if (players.some((p) => p.id === game.hostId)) return

      // Deterministic so every client picks the same replacement without
      // racing. Preferring someone whose app is awake, but taking anyone
      // rather than leaving the table with no host at all.
      const now = Date.now()
      const awake = players.filter(
        (p) => !isStale(p.lastSeen, now, STALE_AFTER_MS),
      )
      const candidates = awake.length > 0 ? awake : players
      const candidate = candidates.reduce((a, b) => (a.id < b.id ? a : b))
      if (candidate.id === uid) {
        // Logged, not swallowed. A refusal here leaves the table with a host
        // who isn't there and no sign of why — the one failure that has to be
        // findable afterwards.
        promoteHost(pin, uid).catch((e) =>
          console.error('taking over as host failed', e),
        )
      }
    }, 10000)
    return () => clearInterval(id)
  }, [pin, uid])
}

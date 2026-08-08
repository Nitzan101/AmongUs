import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { kickPlayer } from '../game/gameService'
import type { Player } from '../game/types'

/**
 * Lets the host remove someone without waiting for the round to end — a phone
 * that died, or someone who had to leave and can't tap "leave" themselves.
 *
 * Collapsed by default and tucked below the phase view: kicking mid-game is
 * rare, and a permanently visible ✕ next to every player during a tense vote
 * is the kind of thing that gets pressed by accident.
 *
 * `kickPlayer` already pulls the player out of `aliveIds`, `turnOrder`,
 * `candidates` and any in-flight vote, so play continues cleanly; their own
 * device notices it is no longer in the player list and bounces to the lobby.
 */
export function HostPlayerManager({
  pin,
  players,
  uid,
}: {
  pin: string
  players: Player[]
  uid: string
}) {
  const { t } = useTranslation()
  const [busyId, setBusyId] = useState<string | null>(null)

  const others = players.filter((p) => p.id !== uid)
  if (others.length === 0) return null

  async function handleKick(player: Player) {
    if (!window.confirm(t('game.confirmKick', { name: player.name }))) return
    setBusyId(player.id)
    try {
      await kickPlayer(pin, player.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <details className="mt-3 rounded-2xl border border-line bg-surface-raised">
      <summary className="cursor-pointer list-none px-4 py-2 text-center text-sm text-content-muted hover:text-content">
        {t('game.managePlayers')}
      </summary>
      <ul className="flex flex-col gap-2 px-3 pb-3">
        {others.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-line p-2"
          >
            <span aria-hidden="true" className="text-xl">
              {p.character}
            </span>
            <span dir="auto" className="flex-1 truncate font-bold text-content">
              {p.name}
            </span>
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => handleKick(p)}
              className="rounded-full px-3 py-1 text-sm font-bold text-accent-500 hover:bg-accent-500/10 disabled:opacity-50"
            >
              {t('lobby.kick')}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

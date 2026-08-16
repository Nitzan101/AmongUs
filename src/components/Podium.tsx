import { useTranslation } from 'react-i18next'
import { colorForBadge } from '../game/badges'
import { rankPlayers } from '../game/podium'
import { BadgeIcon } from './BadgeIcon'
import type { Player } from '../game/types'

/** Height of each step, tallest in the middle, as the shape people expect. */
const STEP_HEIGHT: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' }
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
/** Left-to-right reading order of the steps: second, first, third. */
const STEP_ORDER = [2, 1, 3]

/**
 * How the evening ended: the top three, on steps, and everyone else beneath.
 *
 * Shown when the host calls it a night, and when the room runs out of unused
 * words. Deliberately a resting place rather than an exit — the room stays up
 * so people can look at it, argue about it, and take a photograph of it.
 */
export function Podium({ players }: { players: Player[] }) {
  const { t } = useTranslation()
  const ranked = rankPlayers(players)
  const top = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  return (
    <div className="flex flex-col items-center">
      <div className="text-6xl">🏆</div>
      <h1 className="mt-1 text-center text-3xl font-black text-content">
        {t('podium.title')}
      </h1>
      <p className="mt-1 text-center text-content-muted">{t('podium.subtitle')}</p>

      <div className="mt-8 flex w-full items-end justify-center gap-2">
        {STEP_ORDER.map((place) => {
          const player = top[place - 1]
          if (!player) return null
          return (
            <div key={player.id} className="flex flex-1 flex-col items-center">
              <div className="text-3xl">{MEDAL[place]}</div>
              <div className="text-4xl">{player.character}</div>
              <div
                dir="auto"
                className="mt-1 flex max-w-full items-center gap-1 truncate text-sm font-black text-content"
              >
                <span className="truncate">{player.name}</span>
                {player.displayedBadge && (
                  <BadgeIcon
                    icon={player.displayedBadge.icon}
                    color={colorForBadge(player.displayedBadge)}
                    filled={1}
                    size="sm"
                    showStars={false}
                  />
                )}
              </div>
              <div
                className={
                  'mt-1 flex w-full items-start justify-center rounded-t-xl border-2 border-b-0 border-brand-500 bg-brand-50 pt-2 text-xl font-black text-brand-600 dark:bg-brand-500/10 ' +
                  STEP_HEIGHT[place]
                }
              >
                {player.score}
              </div>
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <ul className="mt-6 flex w-full flex-col gap-2">
          {rest.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
            >
              <span className="w-5 text-center font-black text-content-muted">
                {i + 4}
              </span>
              <span className="text-2xl">{p.character}</span>
              <span
                dir="auto"
                className="flex flex-1 items-center gap-1.5 font-bold text-content"
              >
                {p.name}
                {p.displayedBadge && (
                  <BadgeIcon
                    icon={p.displayedBadge.icon}
                    color={colorForBadge(p.displayedBadge)}
                    filled={1}
                    size="sm"
                    showStars={false}
                  />
                )}
              </span>
              <span className="text-lg font-black text-brand-600">{p.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

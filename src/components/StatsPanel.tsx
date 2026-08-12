import { useTranslation } from 'react-i18next'
import {
  collectionProgress,
  computeTieredBadges,
  starsFor,
  TIER_COLORS,
  TIER_NAMES,
  TRACK_GROUPS,
  type TieredBadge,
} from '../game/badges'
import { averagePoints, normalizeStats, type Stats } from '../game/stats'
import type { PlayerBadge } from '../game/types'
import { BadgeIcon } from './BadgeIcon'

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface-raised px-2 py-3">
      <span className="text-2xl font-black text-content">{value}</span>
      <span className="mt-0.5 text-center text-xs leading-tight text-content-muted">
        {label}
      </span>
    </div>
  )
}

/** The tier a track actually holds — its ring and its stars. */
function heldColor(track: TieredBadge): string {
  return TIER_COLORS[track.tierName ?? 'bronze']
}

/**
 * The tier a track is climbing toward, for the progress arc drawn over the
 * ring. Once complete it is the held tier again, so a finished track is a
 * solid circle in its own colour rather than an arc in a tier it never has —
 * a two-rung track must never show gold.
 */
function nextColor(track: TieredBadge): string {
  if (track.next == null) return heldColor(track)
  return TIER_COLORS[TIER_NAMES[track.tier]]
}

/**
 * An account's record and the badges it has earned.
 *
 * **Grouped by subject rather than one flat list.** Sorting twenty-one circles
 * by rarity would put the hardest thing anyone has done at the top and say
 * nothing about where the room to improve is; the three shelves — turning up,
 * playing well, rare moments — answer that at a glance. Order *within* a shelf
 * is fixed rather than sorted by progress, so the grid stays in the same place
 * between visits instead of rearranging itself after every game.
 *
 * Each track collapses to a single circle at its current tier, so twenty-one
 * tracks stay twenty-one circles rather than exploding into sixty-three rows
 * as bronze, silver, gold and platinum are earned one at a time.
 */
export function StatsPanel({
  stats,
  activeBadge,
  onSetActive,
}: {
  stats?: Stats
  /** The badge currently shown in-room, if any — highlighted among the earned. */
  activeBadge?: PlayerBadge | null
  /** Tap an earned badge to display it. Omit to make the grid read-only. */
  onSetActive?: (badge: PlayerBadge) => void
}) {
  const { t } = useTranslation()
  const s = normalizeStats(stats)
  const tracks = computeTieredBadges(s)
  const collection = collectionProgress(s)

  return (
    <section className="mt-8">
      <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
        {t('stats.title')}
      </h2>

      {s.played === 0 ? (
        <p className="mt-2 rounded-2xl border-2 border-dashed border-line p-5 text-center text-sm text-content-muted">
          {t('stats.empty')}
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Figure value={s.played} label={t('stats.played')} />
          <Figure value={s.won} label={t('stats.won')} />
          <Figure value={averagePoints(s)} label={t('stats.avgPoints')} />
          <Figure value={s.asImposter} label={t('stats.asImposter')} />
          <Figure value={s.imposterWins} label={t('stats.imposterWins')} />
          <Figure value={s.hosted} label={t('stats.hosted')} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-surface-raised p-4">
        <BadgeIcon
          icon="🎖️"
          color={TIER_COLORS.platinum}
          filled={collection.progress}
          showStars={false}
          dim={collection.have === 0}
        />
        <div>
          <div className="text-lg font-black text-content">
            {t('stats.collection.count', {
              have: collection.have,
              total: collection.total,
            })}
          </div>
          <div className="text-sm text-content-muted">
            {t('stats.collection.hint')}
          </div>
        </div>
      </div>

      {onSetActive && (
        <p className="mt-4 px-1 text-xs text-content-muted">{t('stats.pickHint')}</p>
      )}

      {TRACK_GROUPS.map((group) => (
        <div key={group}>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
            {t(`stats.groups.${group}.name`)}
          </h2>
          <p className="px-1 text-xs text-content-muted">
            {t(`stats.groups.${group}.hint`)}
          </p>

          <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-5">
            {tracks
              .filter((track) => track.group === group)
              .map((track) => {
                const earned = track.tier > 0 && track.tierName
                const badge: PlayerBadge | null = earned
                  ? { key: track.key, icon: track.icon, tier: track.tierName! }
                  : null
                const isActive = badge != null && activeBadge?.key === badge.key
                const clickable = badge != null && Boolean(onSetActive)
                const caption =
                  track.next == null
                    ? t('stats.tracks.maxed')
                    : t(
                        track.nextKind === 'streak'
                          ? 'stats.tracks.fractionStreak'
                          : 'stats.tracks.fraction',
                        { value: track.value, next: track.next },
                      )

                return (
                  <button
                    key={track.key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => badge && onSetActive?.(badge)}
                    title={`${t(`stats.tracks.${track.key}.name`)} — ${t(
                      `stats.tracks.${track.key}.desc`,
                    )}`}
                    className={
                      'flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-colors ' +
                      (isActive
                        ? 'bg-brand-500/10 ring-2 ring-brand-500'
                        : clickable
                          ? 'hover:bg-surface-raised'
                          : '')
                    }
                  >
                    <BadgeIcon
                      icon={track.icon}
                      // Nothing earned yet means there is no tier to colour
                      // the ring with, so it stays neutral and only the arc
                      // creeping toward bronze shows any colour at all.
                      color={track.tier > 0 ? heldColor(track) : 'var(--line)'}
                      progressColor={nextColor(track)}
                      filled={track.next != null ? track.progress : 1}
                      stars={starsFor(track.tierName)}
                      dim={track.tier === 0 && track.progress === 0}
                    />
                    <span className="text-[11px] font-bold leading-tight text-content">
                      {t(`stats.tracks.${track.key}.name`)}
                    </span>
                    <span className="text-[10px] leading-tight text-content-muted">
                      {caption}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      ))}
    </section>
  )
}

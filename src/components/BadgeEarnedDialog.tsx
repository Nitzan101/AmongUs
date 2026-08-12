import { useTranslation } from 'react-i18next'
import { starsFor, TIER_COLORS, type BadgeDelta } from '../game/badges'
import type { PlayerBadge } from '../game/types'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { BadgeIcon } from './BadgeIcon'

/**
 * Announces whatever was just earned — one tier bump, or several at once from
 * a single game — the moment the game says so, rather than leaving it to be
 * discovered later on the profile screen by whoever thinks to go looking.
 *
 * Each one offers to become the badge shown beside your name in the room. The
 * one already being shown says so instead of offering again, so tapping
 * through the list can't quietly swap your badge for the same one twice.
 */
export function BadgeEarnedDialog({
  deltas,
  activeKey,
  onSetActive,
  onDismiss,
}: {
  deltas: BadgeDelta[]
  /** Which badge is currently on display, so it isn't offered again. */
  activeKey?: string | null
  onSetActive: (badge: PlayerBadge) => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  if (deltas.length === 0) return null

  const title =
    deltas.length === 1
      ? t('badgeEarned.titleOne')
      : t('badgeEarned.titleMany', { count: deltas.length })

  return (
    // `label` rather than `title`, because the heading here is a centred
    // celebration with an emoji above it, not the shell's plain one.
    <Dialog label={title} onDismiss={onDismiss}>
      <>
        <div className="text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="mt-1 text-xl font-black text-content">{title}</h2>
          <p className="mt-1 text-sm text-content-muted">
            {t('badgeEarned.subtitle')}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {deltas.map((d) => {
            const badge: PlayerBadge = { key: d.key, icon: d.icon, tier: d.tierName }
            const showing = activeKey === d.key
            return (
              <div
                key={d.key}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
              >
                <BadgeIcon
                  icon={d.icon}
                  color={TIER_COLORS[d.tierName]}
                  filled={1}
                  stars={starsFor(d.tierName)}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-content">
                    {t(`stats.tracks.${d.key}.name`)}
                  </div>
                  <div className="text-xs font-bold" style={{ color: TIER_COLORS[d.tierName] }}>
                    {t(`stats.tierNames.${d.tierName}`)}
                  </div>
                </div>
                {showing ? (
                  <span className="shrink-0 text-xs font-bold text-content-muted">
                    ✓ {t('badgeEarned.showing')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => onSetActive(badge)}
                    className="shrink-0"
                  >
                    {t('badgeEarned.setActive')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5">
          <Button fullWidth onClick={onDismiss}>
            {t('common.ok')}
          </Button>
        </div>
      </>
    </Dialog>
  )
}

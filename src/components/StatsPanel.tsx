import { useTranslation } from 'react-i18next'
import { averagePoints, badgesFor, EMPTY_STATS, type Stats } from '../game/stats'

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

/**
 * An account's record and the milestones it has reached.
 *
 * Unearned badges are shown greyed with their progress rather than hidden:
 * a locked "3/5 wins" is something to play towards, while an empty screen
 * says nothing. Someone who has never finished a game sees the whole set as a
 * preview of what's there.
 */
export function StatsPanel({ stats }: { stats?: Stats }) {
  const { t } = useTranslation()
  const s = stats ?? EMPTY_STATS
  const badges = badgesFor(s)

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

      <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
        {t('stats.badges')}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {badges.map((b) => (
          <li
            key={b.key}
            className={
              'flex items-center gap-3 rounded-2xl border p-3 ' +
              (b.earned
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-line bg-surface-raised')
            }
          >
            <span
              aria-hidden="true"
              className={'text-2xl ' + (b.earned ? '' : 'opacity-40 grayscale')}
            >
              {b.emoji}
            </span>
            <span className="flex-1">
              <span
                className={
                  'block text-sm font-bold ' +
                  (b.earned ? 'text-content' : 'text-content-muted')
                }
              >
                {t(`stats.badgeNames.${b.key}`)}
              </span>
              {!b.earned && b.need > 1 && (
                <span className="text-xs text-content-muted">
                  {b.have} / {b.need}
                </span>
              )}
            </span>
            {b.earned && (
              <span className="text-sm font-black text-brand-600">✓</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

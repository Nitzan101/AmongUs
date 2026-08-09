import { useTranslation } from 'react-i18next'
import type { Player } from '../game/types'

/**
 * Players arranged in a ring, the way they'd sit around a table.
 *
 * Two variants, because the app knows different things in each mode:
 *
 * - **`live`** (fully online) — clues are typed, so it knows exactly whose turn
 *   it is: that player is highlighted and pulsing, and everyone who has spoken
 *   gets a ✓.
 * - **`order`** (in person) — words are spoken aloud and the app hears none of
 *   it, so it can only show the seating and who begins. No pulse: nobody is
 *   being waited on by the app, and a pulsing seat would imply otherwise.
 */
export function TurnCircle({
  order,
  currentTurnId,
  doneIds,
  uid,
  eliminatedIds,
  staleIds,
  variant = 'live',
}: {
  /** Players in clue-giving order. */
  order: Player[]
  /** Whose turn it is now (undefined once everyone has spoken). `live` only. */
  currentTurnId?: string
  /** Players who have already given a clue this round. `live` only. */
  doneIds: Set<string>
  uid: string
  eliminatedIds: Set<string>
  staleIds: Set<string>
  variant?: 'live' | 'order'
}) {
  const { t } = useTranslation()
  const n = order.length
  const isLive = variant === 'live'
  // In person the app can't know who is speaking, so it marks who starts.
  // Skipping the eliminated matters from the second round on: whoever holds
  // the first seat may have been voted out, and announcing a dead player as
  // the one who begins would send the table to the wrong person.
  const highlightId = isLive
    ? currentTurnId
    : order.find((p) => !eliminatedIds.has(p.id))?.id
  const current = order.find((p) => p.id === highlightId)

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
      {/* The table */}
      <div className="absolute inset-[18%] rounded-full border-2 border-dashed border-line" />

      {/* Whose turn it is, or who begins */}
      <div className="absolute inset-[18%] flex flex-col items-center justify-center px-2 text-center">
        {current ? (
          <>
            <span className="text-xs font-bold uppercase tracking-wide text-content-muted">
              {isLive ? t('game.nowSpeaking') : t('game.startsWith')}
            </span>
            <span className="mt-1 text-3xl">{current.character}</span>
            <span className="mt-0.5 line-clamp-2 text-sm font-black text-content">
              {current.id === uid ? t('game.yourTurnShort') : current.name}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl">✅</span>
            <span className="mt-1 text-sm font-bold text-content-muted">
              {t('game.everyoneSpoke')}
            </span>
          </>
        )}
      </div>

      {/* Seats around the ring, starting at the top and going clockwise */}
      {order.map((p, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        const radius = 41
        const left = 50 + radius * Math.cos(angle)
        const top = 50 + radius * Math.sin(angle)
        const isCurrent = p.id === highlightId
        // In person nobody has "spoken" as far as the app is concerned.
        const hasSpoken = isLive && doneIds.has(p.id)
        const isOut = eliminatedIds.has(p.id)

        return (
          <div
            key={p.id}
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          >
            <div
              className={
                'relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl transition-all ' +
                (isCurrent
                  ? 'scale-110 border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/30 dark:bg-brand-500/20' +
                    // Pulsing means "we're waiting on you", which is only true
                    // when the app actually knows whose turn it is.
                    (isLive ? ' animate-suspense-pulse' : '')
                  : hasSpoken
                    ? 'border-brand-300 bg-surface-raised'
                    : 'border-line bg-surface-raised') +
                (isOut ? ' opacity-40 grayscale' : '')
              }
            >
              {p.character}
              {hasSpoken && !isCurrent && (
                <span className="absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                  ✓
                </span>
              )}
              <span className="absolute -top-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full bg-content-muted/80 text-[10px] font-black text-surface">
                {i + 1}
              </span>
            </div>
            <span
              className={
                'mt-1 w-full truncate text-center text-[11px] leading-tight ' +
                (isCurrent
                  ? 'font-black text-content'
                  : 'font-medium text-content-muted') +
                (isOut ? ' line-through' : '')
              }
              title={p.name}
            >
              {p.id === uid ? t('lobby.you') : p.name}
            </span>
            {staleIds.has(p.id) && !isOut && (
              <span className="text-[9px] font-bold text-content-muted">
                {t('lobby.disconnected')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

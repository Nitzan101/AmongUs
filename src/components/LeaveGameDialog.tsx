import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import type { Player } from '../game/types'

/**
 * Confirm leaving a game. A regular player just confirms; the host must first
 * decide what happens to the game — hand it to a specific player, or close it
 * for everyone.
 */
export function LeaveGameDialog({
  isHost,
  others,
  onCancel,
  onLeave,
  onClose,
}: {
  isHost: boolean
  /** Everyone except the leaver — possible successors. */
  others: Player[]
  onCancel: () => void
  /** Leave, optionally handing leadership to the chosen player. */
  onLeave: (newHostId?: string) => void
  /** End the game for everyone. */
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [successor, setSuccessor] = useState<string>(others[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  function run(action: () => void) {
    setBusy(true)
    action()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <h2 className="text-xl font-black text-content">
          {t('leave.title')}
        </h2>

        {!isHost || others.length === 0 ? (
          <>
            <p className="mt-1 text-sm text-content-muted">
              {others.length === 0 ? t('leave.lastPlayerBody') : t('leave.playerBody')}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="accent"
                fullWidth
                disabled={busy}
                onClick={() => run(() => onLeave())}
              >
                {t('leave.confirm')}
              </Button>
              <Button variant="ghost" fullWidth onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-content-muted">
              {t('leave.hostBody')}
            </p>

            <div className="mt-4">
              <span className="px-1 text-sm font-bold text-content-muted">
                {t('leave.chooseSuccessor')}
              </span>
              <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {others.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSuccessor(p.id)}
                    aria-pressed={p.id === successor}
                    className={
                      'flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition-colors ' +
                      (p.id === successor
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                        : 'border-line bg-surface-raised hover:border-brand-300')
                    }
                  >
                    <span className="text-2xl">{p.character}</span>
                    <span className="flex-1 font-bold text-content">{p.name}</span>
                    {p.id === successor && <span className="text-brand-600">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                fullWidth
                disabled={busy || !successor}
                onClick={() => run(() => onLeave(successor))}
              >
                {t('leave.passAndLeave')}
              </Button>
              <Button
                variant="accent"
                fullWidth
                disabled={busy}
                onClick={() => run(onClose)}
              >
                {t('leave.closeGame')}
              </Button>
              <Button variant="ghost" fullWidth onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

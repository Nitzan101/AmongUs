import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { OptionCard } from './ui/Card'
import { Dialog } from './ui/Dialog'
import type { WordSetHandover } from '../game/gameService'
import type { Player } from '../game/types'
import { DEFAULT_SET_ICON, type WordSet } from '../game/wordSets'

/**
 * Confirm leaving a game. A regular player just confirms; the host must first
 * decide what happens to the game — hand it to a specific player, or close it
 * for everyone.
 */
export function LeaveGameDialog({
  isHost,
  others,
  myWordSet,
  midGame,
  onCancel,
  onLeave,
  onClose,
}: {
  isHost: boolean
  /** Everyone except the leaver — possible successors. */
  others: Player[]
  /**
   * The room's custom set, when it belongs to the person leaving. Their set
   * goes with them unless they say otherwise, so this is the one chance to
   * ask — the next host can't even see it in their own list.
   */
  myWordSet?: WordSet | null
  /** A game is running, so taking the set back waits until it ends. */
  midGame?: boolean
  onCancel: () => void
  /** Leave, optionally handing leadership and the word set on. */
  onLeave: (newHostId?: string, wordSet?: WordSetHandover) => void
  /** End the game for everyone. */
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [successor, setSuccessor] = useState<string>(others[0]?.id ?? '')
  // Defaults to lending it. The room is playing with this set right now and
  // everyone has already seen its words, so carrying on is the answer that
  // changes nothing — taking it back is the deliberate choice.
  const [keepSet, setKeepSet] = useState(true)
  const [busy, setBusy] = useState(false)

  function run(action: () => void) {
    setBusy(true)
    action()
  }

  return (
    // Escape and a tap outside cancel: staying in the room is the harmless
    // answer, and every other button here is one you can't take back.
    <Dialog title={t('leave.title')} onDismiss={onCancel}>
      <>
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

            {myWordSet && (
              <div className="mt-4">
                <span className="px-1 text-sm font-bold text-content-muted">
                  {t('leave.wordSetQuestion', { name: myWordSet.name })}
                </span>
                <div className="mt-2 flex flex-col gap-2">
                  <OptionCard
                    icon={myWordSet.icon || DEFAULT_SET_ICON}
                    title={t('leave.wordSetKeep')}
                    description={t('leave.wordSetKeepDesc')}
                    selected={keepSet}
                    onSelect={() => setKeepSet(true)}
                  />
                  <OptionCard
                    icon="🎲"
                    title={t('leave.wordSetRevoke')}
                    description={
                      midGame
                        ? t('leave.wordSetRevokeMidGameDesc')
                        : t('leave.wordSetRevokeDesc')
                    }
                    selected={!keepSet}
                    onSelect={() => setKeepSet(false)}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <Button
                fullWidth
                disabled={busy || !successor}
                onClick={() =>
                  run(() =>
                    onLeave(
                      successor,
                      myWordSet ? (keepSet ? 'keep' : 'revoke') : undefined,
                    ),
                  )
                }
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
      </>
    </Dialog>
  )
}

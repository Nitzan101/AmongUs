import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { finishRoom, skipGame } from '../game/gameService'
import { report } from '../lib/reportError'
import { Button } from './ui/Button'

/**
 * The two ways a host ends things early, tucked behind a summary.
 *
 * **Skip this game** is for the round that stops being a game — someone has to
 * leave, the words were a bad draw, everyone has stopped paying attention. It
 * throws the round away and scores nothing, because nothing really happened.
 *
 * **Finish for tonight** is the opposite: the games were real, and this is the
 * end of them. The room stops on its podium rather than being deleted, so the
 * scores stay up.
 *
 * Both are collapsed and both confirm. They are irreversible in the way that
 * matters — you cannot un-skip a round anyone has already seen — and they sit
 * on the same screen as the ordinary Continue button.
 */
export function HostGameControls({ pin }: { pin: string }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  function run(action: () => Promise<void>, confirmKey: string, what: string) {
    if (!window.confirm(t(confirmKey))) return
    setBusy(true)
    action()
      .catch(report(what))
      .finally(() => setBusy(false))
  }

  return (
    <details className="mt-3 rounded-2xl border border-line bg-surface-raised">
      <summary className="cursor-pointer list-none px-4 py-2 text-center text-sm text-content-muted hover:text-content">
        {t('game.endOptions')}
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <p className="px-1 text-xs text-content-muted">
          {t('game.endOptionsHint')}
        </p>
        <Button
          variant="secondary"
          fullWidth
          disabled={busy}
          onClick={() =>
            run(() => skipGame(pin), 'game.confirmSkipGame', 'skip this game')
          }
        >
          ⏭️ {t('game.skipGame')}
        </Button>
        <Button
          variant="accent"
          fullWidth
          disabled={busy}
          onClick={() =>
            run(() => finishRoom(pin), 'game.confirmFinishAll', 'finish the room')
          }
        >
          🏆 {t('game.finishAll')}
        </Button>
      </div>
    </details>
  )
}

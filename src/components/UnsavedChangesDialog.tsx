import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

/**
 * Shown when someone tries to leave a form with unsaved edits.
 *
 * Staying is the safe choice, so it gets the primary button; discarding is
 * the destructive one and is styled as such. Escape and a tap outside stay
 * too — this dialog exists precisely because work is easy to lose by accident.
 */
export function UnsavedChangesDialog({
  onStay,
  onDiscard,
}: {
  onStay: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog title={t('unsaved.title')} onDismiss={onStay}>
      <p className="mt-2 text-content-muted">{t('unsaved.body')}</p>

      <div className="mt-5 flex flex-col gap-2">
        <Button size="lg" fullWidth onClick={onStay}>
          {t('unsaved.stay')}
        </Button>
        <Button variant="ghost" fullWidth onClick={onDiscard}>
          {t('unsaved.discard')}
        </Button>
      </div>
    </Dialog>
  )
}

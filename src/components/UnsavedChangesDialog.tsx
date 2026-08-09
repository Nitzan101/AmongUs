import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'

/**
 * Shown when someone tries to leave a form with unsaved edits.
 *
 * Staying is the safe choice, so it gets the primary button; discarding is
 * the destructive one and is styled as such.
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <h2 className="text-xl font-black text-content">
          {t('unsaved.title')}
        </h2>
        <p className="mt-2 text-content-muted">{t('unsaved.body')}</p>

        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={onStay}>
            {t('unsaved.stay')}
          </Button>
          <Button variant="ghost" fullWidth onClick={onDiscard}>
            {t('unsaved.discard')}
          </Button>
        </div>
      </div>
    </div>
  )
}

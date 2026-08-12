import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The shell every dialog in the app sits in.
 *
 * It exists because four dialogs had each grown their own copy of the same
 * backdrop, and all four were dead ends: no Escape, no tapping outside, and
 * Tab wandering off behind the overlay into the page underneath. On a phone
 * that mostly means the Cancel button is the only way out; with a screen
 * reader it means the dialog barely announces itself at all.
 *
 * `onDismiss` is the *safe* answer to "get me out of here" — Cancel, Stay,
 * Not now — never the destructive one, because Escape and a stray tap on the
 * backdrop are both things people do by accident.
 */
export function Dialog({
  title,
  label,
  onDismiss,
  panelClassName = 'w-full max-w-md',
  children,
}: {
  /** Rendered as the heading, and used as the dialog's accessible name. */
  title?: string
  /** For dialogs that draw their own header: the accessible name alone. */
  label?: string
  /** Escape, and a tap on the backdrop. Give it the harmless option. */
  onDismiss: () => void
  panelClassName?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Read at key time rather than depended on.
  //
  // Callers pass an inline arrow, so `onDismiss` is a new function on every
  // render of the screen underneath — and the lobby re-renders every five
  // seconds on its presence tick. As a dependency it re-ran this effect that
  // often, pulling focus back to the panel: you could not type a nickname
  // without losing the caret mid-word.
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    // The panel itself, not the first control: opening a dialog on the Leave
    // button pre-selected would make Enter confirm something nobody read.
    panelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!items || items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      // Wrap at both ends, so focus can never reach the page behind.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      // A tap that starts inside the panel and drifts onto the backdrop —
      // scrolling a list of players with a finger — is not a tap outside.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        className={
          'max-h-full overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl outline-none ' +
          panelClassName
        }
      >
        {title && (
          <h2 id={titleId} className="text-xl font-black text-content">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface-raised p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

interface OptionCardProps {
  title: string
  description?: string
  icon?: ReactNode
  selected: boolean
  onSelect: () => void
}

/** A tappable card used for choosing one option out of a group. */
export function OptionCard({
  title,
  description,
  icon,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-start transition-colors ' +
        (selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-line bg-surface-raised hover:border-brand-300')
      }
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <span className="flex-1">
        <span className="block font-bold text-content">{title}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-content-muted">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={
          'mt-1 h-5 w-5 shrink-0 rounded-full border-2 ' +
          (selected
            ? 'border-brand-500 bg-brand-500'
            : 'border-line bg-transparent')
        }
      >
        {selected && (
          <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-0.5">
            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z" />
          </svg>
        )}
      </span>
    </button>
  )
}

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CHARACTERS } from '../game/characters'

/**
 * The shared "who are you in this game?" fields — nickname + character picker.
 * Used when joining, when creating a game, and when editing account defaults,
 * so the choice looks and behaves identically everywhere.
 *
 * **The characters stay behind a tap.** There are sixty-four of them now, and
 * laid out flat they were several screens of grid between the nickname box and
 * whatever button came next — on a phone you could no longer see both the name
 * you were typing and the button that submitted it. Most people keep the one
 * they have, so the collapsed state shows exactly that, and the whole set is
 * one tap away for the people who want to look.
 *
 * Opened in place rather than in a dialog, because one of the three callers is
 * itself a dialog and stacking two of those means two focus traps and an
 * Escape key that closes the wrong one.
 */
export function IdentityFields({
  nickname,
  onNicknameChange,
  character,
  onCharacterChange,
  nicknameLabel,
  characterLabel,
}: {
  nickname: string
  onNicknameChange: (value: string) => void
  character: string
  onCharacterChange: (value: string) => void
  nicknameLabel?: string
  characterLabel?: string
}) {
  const { t } = useTranslation()
  const [picking, setPicking] = useState(false)
  const gridId = useId()

  return (
    <>
      <label className="block">
        <span className="px-1 text-sm font-bold text-content-muted">
          {nicknameLabel ?? t('join.nicknameLabel')}
        </span>
        <input
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value.slice(0, 20))}
          placeholder={t('join.nicknamePlaceholder')}
          className="mt-1 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-lg text-content outline-none focus:border-brand-500"
        />
      </label>

      <div className="mt-4">
        <span className="px-1 text-sm font-bold text-content-muted">
          {characterLabel ?? t('join.pickCharacter')}
        </span>

        {/* Collapsed: the one you have, and a way to change it. */}
        <button
          type="button"
          onClick={() => setPicking((open) => !open)}
          aria-expanded={picking}
          aria-controls={gridId}
          className={
            'mt-2 flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-start transition-colors ' +
            (picking
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-line bg-surface-raised hover:border-brand-300')
          }
        >
          <span className="text-4xl">{character}</span>
          <span className="flex-1 text-sm font-bold text-brand-600">
            {picking ? t('join.characterDone') : t('join.characterChange')}
          </span>
          <span aria-hidden className="text-content-muted">
            {picking ? '▲' : '▼'}
          </span>
        </button>

        {picking && (
          <div
            id={gridId}
            // Capped and scrollable: sixty-four tiles must not push the button
            // you came here to press off the bottom of the screen.
            className="mt-2 grid max-h-64 grid-cols-5 gap-2 overflow-y-auto rounded-2xl border border-line bg-surface p-2"
          >
            {CHARACTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onCharacterChange(c)
                  setPicking(false)
                }}
                aria-pressed={c === character}
                className={
                  'aspect-square rounded-2xl border-2 text-3xl transition-colors ' +
                  (c === character
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-line bg-surface-raised hover:border-brand-300')
                }
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

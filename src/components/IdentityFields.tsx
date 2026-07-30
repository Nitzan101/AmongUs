import { useTranslation } from 'react-i18next'
import { CHARACTERS } from '../game/characters'

/**
 * The shared "who are you in this game?" fields — nickname + character picker.
 * Used when joining, when creating a game, and when editing account defaults,
 * so the choice looks and behaves identically everywhere.
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
        <div className="mt-2 grid grid-cols-5 gap-2">
          {CHARACTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCharacterChange(c)}
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
      </div>
    </>
  )
}

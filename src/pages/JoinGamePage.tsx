import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const CHARACTERS = ['🦊', '🐼', '🐸', '🦄', '🐙', '🐧', '🦁', '🐨', '🐵', '🦉']

export function JoinGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState(CHARACTERS[0])

  const canJoin = pin.trim().length > 0 && nickname.trim().length > 0

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">{t('join.title')}</h1>
      <p className="mt-1 text-content-muted">{t('join.subtitle')}</p>

      <label className="mt-6 block">
        <span className="px-1 text-sm font-bold text-content-muted">
          {t('join.pinLabel')}
        </span>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="000000"
          className="mt-1 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-content outline-none focus:border-brand-500"
        />
      </label>

      <label className="mt-4 block">
        <span className="px-1 text-sm font-bold text-content-muted">
          {t('join.nicknameLabel')}
        </span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder={t('join.nicknamePlaceholder')}
          className="mt-1 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-lg text-content outline-none focus:border-brand-500"
        />
      </label>

      <div className="mt-4">
        <span className="px-1 text-sm font-bold text-content-muted">
          {t('join.pickCharacter')}
        </span>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {CHARACTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCharacter(c)}
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

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          fullWidth
          disabled={!canJoin}
          onClick={() => navigate('/lobby')}
        >
          {t('join.submit')}
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { CHARACTERS } from '../game/characters'
import { GameError, joinGame } from '../game/gameService'

function errorKey(err: unknown): string {
  const code = err instanceof GameError ? err.code : ''
  switch (code) {
    case 'game-not-found':
      return 'join.errors.notFound'
    case 'game-started':
      return 'join.errors.started'
    case 'name-taken':
      return 'join.errors.nameTaken'
    case 'not-configured':
      return 'join.errors.notConfigured'
    default:
      return 'join.errors.generic'
  }
}

export function JoinGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()

  const [pin, setPin] = useState(params.pin ?? '')
  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState<string>(CHARACTERS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canJoin = pin.trim().length === 6 && nickname.trim().length > 0

  async function handleJoin() {
    setError(null)
    setBusy(true)
    try {
      await joinGame(pin.trim(), nickname, character)
      navigate(`/lobby/${pin.trim()}`)
    } catch (err) {
      setError(t(errorKey(err)))
      setBusy(false)
    }
  }

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

      {error && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          fullWidth
          disabled={!canJoin || busy}
          onClick={handleJoin}
        >
          {busy ? t('join.joining') : t('join.submit')}
        </Button>
      </div>
    </div>
  )
}

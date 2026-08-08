import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { checkGameJoinable } from '../game/gameService'
import { joinErrorKey } from '../game/joinErrors'

/** Step 1 of joining: enter the PIN. The name/character step comes next. */
export function JoinPinPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    setError(null)
    setBusy(true)
    try {
      const { alreadyJoined } = await checkGameJoinable(pin.trim())
      // Already in this game? Straight back in — no point re-picking a name
      // you already have. (The lobby forwards to the game if it's running.)
      navigate(alreadyJoined ? `/lobby/${pin.trim()}` : `/join/${pin.trim()}`)
    } catch (err) {
      setError(t(joinErrorKey(err)))
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && pin.trim().length === 6 && !busy) {
              handleNext()
            }
          }}
          inputMode="numeric"
          autoFocus
          placeholder="000000"
          className="mt-1 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-content outline-none focus:border-brand-500"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          fullWidth
          disabled={pin.trim().length !== 6 || busy}
          onClick={handleNext}
        >
          {busy ? t('join.checking') : t('common.next')}
        </Button>
      </div>
    </div>
  )
}

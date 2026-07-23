import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { authErrorKey } from '../auth/authErrors'

const inputClass =
  'mt-1 w-full rounded-2xl border-2 border-line bg-surface-raised px-4 py-3 text-content outline-none focus:border-brand-500'

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, configured, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth()

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Once signed in, leave this screen.
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const isSignUp = mode === 'signUp'

  async function run(action: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(t(authErrorKey(err)))
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(() =>
      isSignUp
        ? signUpWithEmail(name.trim(), email.trim(), password)
        : signInWithEmail(email.trim(), password),
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">
        {t(isSignUp ? 'auth.signUpTitle' : 'auth.signInTitle')}
      </h1>
      <p className="mt-1 text-content-muted">
        {t(isSignUp ? 'auth.signUpSubtitle' : 'auth.signInSubtitle')}
      </p>

      {!configured && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-sunny-400 bg-sunny-400/10 p-4 text-sm text-content">
          {t('auth.notConfigured')}
        </div>
      )}

      <div className="mt-6">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={busy || !configured}
          onClick={() => run(signInWithGoogle)}
        >
          <span className="text-xl">🇬</span> {t('auth.google')}
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-sm text-content-muted">
        <span className="h-px flex-1 bg-line" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {isSignUp && (
          <label className="block">
            <span className="px-1 text-sm font-bold text-content-muted">
              {t('auth.name')}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
              autoComplete="name"
              className={inputClass}
            />
          </label>
        )}

        <label className="block">
          <span className="px-1 text-sm font-bold text-content-muted">
            {t('auth.email')}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="px-1 text-sm font-bold text-content-muted">
            {t('auth.password')}
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className={inputClass}
          />
        </label>

        {error && (
          <p className="rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={busy || !configured}
          className="mt-1"
        >
          {t(isSignUp ? 'auth.signUpButton' : 'auth.signInButton')}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setError(null)
          setMode(isSignUp ? 'signIn' : 'signUp')
        }}
        className="mt-6 text-center text-sm font-bold text-brand-600 hover:text-brand-500"
      >
        {t(isSignUp ? 'auth.toSignIn' : 'auth.toSignUp')}
      </button>
    </div>
  )
}

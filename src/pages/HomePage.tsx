import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { findMyActiveGame, hasRememberedGame } from '../game/gameService'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut, loading } = useAuth()
  const [resuming, setResuming] = useState(hasRememberedGame)

  const displayName = user?.displayName || user?.email?.split('@')[0] || ''

  // If this device was mid-game (closed tab, phone locked, etc.), drop
  // straight back into it instead of showing the home screen. Guarded so a
  // failed or hung check (e.g. a network hiccup right as the page reloaded)
  // can never leave the user stuck on a spinner forever.
  useEffect(() => {
    if (loading) return
    let cancelled = false
    if (!user) {
      setResuming(false)
      return
    }

    const stopWaiting = () => {
      if (!cancelled) setResuming(false)
    }
    const safetyTimeout = setTimeout(stopWaiting, 6000)

    findMyActiveGame(user.uid)
      .then((active) => {
        if (cancelled) return
        clearTimeout(safetyTimeout)
        if (active) {
          navigate(`/lobby/${active.pin}`, { replace: true })
        } else {
          setResuming(false)
        }
      })
      .catch(() => {
        clearTimeout(safetyTimeout)
        stopWaiting()
      })

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
    }
  }, [loading, user, navigate])

  if (resuming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">
          {t('lobby.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-7xl">🕵️</div>
        <h1 className="text-4xl font-black text-content">
          {t('common.appName')}
        </h1>
        <p className="max-w-xs text-lg text-content-muted">{t('home.tagline')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth onClick={() => navigate('/create')}>
          {t('home.createGame')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          onClick={() => navigate('/join')}
        >
          {t('home.joinGame')}
        </Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/rules')}>
          {t('home.howToPlay')}
        </Button>
      </div>

      {user ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4">
          {/* dir="auto" picks the direction from the text itself, so a Hebrew
              name in an English greeting (or vice versa) keeps its punctuation
              in the right place. */}
          <p
            dir="auto"
            className="truncate text-center font-bold text-content"
          >
            {t('auth.greeting', { name: displayName })}
          </p>

          {!user.isAnonymous && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/profile')}
              >
                {t('profile.title')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/sets')}
              >
                {t('sets.title')}
              </Button>
            </div>
          )}

          <Button variant="ghost" fullWidth onClick={() => signOut()}>
            {t('auth.signOut')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-surface-raised p-4 text-center">
          <p className="text-sm text-content-muted">{t('home.signInHint')}</p>
          <Button
            variant="ghost"
            className="mt-1 text-brand-600"
            onClick={() => navigate('/signin')}
          >
            {t('home.signIn')} →
          </Button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import { createGame } from '../game/gameService'
import { randomCharacter } from '../game/characters'
import { useProfile } from '../game/profile'
import { optionsFromProfile } from '../game/gameOptions'
import type { Language } from '../i18n'

/**
 * Creating a room is one tap.
 *
 * Sharing the link is the urgent part — friends can't join until it exists —
 * while the settings are patient, so they moved to the lobby where the host
 * can adjust them during the dead time while people arrive. The host's last
 * choices come from their profile, so a returning host usually changes
 * nothing at all.
 *
 * This screen therefore has no form: it exists to gate on having an account,
 * then to create and get out of the way.
 */
export function CreateGamePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isGuest, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.uid, isGuest)

  const [error, setError] = useState<string | null>(null)
  // Creating writes a room; a double-fire would leave an orphan behind.
  const started = useRef(false)

  useEffect(() => {
    if (authLoading || profileLoading || isGuest || started.current) return
    started.current = true

    const uiLanguage = (i18n.resolvedLanguage ?? 'en') as Language
    const name =
      profile?.nickname?.trim() ||
      user!.displayName ||
      user!.email?.split('@')[0] ||
      t('auth.guest')

    createGame(optionsFromProfile(profile?.gameOptions, uiLanguage), {
      uid: user!.uid,
      name,
      character: profile?.character || randomCharacter(),
    })
      .then((pin) => navigate(`/lobby/${pin}`, { replace: true }))
      .catch(() => {
        // Let them try again rather than stranding them on a dead spinner.
        started.current = false
        setError(t('create.createError'))
      })
  }, [authLoading, profileLoading, isGuest, profile, user, i18n, navigate, t])

  // Hosting requires a real (non-guest) account.
  if (!authLoading && isGuest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🔑</div>
        <h1 className="text-2xl font-black text-content">
          {t('create.needAccountTitle')}
        </h1>
        <p className="max-w-xs text-content-muted">
          {t('create.needAccountBody')}
        </p>
        <Button size="lg" onClick={() => navigate('/signin')}>
          {t('home.signIn')}
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">😕</div>
        <p className="max-w-xs font-medium text-accent-600">{error}</p>
        <Button size="lg" onClick={() => navigate(0)}>
          {t('create.submit')}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="animate-pulse text-5xl">🕵️</div>
      <div className="animate-pulse text-content-muted">
        {t('create.creating')}
      </div>
    </div>
  )
}

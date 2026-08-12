import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ProfileIcon, WordSetsIcon } from '../components/NavIcons'
import { useAuth } from '../auth/AuthContext'
import {
  findMyActiveGame,
  hasRememberedGame,
  leaveGame,
} from '../game/gameService'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isGuest, signOut, loading } = useAuth()
  const [resuming, setResuming] = useState(hasRememberedGame)
  const [signingOut, setSigningOut] = useState(false)

  /**
   * Leave any room on the way out.
   *
   * Signing out doesn't end the session so much as swap it for a different
   * one, and the player document stays exactly where it was — holding a seat,
   * votable, and eligible to be dealt the imposter card next game. An imposter
   * nobody in the room can catch, that only the host can remove. Leaving first
   * hands on hosting and tidies the round, the same as the Leave button.
   *
   * Reachable when the resume check didn't manage to bounce us into the room:
   * a network hiccup on reload, or a second tab.
   */
  async function handleSignOut() {
    setSigningOut(true)
    try {
      if (user) {
        const active = await findMyActiveGame(user.uid)
        if (active) await leaveGame(active.pin, user.uid)
      }
    } catch (e) {
      // Never let tidying up trap someone in an account they want out of.
      console.error('leaving the room before signing out failed', e)
    }
    await signOut().catch(() => {})
    setSigningOut(false)
  }

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

      {/* A guest gets the greeting but is offered a way *in*, not out: they
          never signed in, so "Sign out" was nonsense — and it was the only
          action they had. */}
      {!isGuest ? (
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

          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/profile')}
            >
              <ProfileIcon />
              {t('profile.title')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/sets')}
            >
              <WordSetsIcon />
              {t('sets.title')}
            </Button>
          </div>

          <Button
            variant="ghost"
            fullWidth
            disabled={signingOut}
            onClick={handleSignOut}
          >
            {t('auth.signOut')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-surface-raised p-4 text-center">
          {/* Only greet someone who's actually been playing as a guest; a
              first-time visitor has no name to be greeted by. */}
          {user && (
            <p className="mb-1 font-bold text-content">
              {t('auth.greeting', { name: t('auth.guest') })}
            </p>
          )}
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

      {/* Which build this device is actually running. Small, but it settles
          the question a screenshot can't: is this a bug, or a phone still
          serving cached code from before the fix? */}
      <p className="mt-4 text-center text-[10px] text-content-muted/60">
        {__BUILD_ID__}
      </p>
    </div>
  )
}

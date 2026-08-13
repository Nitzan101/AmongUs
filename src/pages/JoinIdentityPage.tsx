import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { IdentityFields } from '../components/IdentityFields'
import { useAuth } from '../auth/AuthContext'
import { randomCharacter } from '../game/characters'
import { checkGameJoinable, joinGame, MAX_PLAYERS } from '../game/gameService'
import { joinErrorKey } from '../game/joinErrors'
import { useProfile } from '../game/profile'

/**
 * Step 2 of joining: pick your name and character. Share links land here
 * directly, so the PIN is re-checked before the form is shown — a game that
 * has already started reports that instead of taking a wasted name.
 */
export function JoinIdentityPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const { user, isGuest } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.uid, isGuest)

  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState<string>(randomCharacter)
  const [busy, setBusy] = useState(false)
  // Both held as translation keys rather than finished sentences, so that
  // setting one never needs `t` in scope — which is what dragged `t` into the
  // dependency list below. They also follow the language when it changes now,
  // instead of staying stuck in whichever one they were raised in.
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [blockedKey, setBlockedKey] = useState<string | null>(null)
  const [inProgress, setInProgress] = useState(false)

  // Re-check the PIN (share links arrive here without passing through step 1).
  // A player who is already in the game skips this screen entirely — a shared
  // link tapped a second time shouldn't ask them to pick a name all over again.
  useEffect(() => {
    let cancelled = false
    checkGameJoinable(pin)
      .then(({ alreadyJoined, inProgress: running, full }) => {
        if (cancelled) return
        if (alreadyJoined) {
          navigate(`/lobby/${pin}`, { replace: true })
          return
        }
        // Say so before the name and character, not after: filling in a form
        // only to be told there was never a seat is the rudest possible order.
        if (full) {
          setBlockedKey('join.errors.full')
          setChecking(false)
          return
        }
        setInProgress(running)
        setChecking(false)
      })
      .catch((err) => {
        if (cancelled) return
        setBlockedKey(joinErrorKey(err))
        setChecking(false)
      })
    return () => {
      cancelled = true
    }
    // Not keyed on `t`: a language switch would otherwise re-run the whole
    // PIN check for nothing. Harmless here, but it is the same mistake that
    // made the word-set editor throw away unsaved edits.
  }, [pin, navigate])

  // Pre-fill from the account's saved defaults once they've loaded.
  useEffect(() => {
    if (profileLoading) return
    if (profile?.nickname) setNickname(profile.nickname)
    else if (user && !isGuest) {
      setNickname(user.displayName || user.email?.split('@')[0] || '')
    }
    if (profile?.character) setCharacter(profile.character)
  }, [profile, profileLoading, user, isGuest])

  async function handleJoin() {
    setErrorKey(null)
    setBusy(true)
    try {
      await joinGame(pin, nickname, character, profile?.displayedBadge)
      navigate(`/lobby/${pin}`)
    } catch (err) {
      setErrorKey(joinErrorKey(err))
      setBusy(false)
    }
  }

  if (checking || profileLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">
          {t('lobby.loading')}
        </div>
      </div>
    )
  }

  if (blockedKey) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🚪</div>
        <h1 className="text-2xl font-black text-content">
          {t(blockedKey, { count: MAX_PLAYERS })}
        </h1>
        <Button onClick={() => navigate('/join')}>{t('join.tryAnother')}</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">
        {t('join.identityTitle')}
      </h1>
      <p className="mt-1 text-content-muted">
        {t('join.identitySubtitle', { pin })}
      </p>

      {/* Say so before they fill anything in, so nobody joins expecting to
          play immediately and thinks the app is broken. */}
      {inProgress && (
        <p className="mt-4 rounded-xl bg-sunny-400/15 px-3 py-2 text-sm font-medium text-content">
          {t('join.inProgress')}
        </p>
      )}

      <div className="mt-6">
        <IdentityFields
          nickname={nickname}
          onNicknameChange={setNickname}
          character={character}
          onCharacterChange={setCharacter}
        />
      </div>

      {errorKey && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {t(errorKey, { count: MAX_PLAYERS })}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          fullWidth
          disabled={nickname.trim().length === 0 || busy}
          onClick={handleJoin}
        >
          {busy ? t('join.joining') : t('join.submit')}
        </Button>
      </div>
    </div>
  )
}

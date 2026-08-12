import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { IdentityFields } from '../components/IdentityFields'
import { ProfileIcon } from '../components/NavIcons'
import { StatsPanel } from '../components/StatsPanel'
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog'
import { useUnsavedChanges } from '../game/useUnsavedChanges'
import { useAuth } from '../auth/AuthContext'
import { randomCharacter } from '../game/characters'
import { saveProfile, useProfile } from '../game/profile'
import type { PlayerBadge } from '../game/types'

/** Edit the account's default nickname and character (both optional). */
export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isGuest, loading: authLoading } = useAuth()
  const { profile, loading } = useProfile(user?.uid, isGuest)

  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState<string>(randomCharacter)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // `useProfile` loads once and never refreshes, so picking a badge below
  // would otherwise leave the highlighted ring stuck on the old choice until
  // a reload. This local copy is what the panel actually reads; it starts
  // from the loaded profile and updates the moment a badge is picked.
  const [activeBadge, setActiveBadge] = useState<PlayerBadge | null | undefined>()

  /** What was loaded, so "changed" doesn't just mean "filled in". */
  const initial = useRef('')

  useEffect(() => {
    if (loading) return
    const startingName =
      profile?.nickname ||
      (user ? user.displayName || user.email?.split('@')[0] || '' : '')
    const startingCharacter = profile?.character || character
    setNickname(startingName)
    if (profile?.character) setCharacter(profile.character)
    setActiveBadge(profile?.displayedBadge ?? null)
    initial.current = JSON.stringify({
      nickname: startingName.trim(),
      character: startingCharacter,
    })
    // `character` is the random initial value, read once when the profile
    // lands; including it would reset the form as soon as you pick another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, user])

  const dirty =
    initial.current !== '' &&
    JSON.stringify({ nickname: nickname.trim(), character }) !== initial.current
  // No `allowNext` here: saving stays on the page and resets the baseline.
  const { blocked, stay, discard } = useUnsavedChanges(dirty)

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">
          {t('lobby.loading')}
        </div>
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🔑</div>
        <h1 className="text-2xl font-black text-content">
          {t('profile.needAccountTitle')}
        </h1>
        <p className="max-w-xs text-content-muted">
          {t('profile.needAccountBody')}
        </p>
        <Button size="lg" onClick={() => navigate('/signin')}>
          {t('home.signIn')}
        </Button>
      </div>
    )
  }

  async function handleSave() {
    setBusy(true)
    setSaved(false)
    setError(null)
    try {
      await saveProfile(user!.uid, { nickname: nickname.trim(), character })
      // Now saved, so this *is* the baseline — leaving shouldn't warn.
      initial.current = JSON.stringify({
        nickname: nickname.trim(),
        character,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      // Say so. Without this a failed save was indistinguishable from no save
      // at all: the tick never appeared, nothing else changed, and the unsaved
      // -changes guard would then warn on the way out with no explanation.
      console.error('Could not save the profile', e)
      setError(t('profile.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="flex items-center gap-2 text-3xl font-black text-content">
        <ProfileIcon size={26} />
        {t('profile.title')}
      </h1>
      <p className="mt-1 text-content-muted">{t('profile.subtitle')}</p>

      <div className="mt-6">
        <IdentityFields
          nickname={nickname}
          onNicknameChange={setNickname}
          character={character}
          onCharacterChange={setCharacter}
          nicknameLabel={t('profile.defaultNickname')}
          characterLabel={t('profile.defaultCharacter')}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button size="lg" fullWidth disabled={busy} onClick={handleSave}>
          {saved ? `✓ ${t('profile.saved')}` : t('profile.save')}
        </Button>
      </div>

      <StatsPanel
        stats={profile?.stats}
        activeBadge={activeBadge}
        onSetActive={(badge) => {
          setActiveBadge(badge)
          saveProfile(user!.uid, { displayedBadge: badge }).catch(() => {})
        }}
      />

      {blocked && <UnsavedChangesDialog onStay={stay} onDiscard={discard} />}
    </div>
  )
}

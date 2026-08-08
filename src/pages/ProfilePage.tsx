import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { IdentityFields } from '../components/IdentityFields'
import { ProfileIcon } from '../components/NavIcons'
import { useAuth } from '../auth/AuthContext'
import { randomCharacter } from '../game/characters'
import { saveProfile, useProfile } from '../game/profile'

/** Edit the account's default nickname and character (both optional). */
export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const isGuest = !user || user.isAnonymous
  const { profile, loading } = useProfile(user?.uid, isGuest)

  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState<string>(randomCharacter)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loading) return
    if (profile?.nickname) setNickname(profile.nickname)
    else if (user) setNickname(user.displayName || user.email?.split('@')[0] || '')
    if (profile?.character) setCharacter(profile.character)
  }, [profile, loading, user])

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
    try {
      await saveProfile(user!.uid, { nickname: nickname.trim(), character })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
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

      <div className="mt-auto pt-8">
        <Button size="lg" fullWidth disabled={busy} onClick={handleSave}>
          {saved ? `✓ ${t('profile.saved')}` : t('profile.save')}
        </Button>
      </div>
    </div>
  )
}

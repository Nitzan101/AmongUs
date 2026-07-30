import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { OptionCard } from '../components/ui/Card'
import { IdentityFields } from '../components/IdentityFields'
import { useAuth } from '../auth/AuthContext'
import { createGame } from '../game/gameService'
import { randomCharacter } from '../game/characters'
import { useProfile } from '../game/profile'
import type { GameMode, GuessRule, Scoring } from '../game/types'
import type { Difficulty } from '../words'
import type { Language } from '../i18n'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-6 flex flex-col gap-2">
      <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-content-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function CreateGamePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [mode, setMode] = useState<GameMode>('half')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [scoring, setScoring] = useState<Scoring>('teamRace')
  const [guess, setGuess] = useState<GuessRule>('final')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The host picks their own name/character too, just like everyone else.
  const [step, setStep] = useState<'options' | 'identity'>('options')
  const [nickname, setNickname] = useState('')
  const [character, setCharacter] = useState<string>(randomCharacter)
  const { profile, loading: profileLoading } = useProfile(
    user?.uid,
    !user || user.isAnonymous,
  )

  useEffect(() => {
    if (profileLoading) return
    if (profile?.nickname) setNickname(profile.nickname)
    else if (user) setNickname(user.displayName || user.email?.split('@')[0] || '')
    if (profile?.character) setCharacter(profile.character)
  }, [profile, profileLoading, user])

  // Hosting requires a real (non-guest) account.
  if (!user || user.isAnonymous) {
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

  async function handleCreate() {
    setError(null)
    setBusy(true)
    try {
      const pin = await createGame(
        {
          language: (i18n.resolvedLanguage ?? 'en') as Language,
          mode,
          difficulty,
          scoring,
          guess,
        },
        {
          uid: user!.uid,
          name: nickname.trim(),
          character,
        },
      )
      navigate(`/lobby/${pin}`)
    } catch {
      setError(t('create.createError'))
      setBusy(false)
    }
  }

  if (step === 'identity') {
    return (
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-black text-content">
          {t('create.identityTitle')}
        </h1>
        <p className="mt-1 text-content-muted">{t('create.identitySubtitle')}</p>

        <div className="mt-6">
          <IdentityFields
            nickname={nickname}
            onNicknameChange={setNickname}
            character={character}
            onCharacterChange={setCharacter}
          />
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
            disabled={nickname.trim().length === 0 || busy}
            onClick={handleCreate}
          >
            {busy ? t('create.creating') : t('create.submit')}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="mt-2"
            onClick={() => setStep('options')}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-3xl font-black text-content">{t('create.title')}</h1>
      <p className="mt-1 text-content-muted">{t('create.subtitle')}</p>

      <Section title={t('create.mode')}>
        <OptionCard
          icon="🗣️"
          title={t('create.modeHalf')}
          description={t('create.modeHalfDesc')}
          selected={mode === 'half'}
          onSelect={() => setMode('half')}
        />
        <OptionCard
          icon="💬"
          title={t('create.modeFull')}
          description={t('create.modeFullDesc')}
          selected={mode === 'full'}
          onSelect={() => setMode('full')}
        />
      </Section>

      <Section title={t('create.difficulty')}>
        <OptionCard
          icon="🙂"
          title={t('create.difficultyEasy')}
          description={t('create.difficultyEasyDesc')}
          selected={difficulty === 'easy'}
          onSelect={() => setDifficulty('easy')}
        />
        <OptionCard
          icon="⚖️"
          title={t('create.difficultyMedium')}
          description={t('create.difficultyMediumDesc')}
          selected={difficulty === 'medium'}
          onSelect={() => setDifficulty('medium')}
        />
        <OptionCard
          icon="🔥"
          title={t('create.difficultyHard')}
          description={t('create.difficultyHardDesc')}
          selected={difficulty === 'hard'}
          onSelect={() => setDifficulty('hard')}
        />
      </Section>

      <Section title={t('create.scoring')}>
        <OptionCard
          icon="🏁"
          title={t('create.scoringTeamRace')}
          description={t('create.scoringTeamRaceDesc')}
          selected={scoring === 'teamRace'}
          onSelect={() => setScoring('teamRace')}
        />
        <OptionCard
          icon="🛟"
          title={t('create.scoringSurvivors')}
          description={t('create.scoringSurvivorsDesc')}
          selected={scoring === 'survivors'}
          onSelect={() => setScoring('survivors')}
        />
        <OptionCard
          icon="🔎"
          title={t('create.scoringDetective')}
          description={t('create.scoringDetectiveDesc')}
          selected={scoring === 'detective'}
          onSelect={() => setScoring('detective')}
        />
      </Section>

      <Section title={t('create.guess')}>
        <OptionCard
          icon="🎯"
          title={t('create.guessFinal')}
          description={t('create.guessFinalDesc')}
          selected={guess === 'final'}
          onSelect={() => setGuess('final')}
        />
        <OptionCard
          icon="💰"
          title={t('create.guessSteal')}
          description={t('create.guessStealDesc')}
          selected={guess === 'steal'}
          onSelect={() => setGuess('steal')}
        />
        <OptionCard
          icon="🚫"
          title={t('create.guessOff')}
          description={t('create.guessOffDesc')}
          selected={guess === 'off'}
          onSelect={() => setGuess('off')}
        />
      </Section>

      <div className="mt-8">
        <Button size="lg" fullWidth onClick={() => setStep('identity')}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}

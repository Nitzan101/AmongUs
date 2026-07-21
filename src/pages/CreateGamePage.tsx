import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { OptionCard } from '../components/ui/Card'

type Mode = 'half' | 'full'
type Difficulty = 'normal' | 'hard'
type Scoring = 'teamRace' | 'survivors' | 'detective'
type Guess = 'final' | 'steal' | 'off'

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
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('half')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [scoring, setScoring] = useState<Scoring>('teamRace')
  const [guess, setGuess] = useState<Guess>('final')

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
          title={t('create.difficultyNormal')}
          description={t('create.difficultyNormalDesc')}
          selected={difficulty === 'normal'}
          onSelect={() => setDifficulty('normal')}
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
        <Button size="lg" fullWidth onClick={() => navigate('/lobby')}>
          {t('create.submit')}
        </Button>
      </div>
    </div>
  )
}

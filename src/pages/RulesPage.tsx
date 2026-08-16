import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { POINTS } from '../game/scoring'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

/**
 * An interactive walkthrough: swipeable cards that play out one mini-round
 * using miniature versions of the real screens, so the rules are shown rather
 * than described.
 */

/**
 * What each scoring style pays, taken from the scoring module itself.
 *
 * Written out by hand once, these numbers went stale the first time the
 * balance changed — a rules screen that lies is worse than no rules screen.
 */
const SCORING_STYLES = [
  {
    key: 'teamRace',
    icon: '🏁',
    crew: POINTS.crewInstantCatch,
    imposter: POINTS.imposterPerRound,
  },
  {
    key: 'survivors',
    icon: '🛟',
    crew: POINTS.survivorBonus,
    imposter: POINTS.imposterPerCrewLost,
  },
  {
    key: 'detective',
    icon: '🔎',
    crew: POINTS.detectivePerVote,
    imposter: POINTS.imposterPerMissedVote,
  },
] as const

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-4">
      {children}
    </div>
  )
}

/** A small stand-in for a player's secret word card. */
function MiniWordCard({
  name,
  character,
  word,
  imposter,
}: {
  name: string
  character: string
  word: string
  imposter?: boolean
}) {
  return (
    <div
      className={
        'flex flex-col items-center rounded-xl border-2 p-2 text-center ' +
        (imposter
          ? 'border-accent-500 bg-accent-500/10'
          : 'border-brand-400 bg-brand-50 dark:bg-brand-500/10')
      }
    >
      <span className="text-xl">{character}</span>
      <span className="text-[10px] font-bold text-content-muted">{name}</span>
      <span className="mt-0.5 text-xs font-black text-content">{word}</span>
    </div>
  )
}

function MiniClue({
  character,
  name,
  word,
  odd,
}: {
  character: string
  name: string
  word: string
  odd?: boolean
}) {
  return (
    <div
      className={
        'flex items-center gap-2 rounded-xl px-2 py-1.5 ' +
        (odd ? 'bg-accent-500/10 ring-1 ring-accent-500' : 'bg-surface')
      }
    >
      <span className="text-base">{character}</span>
      <span className="text-xs text-content-muted">{name}</span>
      <span className="ms-auto text-xs font-black text-content">{word}</span>
    </div>
  )
}

export function RulesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  // Example round, translated so each language gets natural words.
  const mainWord = t('rules.demo.mainWord')
  const imposterWord = t('rules.demo.imposterWord')
  const P = [
    { name: t('rules.demo.p1'), character: '🦊' },
    { name: t('rules.demo.p2'), character: '🐼' },
    { name: t('rules.demo.p3'), character: '🐸' },
    { name: t('rules.demo.p4'), character: '🦄' },
  ]

  const slides: { title: string; body: string; visual: ReactNode }[] = [
    {
      title: t('rules.s1Title'),
      body: t('rules.s1Body', { main: mainWord, confusing: imposterWord }),
      visual: (
        <Card>
          <div className="grid grid-cols-4 gap-2">
            <MiniWordCard {...P[0]} word={mainWord} />
            <MiniWordCard {...P[1]} word={mainWord} />
            <MiniWordCard {...P[2]} word={imposterWord} imposter />
            <MiniWordCard {...P[3]} word={mainWord} />
          </div>
          <p className="mt-3 text-center text-xs text-content-muted">
            {t('rules.s1Caption')}
          </p>
        </Card>
      ),
    },
    {
      title: t('rules.s2Title'),
      body: t('rules.s2Body'),
      visual: (
        <Card>
          <div className="flex flex-col gap-1.5">
            <MiniClue {...P[0]} word={t('rules.demo.clue1')} />
            <MiniClue {...P[1]} word={t('rules.demo.clue2')} />
            <MiniClue {...P[2]} word={t('rules.demo.clue3')} />
            <MiniClue {...P[3]} word={t('rules.demo.clue4')} />
          </div>
          <p className="mt-3 text-center text-xs text-content-muted">
            {t('rules.s2Caption')}
          </p>
        </Card>
      ),
    },
    {
      title: t('rules.s3Title'),
      body: t('rules.s3Body'),
      visual: (
        <Card>
          <div className="flex flex-col gap-1.5">
            <MiniClue {...P[0]} word={t('rules.demo.clue1')} />
            <MiniClue {...P[1]} word={t('rules.demo.clue2')} />
            <MiniClue {...P[2]} word={t('rules.demo.clue3')} odd />
            <MiniClue {...P[3]} word={t('rules.demo.clue4')} />
          </div>
          <p className="mt-3 text-center text-xs font-bold text-accent-600">
            {t('rules.s3Caption', { name: P[2].name, word: t('rules.demo.clue3') })}
          </p>
        </Card>
      ),
    },
    {
      title: t('rules.s4Title'),
      body: t('rules.s4Body'),
      visual: (
        <Card>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
            <span className="text-xl">{P[2].character}</span>
            <span className="flex-1 text-sm font-black text-content">
              {P[2].name}
            </span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-black text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              3
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1 px-1">
            {[P[0], P[1], P[3]].map((p) => (
              <span
                key={p.name}
                className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-content-muted"
              >
                {p.character} {p.name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-content-muted">
            {t('rules.s4Caption')}
          </p>
        </Card>
      ),
    },
    {
      title: t('rules.s5Title'),
      body: t('rules.s5Body'),
      visual: (
        <Card>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-3xl">🕵️</span>
            <span className="text-sm font-black text-accent-600">
              {t('rules.s5Caption', { name: P[2].name })}
            </span>
            <span className="text-xs text-content-muted">
              {t('rules.s5Word', { word: mainWord })}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            {[P[0], P[1], P[3]].map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2 rounded-xl bg-surface px-2 py-1"
              >
                <span className="text-base">{p.character}</span>
                <span className="flex-1 text-xs text-content">{p.name}</span>
                <span className="text-xs font-black text-brand-600">
                  +{POINTS.crewInstantCatch}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      title: t('rules.scoreTitle'),
      body: t('rules.scoreBody'),
      visual: (
        <Card>
          <div className="flex flex-col gap-2">
            {SCORING_STYLES.map(({ key, icon, crew, imposter }) => (
              <div key={key} className="rounded-xl bg-surface p-2">
                <div className="text-xs font-black text-content">
                  {icon} {t(`create.scoring${key[0].toUpperCase()}${key.slice(1)}`)}
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span aria-hidden>👥</span>
                    <span className="flex-1 text-content-muted">
                      {t(`rules.score.${key}Crew`)}
                    </span>
                    <span className="font-black text-brand-600">+{crew}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span aria-hidden>🕵️</span>
                    <span className="flex-1 text-content-muted">
                      {t(`rules.score.${key}Imposter`)}
                    </span>
                    <span className="font-black text-accent-600">+{imposter}</span>
                  </div>
                </div>
              </div>
            ))}
            {/* Three rows rather than one sentence listing three numbers:
                read as prose it sounded like a pile of bonuses stacking up,
                which is exactly what the cap above stops it being. */}
            <div className="rounded-xl border border-dashed border-line p-2">
              <div className="text-[11px] font-black text-content-muted">
                {t('rules.score.alwaysTitle')}
              </div>
              {[
                { icon: '🎭', key: 'missed', value: POINTS.imposterPerMissedVote },
                { icon: '🏃', key: 'escape', value: POINTS.imposterEscape },
                { icon: '💡', key: 'guess', value: POINTS.guessBonus },
              ].map(({ icon, key, value }) => (
                <div key={key} className="mt-1 flex items-center gap-2 text-[11px]">
                  <span aria-hidden>{icon}</span>
                  <span className="flex-1 text-content-muted">
                    {t(`rules.score.always${key[0].toUpperCase()}${key.slice(1)}`)}
                  </span>
                  <span className="font-black text-accent-600">+{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ),
    },
    {
      title: t('rules.tipTitle'),
      body: t('rules.tipBody'),
      visual: (
        <div className="rounded-2xl border-2 border-sunny-400 bg-sunny-400/10 p-6 text-center">
          <div className="text-5xl">😐</div>
          <p className="mt-2 text-sm font-bold text-content">
            {t('rules.tipCaption')}
          </p>
        </div>
      ),
    },
    {
      title: t('rules.s6Title'),
      body: t('rules.s6Body'),
      visual: (
        <Card>
          <div className="flex flex-col gap-2">
            {[
              { key: 'create', style: 'bg-brand-600 text-white' },
              { key: 'join', style: 'border-2 border-line bg-surface' },
              { key: 'rules', style: 'text-content-muted' },
              { key: 'profile', style: 'border-2 border-line bg-surface' },
              { key: 'sets', style: 'border-2 border-line bg-surface' },
            ].map(({ key, style }) => (
              <div key={key}>
                <div
                  className={`rounded-xl px-3 py-1.5 text-center text-xs font-bold ${style}`}
                >
                  {t(`rules.menu.${key}`)}
                </div>
                <p className="mt-0.5 px-1 text-[11px] leading-tight text-content-muted">
                  {t(`rules.menu.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
  ]

  const last = index === slides.length - 1
  const slide = slides[index]

  const count = slides.length
  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)))
    },
    [count],
  )

  // Arrow keys move through the walkthrough too.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div
      className="flex flex-1 flex-col"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        if (start == null) return
        const dx = e.changedTouches[0].clientX - start
        // Swiping "forward" is leftwards in LTR and rightwards in RTL.
        const rtl = document.documentElement.dir === 'rtl'
        if (Math.abs(dx) > 50) go((dx < 0) === !rtl ? 1 : -1)
        touchStartX.current = null
      }}
    >
      <h1 className="text-2xl font-black text-content">{t('rules.title')}</h1>

      <div key={index} className="mt-4 animate-pop-in">
        {slide.visual}
        <h2 className="mt-4 text-xl font-black text-content">{slide.title}</h2>
        <p className="mt-1 text-content-muted">{slide.body}</p>
      </div>

      <div className="mt-6 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={
              'h-2 rounded-full transition-all ' +
              (i === index ? 'w-5 bg-brand-600' : 'w-2 bg-line')
            }
          />
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-6">
        {index > 0 && (
          <Button variant="secondary" size="lg" onClick={() => go(-1)}>
            {t('common.back')}
          </Button>
        )}
        <Button
          size="lg"
          fullWidth
          onClick={() => (last ? navigate('/') : go(1))}
        >
          {last ? t('rules.gotIt') : t('common.next')}
        </Button>
      </div>
    </div>
  )
}

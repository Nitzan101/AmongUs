import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

/**
 * An interactive walkthrough: swipeable cards that play out one mini-round
 * using miniature versions of the real screens, so the rules are shown rather
 * than described.
 */

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
                <span className="text-xs font-black text-brand-600">+2</span>
              </div>
            ))}
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

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OptionCard } from './ui/Card'
import { OPTION_SPECS, selectedValue, toSavedOptions } from '../game/gameOptions'
import { updateGameOptions } from '../game/gameService'
import { saveProfile } from '../game/profile'
import type { Game, GameOptions } from '../game/types'
import type { WordSet } from '../game/wordSets'
import { DEFAULT_SET_ICON, MIN_SET_ENTRIES } from '../game/wordSets'

/** How long a "just changed" highlight stays up. */
const HIGHLIGHT_MS = 4000

/**
 * The room's settings, shown in the lobby.
 *
 * The host edits them here rather than before the room exists, so the PIN and
 * share link appear in one tap and the waiting time gets used for setup.
 * Everyone else sees the same list read-only — knowing it's Hard difficulty
 * and Steal the Win is part of deciding whether to play.
 *
 * Editing is confined to the lobby: `startGame` deals from whatever is set
 * when Start is pressed, so a mid-game change would not re-deal and would only
 * mislead. Between games the room returns to the lobby and this unlocks again.
 */
export function GameSettingsPanel({
  pin,
  game,
  isHost,
  uid,
  usableSets,
  loanedSet,
}: {
  pin: string
  game: Game
  isHost: boolean
  uid: string
  usableSets: WordSet[]
  /**
   * A set left behind by a host who lent it on their way out. Listed beside the
   * host's own, because it isn't in their account and would otherwise be
   * unreachable — the room could play with it but never choose it again.
   */
  loanedSet?: WordSet | null
}) {
  const { t } = useTranslation()
  const editable = isHost && game.status === 'lobby'

  // Mirrored from the <details> element rather than driving it, so the browser
  // keeps owning the open/closed state and the label can still name what the
  // next tap does — "tap to change" on something already open was describing
  // the tap that got you there.
  const [open, setOpen] = useState(false)

  // Which setting changed most recently, so a player who joined a minute ago
  // notices the host switching the game out from under them.
  const [changed, setChanged] = useState<string | null>(null)
  const previous = useRef<GameOptions | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = game
    if (!before) return // first render: nothing has "changed" yet

    for (const spec of OPTION_SPECS) {
      if (before[spec.key] !== game[spec.key]) {
        setChanged(spec.key)
        return
      }
    }
    if ((before.wordSetId ?? null) !== (game.wordSetId ?? null)) {
      setChanged('wordSetId')
    }
  }, [game])

  useEffect(() => {
    if (!changed) return
    const timer = setTimeout(() => setChanged(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [changed])

  async function choose(patch: Partial<GameOptions>) {
    if (!editable) return
    await updateGameOptions(pin, patch)
    // Remember it for the host's next room, so this screen is a one-off.
    await saveProfile(uid, {
      gameOptions: toSavedOptions({ ...game, ...patch }),
    }).catch(() => {
      /* remembering is a convenience — never block the game on it */
    })
  }

  const usingCustomSet = Boolean(game.wordSetId)
  const visibleSpecs = OPTION_SPECS.filter(
    (spec) =>
      !(spec.builtInBankOnly && usingCustomSet) &&
      // The online mode always draws the ring, so there is nothing to choose.
      !(spec.halfVirtualOnly && game.mode !== 'half'),
  )

  // Read-only: one compact line per setting, rather than the full cards.
  if (!editable) {
    return (
      <details
        className="mt-4 rounded-2xl border border-line bg-surface-raised"
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-content-muted hover:text-content">
          {open ? t('lobby.settingsHide') : t('lobby.settings')}
        </summary>
        <dl className="flex flex-col gap-1 px-4 pb-3">
          {visibleSpecs.map((spec) => {
            const value = selectedValue(spec, game)
            if (!value) return null
            return (
              // Stacked, with the explanation underneath. Side-by-side left
              // players reading "Team Race" or "Final Guess" with no idea what
              // either meant — the names only make sense to whoever wrote them.
              <div
                key={String(spec.key)}
                className={
                  'rounded-lg px-2 py-1.5 transition-colors ' +
                  (changed === spec.key ? 'bg-sunny-400/20' : '')
                }
              >
                <dt className="text-xs uppercase tracking-wide text-content-muted">
                  {t(spec.labelKey)}
                </dt>
                <dd className="text-sm font-bold text-content">
                  {value.icon} {t(value.titleKey)}
                  {changed === spec.key && (
                    <span className="ms-2 text-xs font-normal text-sunny-500">
                      {t('lobby.justChanged')}
                    </span>
                  )}
                </dd>
                {value.descKey && (
                  <dd className="text-xs leading-snug text-content-muted">
                    {t(value.descKey)}
                  </dd>
                )}
              </div>
            )
          })}
        </dl>
      </details>
    )
  }

  return (
    <details
      className="mt-4 rounded-2xl border border-line bg-surface-raised"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-content-muted hover:text-content">
        {open ? t('lobby.settingsHide') : t('lobby.settingsHost')}
      </summary>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <p className="text-xs text-content-muted">{t('lobby.settingsHint')}</p>

        {/* Always shown. Hiding it when the host had no usable sets meant it
            appeared and disappeared with no explanation — and gave someone
            with a too-small set no clue why theirs wasn't listed. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-content-muted">
            {t('create.words')}
          </h3>
          <OptionCard
            icon="🎲"
            title={t('create.wordsRandom')}
            description={t('create.wordsRandomDesc')}
            selected={!game.wordSetId}
            onSelect={() => choose({ wordSetId: null })}
          />
          {usableSets.map((s) => (
            <OptionCard
              key={s.id}
              icon={s.icon || DEFAULT_SET_ICON}
              title={s.name}
              description={t('sets.wordCount', {
                count: s.entries?.length ?? MIN_SET_ENTRIES,
              })}
              selected={game.wordSetId === s.id}
              onSelect={() => choose({ wordSetId: s.id })}
            />
          ))}
          {loanedSet && !usableSets.some((s) => s.id === loanedSet.id) && (
            <OptionCard
              icon={loanedSet.icon || DEFAULT_SET_ICON}
              title={loanedSet.name}
              description={t('create.wordsLentDesc')}
              selected={game.wordSetId === loanedSet.id}
              onSelect={() => choose({ wordSetId: loanedSet.id })}
            />
          )}
          {usableSets.length === 0 && !loanedSet && (
            <p className="px-1 text-xs text-content-muted">
              {t('create.noUsableSets', { count: MIN_SET_ENTRIES })}
            </p>
          )}
          {/* Nothing above is selected, yet the room is set to a custom set:
              a host vanished without handing it over (a closed tab rather
              than Leave). Say so, rather than showing a Words list where the
              choice is mysteriously nobody's. */}
          {usingCustomSet &&
            game.wordSetId !== loanedSet?.id &&
            !usableSets.some((s) => s.id === game.wordSetId) && (
              <p className="px-1 text-xs text-content-muted">
                {t('create.wordsOrphaned')}
              </p>
            )}
        </section>

        {visibleSpecs.map((spec) => (
          <section key={String(spec.key)} className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-content-muted">
              {t(spec.labelKey)}
            </h3>
            {spec.values.map((v) => (
              <OptionCard
                key={String(v.value)}
                icon={v.icon}
                title={t(v.titleKey)}
                description={v.descKey ? t(v.descKey) : undefined}
                selected={selectedValue(spec, game)?.value === v.value}
                onSelect={() => choose({ [spec.key]: v.value })}
              />
            ))}
          </section>
        ))}
      </div>
    </details>
  )
}

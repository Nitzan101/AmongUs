import type { Language } from '../i18n'
import type { SavedGameOptions } from './profile'
import type { GameOptions } from './types'

/**
 * One shared description of the host's choices, so the create flow and the
 * lobby panel can't drift apart. Each entry carries its own values and label
 * keys, which keeps the panel a loop rather than six near-identical blocks.
 *
 * Keys are full i18n paths rather than a shared prefix: most live under
 * `create.`, but the language names are shared with the rest of the app under
 * `common.`.
 */
export interface OptionSpec<K extends keyof GameOptions> {
  key: K
  labelKey: string
  values: {
    value: GameOptions[K]
    icon: string
    titleKey: string
    /** Omitted where the title says everything (the language names). */
    descKey?: string
    /**
     * Hidden while another choice rules this one out — see `hard` below.
     * A choice that cannot work should not be offered and then quietly
     * overridden; it should not be there.
     */
    unavailable?: (options: GameOptions) => boolean
  }[]
  /** Hidden while the host is dealing from a custom set. */
  builtInBankOnly?: boolean
  /** Hidden unless the game is played in person. */
  halfVirtualOnly?: boolean
}

const MODE_SPEC: OptionSpec<'mode'> = {
  key: 'mode',
  labelKey: 'create.mode',
  values: [
    {
      value: 'half',
      icon: '🗣️',
      titleKey: 'create.modeHalf',
      descKey: 'create.modeHalfDesc',
    },
    {
      value: 'full',
      icon: '📱',
      titleKey: 'create.modeFull',
      descKey: 'create.modeFullDesc',
    },
  ],
}

const TURN_DISPLAY_SPEC: OptionSpec<'turnCircle'> = {
  key: 'turnCircle',
  labelKey: 'create.turnDisplay',
  halfVirtualOnly: true,
  values: [
    {
      value: false,
      icon: '📋',
      titleKey: 'create.turnDisplayList',
      descKey: 'create.turnDisplayListDesc',
    },
    {
      value: true,
      icon: '⭕',
      titleKey: 'create.turnDisplayCircle',
      descKey: 'create.turnDisplayCircleDesc',
    },
  ],
}

const WORD_LANGUAGE_SPEC: OptionSpec<'language'> = {
  key: 'language',
  labelKey: 'create.wordLanguage',
  builtInBankOnly: true,
  values: [
    // Letter marks rather than flag emoji: Windows doesn't render flags,
    // showing bare "GB"/"IL" letter pairs instead.
    { value: 'en', icon: 'A', titleKey: 'common.english' },
    { value: 'he', icon: 'א', titleKey: 'common.hebrew' },
  ],
}

const DIFFICULTY_SPEC: OptionSpec<'difficulty'> = {
  key: 'difficulty',
  labelKey: 'create.difficulty',
  builtInBankOnly: true,
  values: [
    {
      value: 'easy',
      icon: '🙂',
      titleKey: 'create.difficultyEasy',
      descKey: 'create.difficultyEasyDesc',
    },
    {
      value: 'medium',
      icon: '⚖️',
      titleKey: 'create.difficultyMedium',
      descKey: 'create.difficultyMediumDesc',
    },
    {
      value: 'hard',
      icon: '🔥',
      titleKey: 'create.difficultyHard',
      descKey: 'create.difficultyHardDesc',
      // Hard hands the imposter no word. Hidden role hands them no *role*.
      // Together they hand them nothing at all — an empty card, which would
      // give the game away more loudly than any word. So it disappears once
      // the imposter isn't being told, which is why that question is asked
      // first.
      unavailable: (o) => o.imposterAware === false,
    },
  ],
}

const AWARENESS_SPEC: OptionSpec<'imposterAware'> = {
  key: 'imposterAware',
  labelKey: 'create.awareness',
  values: [
    {
      value: true,
      icon: '🕵️',
      titleKey: 'create.awarenessKnows',
      descKey: 'create.awarenessKnowsDesc',
    },
    {
      value: false,
      icon: '🎭',
      titleKey: 'create.awarenessHidden',
      descKey: 'create.awarenessHiddenDesc',
    },
  ],
}

const SCORING_SPEC: OptionSpec<'scoring'> = {
  key: 'scoring',
  labelKey: 'create.scoring',
  values: [
    {
      value: 'teamRace',
      icon: '🏁',
      titleKey: 'create.scoringTeamRace',
      descKey: 'create.scoringTeamRaceDesc',
    },
    {
      value: 'survivors',
      icon: '🛟',
      titleKey: 'create.scoringSurvivors',
      descKey: 'create.scoringSurvivorsDesc',
    },
    {
      value: 'detective',
      icon: '🔎',
      titleKey: 'create.scoringDetective',
      descKey: 'create.scoringDetectiveDesc',
    },
  ],
}

const GUESS_SPEC: OptionSpec<'guess'> = {
  key: 'guess',
  labelKey: 'create.guess',
  values: [
    {
      value: 'final',
      icon: '🎯',
      titleKey: 'create.guessFinal',
      descKey: 'create.guessFinalDesc',
    },
    {
      value: 'steal',
      icon: '💰',
      titleKey: 'create.guessSteal',
      descKey: 'create.guessStealDesc',
    },
    {
      value: 'off',
      icon: '🚫',
      titleKey: 'create.guessOff',
      descKey: 'create.guessOffDesc',
    },
  ],
}

/**
 * Every option the lobby panel shows, in display order. Typed loosely because
 * the entries describe different value types; each is exact on its own.
 */
export const OPTION_SPECS: readonly OptionSpec<keyof GameOptions>[] = [
  MODE_SPEC,
  TURN_DISPLAY_SPEC,
  WORD_LANGUAGE_SPEC,
  // Asked before difficulty, because it decides which difficulties exist:
  // telling the imposter nothing rules out giving them no word as well.
  AWARENESS_SPEC,
  DIFFICULTY_SPEC,
  SCORING_SPEC,
  GUESS_SPEC,
] as unknown as readonly OptionSpec<keyof GameOptions>[]

/** The values of one option that are actually offerable right now. */
export function availableValues(
  spec: OptionSpec<keyof GameOptions>,
  options: GameOptions,
) {
  return spec.values.filter((v) => !v.unavailable?.(options))
}

/**
 * Fold in whatever a choice forces on another option.
 *
 * Turning the imposter's knowledge off while the room is set to Hard would
 * leave a combination the game cannot deal, so the difficulty comes down with
 * it. Done here rather than at the tap, so every screen that changes a setting
 * gets the same correction.
 */
export function withDependentOptions(
  current: GameOptions,
  patch: Partial<GameOptions>,
): Partial<GameOptions> {
  const next = { ...current, ...patch }
  if (next.imposterAware === false && next.difficulty === 'hard') {
    return { ...patch, difficulty: 'medium' }
  }
  return patch
}

/** Find the chosen value's spec entry, for rendering a summary or a label. */
export function selectedValue(
  spec: OptionSpec<keyof GameOptions>,
  options: GameOptions,
) {
  const current = options[spec.key]
  const found = spec.values.find((v) => v.value === current)
  if (found) return found
  // Booleans added later are absent on older rooms; fall back to the value
  // those rooms behaved as, which is the first one listed in each spec.
  if (spec.key === 'imposterAware' || spec.key === 'turnCircle') {
    return spec.values[0]
  }
  return undefined
}

/**
 * The settings a brand-new room starts with: the classic game at a balanced
 * difficulty, with words in whatever language the host is reading the app in.
 */
export function defaultGameOptions(uiLanguage: Language): GameOptions {
  return {
    language: uiLanguage,
    mode: 'half',
    difficulty: 'medium',
    scoring: 'teamRace',
    guess: 'final',
    imposterAware: true,
    turnCircle: false,
    wordSetId: null,
  }
}

/**
 * A host's saved settings on top of the defaults. Anything missing — an older
 * profile written before an option existed — falls back rather than arriving
 * as `undefined`, which Firestore would reject on the game document.
 */
export function optionsFromProfile(
  saved: SavedGameOptions | undefined,
  uiLanguage: Language,
): GameOptions {
  const base = defaultGameOptions(uiLanguage)
  if (!saved) return base
  const aware = saved.imposterAware ?? base.imposterAware
  const difficulty = saved.difficulty ?? base.difficulty
  return {
    ...base,
    language: saved.language ?? base.language,
    mode: saved.mode ?? base.mode,
    // A profile saved before hidden-role and hard were made exclusive can
    // still hold both; the room must not start on a deal that cannot happen.
    difficulty: !aware && difficulty === 'hard' ? 'medium' : difficulty,
    scoring: saved.scoring ?? base.scoring,
    guess: saved.guess ?? base.guess,
    imposterAware: aware,
    turnCircle: saved.turnCircle ?? base.turnCircle,
  }
}

/**
 * Strip a game's options down to the fields worth remembering. `wordSetId` is
 * left out on purpose: a set can be deleted or emptied between sessions, and
 * silently defaulting a new room to one that no longer deals is worse than
 * starting from the built-in bank.
 */
export function toSavedOptions(options: GameOptions): SavedGameOptions {
  return {
    language: options.language,
    mode: options.mode,
    difficulty: options.difficulty,
    scoring: options.scoring,
    guess: options.guess,
    imposterAware: options.imposterAware ?? true,
    turnCircle: options.turnCircle ?? false,
  }
}

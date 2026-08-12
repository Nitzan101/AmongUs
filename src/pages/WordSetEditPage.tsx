import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog'
import { useAuth } from '../auth/AuthContext'
import { useUnsavedChanges } from '../game/useUnsavedChanges'
import {
  cleanEntries,
  createWordSet,
  DEFAULT_SET_ICON,
  getWordSet,
  MIN_SET_ENTRIES,
  SET_ICONS,
  updateWordSet,
  type WordSetEntry,
} from '../game/wordSets'

const BLANK_ROWS = 5

/**
 * The most pairs one set can hold.
 *
 * A Firestore document is capped at 1MB, and nothing stood between a pasted
 * spreadsheet and that ceiling — the save simply failed, and the only thing
 * the editor could say was "couldn't save", with no hint that the size was the
 * problem. Two hundred pairs is far more than a party will get through and
 * nowhere near the limit.
 */
const MAX_SET_ENTRIES = 200

function emptyRows(n: number): WordSetEntry[] {
  return Array.from({ length: n }, () => ({ main: '', confusing: '' }))
}

const inputClass =
  'w-full rounded-xl border-2 border-line bg-surface-raised px-3 py-2 text-content outline-none focus:border-brand-500'

/** The offending rows, marked in red and bold so the problem is where you are. */
const badInputClass =
  'w-full rounded-xl border-2 border-accent-500 bg-accent-500/5 px-3 py-2 font-bold text-content outline-none focus:border-accent-600'

/** Same comparison the game uses when it refuses a clue already said. */
function key(word: string | undefined): string {
  return (word ?? '').trim().toLowerCase()
}

/**
 * Which rows are wrong, and why.
 *
 * Two ways to break a set, both of which produce a game that doesn't work:
 *
 *  * **The same main word twice.** The set is a bag the game draws one entry
 *    from, so a duplicate is either a mistake or a way to weight the draw —
 *    and if the two rows carry different confusing words, which one you get is
 *    a coin toss the author never intended.
 *  * **A row whose two words are identical.** The imposter would be handed the
 *    crew's word, so nobody is the odd one out and the round has no answer.
 */
function findBadRows(rows: WordSetEntry[]): {
  duplicate: Set<number>
  identical: Set<number>
} {
  const seen = new Map<string, number>()
  const duplicate = new Set<number>()
  const identical = new Set<number>()

  rows.forEach((row, i) => {
    const main = key(row.main)
    if (!main) return
    if (main === key(row.confusing)) identical.add(i)
    const first = seen.get(main)
    if (first === undefined) {
      seen.set(main, i)
      return
    }
    // Both copies are marked — pointing only at the second says nothing about
    // where the other one is.
    duplicate.add(first)
    duplicate.add(i)
  })

  return { duplicate, identical }
}

/**
 * A comparable fingerprint of the form's meaningful content.
 *
 * Runs the rows through `cleanEntries` first, so the spare blank row the
 * editor keeps appending as you type never registers as an edit — otherwise
 * simply opening a set and typing one letter into the last row, then deleting
 * it, would leave the form looking permanently dirty.
 */
function snapshot(
  name: string,
  icon: string,
  entries: WordSetEntry[],
): string {
  return JSON.stringify({
    name: name.trim(),
    icon,
    entries: cleanEntries(entries),
  })
}

/** Create or edit a themed word set. */
export function WordSetEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string>(DEFAULT_SET_ICON)
  const [rows, setRows] = useState<WordSetEntry[]>(emptyRows(BLANK_ROWS))
  const [loading, setLoading] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * What was loaded, to compare against. Held as a ref rather than state
   * because it never drives a render — it exists only to answer "has this
   * actually changed?", which must not be confused with "is this non-empty?".
   */
  const initial = useRef(snapshot('', DEFAULT_SET_ICON, []))

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    getWordSet(id)
      .then((set) => {
        if (cancelled || !set) return
        setName(set.name)
        setIcon(set.icon || DEFAULT_SET_ICON)
        initial.current = snapshot(
          set.name,
          set.icon || DEFAULT_SET_ICON,
          set.entries,
        )
        setRows([
          ...set.entries.map((e) => ({
            main: e.main,
            confusing: e.confusing ?? '',
          })),
          ...emptyRows(2),
        ])
      })
      .catch(() => setError(t('sets.loadError')))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew, t])

  function updateRow(index: number, patch: Partial<WordSetEntry>) {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
      // Always keep a spare blank row at the end so the list grows as you type
      // — but stop growing at the cap, so the list can't run away.
      const last = next[next.length - 1]
      if (
        (last.main.trim() || last.confusing?.trim()) &&
        next.length < MAX_SET_ENTRIES + 1
      ) {
        next.push({ main: '', confusing: '' })
      }
      return next
    })
  }

  const filled = cleanEntries(rows)
  const { duplicate, identical } = findBadRows(rows)
  const tooMany = filled.length > MAX_SET_ENTRIES
  const canSave =
    name.trim().length > 0 &&
    filled.length >= MIN_SET_ENTRIES &&
    !tooMany &&
    duplicate.size === 0 &&
    identical.size === 0

  const dirty = snapshot(name, icon, rows) !== initial.current
  const { blocked, stay, discard, allowNext } = useUnsavedChanges(dirty)

  async function handleSave() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      if (isNew) await createWordSet(user.uid, name, rows, icon)
      else await updateWordSet(id!, name, rows, icon)
      // Leaving *because* we saved isn't something to warn about.
      allowNext()
      // `replace` so the editor doesn't stay on the stack — otherwise each
      // edit-and-save left two entries behind to click through later.
      navigate('/sets', { replace: true })
    } catch {
      setError(t('sets.saveError'))
      setBusy(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">
          {t('lobby.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-3xl font-black text-content">
        {isNew ? t('sets.newTitle') : t('sets.editTitle')}
      </h1>
      <p className="mt-1 text-content-muted">{t('sets.editHint')}</p>

      <label className="mt-6 block">
        <span className="px-1 text-sm font-bold text-content-muted">
          {t('sets.nameLabel')}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder={t('sets.namePlaceholder')}
          className={`mt-1 text-lg ${inputClass}`}
        />
      </label>

      <div className="mt-4">
        <span className="px-1 text-sm font-bold text-content-muted">
          {t('sets.iconLabel')}
        </span>
        <div
          role="radiogroup"
          aria-label={t('sets.iconLabel')}
          className="mt-1 flex flex-wrap gap-2"
        >
          {SET_ICONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={icon === option}
              onClick={() => setIcon(option)}
              className={
                'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition-transform active:scale-95 ' +
                (icon === option
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-line bg-surface-raised hover:border-brand-400')
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <span className="px-1 text-xs font-bold uppercase tracking-wide text-content-muted">
          {t('sets.mainWord')}
        </span>
        <span className="px-1 text-xs font-bold uppercase tracking-wide text-content-muted">
          {t('sets.confusingWord')}
        </span>
        {rows.map((row, i) => {
          const badMain = duplicate.has(i) || identical.has(i)
          return (
            <div key={i} className="contents">
              <input
                value={row.main}
                onChange={(e) =>
                  updateRow(i, { main: e.target.value.slice(0, 40) })
                }
                placeholder={t('sets.mainPlaceholder')}
                aria-invalid={badMain || undefined}
                className={badMain ? badInputClass : inputClass}
              />
              <input
                value={row.confusing ?? ''}
                onChange={(e) =>
                  updateRow(i, { confusing: e.target.value.slice(0, 40) })
                }
                placeholder={t('sets.confusingPlaceholder')}
                aria-invalid={identical.has(i) || undefined}
                className={identical.has(i) ? badInputClass : inputClass}
              />
            </div>
          )
        })}
      </div>

      <p className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-xs text-content-muted">
        {t('sets.blankHint')}
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-auto pt-6">
        {/* Name the actual obstacle. A blanket "add more pairs" under a full
            set with one word typed twice sends you looking in the wrong
            place entirely. */}
        {tooMany ? (
          <p className="mb-2 rounded-xl bg-accent-500/10 px-3 py-2 text-center text-sm font-medium text-accent-600">
            {t('sets.tooMany', { count: MAX_SET_ENTRIES })}
          </p>
        ) : duplicate.size > 0 || identical.size > 0 ? (
          <p className="mb-2 rounded-xl bg-accent-500/10 px-3 py-2 text-center text-sm font-medium text-accent-600">
            {duplicate.size > 0
              ? t('sets.duplicateWord')
              : t('sets.sameWordTwice')}
          </p>
        ) : (
          !canSave && (
            <p className="mb-2 text-center text-sm text-content-muted">
              {t('sets.needMore', { count: MIN_SET_ENTRIES })}
            </p>
          )
        )}
        <Button
          size="lg"
          fullWidth
          disabled={!canSave || busy}
          onClick={handleSave}
        >
          {busy ? t('sets.saving') : t('sets.save')}
        </Button>
      </div>

      {blocked && (
        <UnsavedChangesDialog onStay={stay} onDiscard={discard} />
      )}
    </div>
  )
}

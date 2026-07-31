import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import {
  cleanEntries,
  createWordSet,
  getWordSet,
  MIN_SET_ENTRIES,
  updateWordSet,
  type WordSetEntry,
} from '../game/wordSets'

const BLANK_ROWS = 5

function emptyRows(n: number): WordSetEntry[] {
  return Array.from({ length: n }, () => ({ main: '', confusing: '' }))
}

const inputClass =
  'w-full rounded-xl border-2 border-line bg-surface-raised px-3 py-2 text-content outline-none focus:border-brand-500'

/** Create or edit a themed word set. */
export function WordSetEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [rows, setRows] = useState<WordSetEntry[]>(emptyRows(BLANK_ROWS))
  const [loading, setLoading] = useState(!isNew)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    getWordSet(id)
      .then((set) => {
        if (cancelled || !set) return
        setName(set.name)
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
      // Always keep a spare blank row at the end so the list grows as you type.
      const last = next[next.length - 1]
      if (last.main.trim() || last.confusing?.trim()) {
        next.push({ main: '', confusing: '' })
      }
      return next
    })
  }

  const filled = cleanEntries(rows)
  const canSave = name.trim().length > 0 && filled.length >= MIN_SET_ENTRIES

  async function handleSave() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      if (isNew) await createWordSet(user.uid, name, rows)
      else await updateWordSet(id!, name, rows)
      navigate('/sets')
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

      <div className="mt-6 grid grid-cols-2 gap-2">
        <span className="px-1 text-xs font-bold uppercase tracking-wide text-content-muted">
          {t('sets.mainWord')}
        </span>
        <span className="px-1 text-xs font-bold uppercase tracking-wide text-content-muted">
          {t('sets.confusingWord')}
        </span>
        {rows.map((row, i) => (
          <div key={i} className="contents">
            <input
              value={row.main}
              onChange={(e) => updateRow(i, { main: e.target.value.slice(0, 40) })}
              placeholder={t('sets.mainPlaceholder')}
              className={inputClass}
            />
            <input
              value={row.confusing ?? ''}
              onChange={(e) =>
                updateRow(i, { confusing: e.target.value.slice(0, 40) })
              }
              placeholder={t('sets.confusingPlaceholder')}
              className={inputClass}
            />
          </div>
        ))}
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
        {!canSave && (
          <p className="mb-2 text-center text-sm text-content-muted">
            {t('sets.needMore', { count: MIN_SET_ENTRIES })}
          </p>
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
    </div>
  )
}

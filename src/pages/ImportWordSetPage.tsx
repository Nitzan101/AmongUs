import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import {
  copyWordSet,
  DEFAULT_SET_ICON,
  getWordSet,
  MIN_SET_ENTRIES,
  type WordSet,
} from '../game/wordSets'

/**
 * The landing page for a shared word set: look at what you've been sent, then
 * take a copy into your own account.
 *
 * It shows the name, icon and word count but **never the words themselves**.
 * A share link can end up with anyone — including someone sitting in a game
 * being dealt from that very set — and any signed-in user may read a set, so
 * printing the list here would hand them the answers. Once it's copied it's
 * theirs to open.
 */
export function ImportWordSetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { user, isGuest, loading: authLoading } = useAuth()

  const [set, setSet] = useState<WordSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reading needs to be signed in, even as a guest, or the rules reject it.
    if (authLoading || !user) return
    let cancelled = false
    getWordSet(id)
      .then((s) => {
        if (!cancelled) setSet(s)
      })
      .catch(() => {
        if (!cancelled) setSet(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, user, authLoading])

  async function handleCopy() {
    if (!user || !set) return
    setBusy(true)
    setError(null)
    try {
      await copyWordSet(user.uid, set)
      navigate('/sets', { replace: true })
    } catch {
      setError(t('sets.saveError'))
      setBusy(false)
    }
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-content-muted">
          {t('lobby.loading')}
        </div>
      </div>
    )
  }

  // Sets live in an account, so there's nowhere to put a copy without one.
  if (isGuest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🔑</div>
        <h1 className="text-2xl font-black text-content">
          {t('sets.needAccountTitle')}
        </h1>
        <p className="max-w-xs text-content-muted">{t('sets.importNeedAccount')}</p>
        <Button size="lg" onClick={() => navigate('/signin')}>
          {t('home.signIn')}
        </Button>
      </div>
    )
  }

  if (!set) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🕳️</div>
        <h1 className="text-2xl font-black text-content">
          {t('sets.importNotFound')}
        </h1>
        <Button onClick={() => navigate('/sets')}>{t('sets.title')}</Button>
      </div>
    )
  }

  const count = set.entries?.length ?? 0
  const tooSmall = count < MIN_SET_ENTRIES
  const isMine = set.ownerId === user?.uid

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-black text-content">
        {t('sets.importTitle')}
      </h1>
      <p className="mt-1 text-content-muted">{t('sets.importSubtitle')}</p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border-2 border-line bg-surface-raised p-5">
        <span aria-hidden="true" className="text-4xl">
          {set.icon || DEFAULT_SET_ICON}
        </span>
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-xl font-black text-content">
            {set.name}
          </div>
          <div className="text-sm text-content-muted">
            {t('sets.wordCount', { count })}
            {tooSmall && ` · ${t('sets.needMore', { count: MIN_SET_ENTRIES })}`}
          </div>
        </div>
      </div>

      {/* Their own link, most likely tapped while testing it. */}
      {isMine && (
        <p className="mt-4 rounded-xl bg-surface-raised px-3 py-2 text-sm text-content-muted">
          {t('sets.importAlreadyYours')}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button size="lg" fullWidth disabled={busy} onClick={handleCopy}>
          {busy ? t('sets.saving') : t('sets.importAction')}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="mt-2"
          onClick={() => navigate('/sets')}
        >
          {t('sets.title')}
        </Button>
      </div>
    </div>
  )
}

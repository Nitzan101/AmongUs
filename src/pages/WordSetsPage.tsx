import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthContext'
import {
  DEFAULT_SET_ICON,
  deleteWordSet,
  MIN_SET_ENTRIES,
  useMyWordSets,
} from '../game/wordSets'

/** List the signed-in user's custom word sets. */
export function WordSetsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isGuest, loading: authLoading } = useAuth()
  const { sets, loading, reload } = useMyWordSets(user?.uid, isGuest)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
          {t('sets.needAccountTitle')}
        </h1>
        <p className="max-w-xs text-content-muted">{t('sets.needAccountBody')}</p>
        <Button size="lg" onClick={() => navigate('/signin')}>
          {t('home.signIn')}
        </Button>
      </div>
    )
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(t('sets.confirmDelete', { name }))) return
    await deleteWordSet(id)
    reload()
  }

  async function handleShare(id: string) {
    const link = `${window.location.origin}/sets/import/${id}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // Clipboard can be unavailable (insecure origin, or a browser that wants
      // a gesture it didn't see). Showing the link still lets them copy it.
      window.prompt(t('sets.shareLink'), link)
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-4">
      <h1 className="text-3xl font-black text-content">{t('sets.title')}</h1>
      <p className="mt-1 text-content-muted">{t('sets.subtitle')}</p>

      {sets.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-line p-6 text-center text-content-muted">
          {t('sets.empty')}
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {sets.map((s) => {
            const count = s.entries?.length ?? 0
            const tooSmall = count < MIN_SET_ENTRIES
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/sets/${s.id}`)}
                  className="flex flex-1 items-center gap-3 text-start"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {s.icon || DEFAULT_SET_ICON}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-content">{s.name}</span>
                    <span className="text-sm text-content-muted">
                      {t('sets.wordCount', { count })}
                      {tooSmall &&
                        ` · ${t('sets.needMore', { count: MIN_SET_ENTRIES })}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(s.id)}
                  aria-label={t('sets.shareLink')}
                  title={t('sets.shareLink')}
                  className="rounded-full px-2 py-1 text-sm text-content-muted hover:bg-brand-500/10 hover:text-brand-600"
                >
                  {copiedId === s.id ? '✓' : '🔗'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.name)}
                  aria-label={t('sets.delete')}
                  className="rounded-full px-2 py-1 text-sm text-accent-500 hover:bg-accent-500/10"
                >
                  🗑
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto pt-8">
        <Button size="lg" fullWidth onClick={() => navigate('/sets/new')}>
          {t('sets.create')}
        </Button>
      </div>
    </div>
  )
}

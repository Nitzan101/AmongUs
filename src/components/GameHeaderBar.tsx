import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The PIN, a share link, and which word set is in play — kept on screen for
 * the whole game.
 *
 * These used to live only in the lobby, which is the wrong place for them: the
 * person who turns up late does so *after* the game has started, and the host
 * had no way to hand out the PIN without abandoning the round. Now that
 * latecomers can join mid-game, the link has to be reachable mid-game too.
 *
 * Deliberately small and quiet — one line above the phase — because the game
 * is what people are here to look at.
 */
export function GameHeaderBar({
  pin,
  wordSetName,
}: {
  pin: string
  wordSetName?: string | null
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const link = `${window.location.origin}/join/${pin}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable; the PIN beside it still works.
      window.prompt(t('lobby.shareLink'), link)
    }
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {t('lobby.pinLabel')}
      </span>
      <span className="font-black tracking-[0.15em] text-brand-600">{pin}</span>

      {wordSetName && (
        <span
          dir="auto"
          className="ms-1 min-w-0 flex-1 truncate text-xs text-content-muted"
          title={wordSetName}
        >
          · {wordSetName}
        </span>
      )}

      <button
        type="button"
        onClick={copyLink}
        className={
          'ms-auto shrink-0 rounded-full px-2 py-1 text-xs font-bold ' +
          (copied
            ? 'text-brand-600'
            : 'text-content-muted hover:bg-brand-500/10 hover:text-brand-600')
        }
      >
        {copied ? `✓ ${t('lobby.copied')}` : `🔗 ${t('lobby.shareLink')}`}
      </button>
    </div>
  )
}

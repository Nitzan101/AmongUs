import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { shareLink } from '../lib/share'

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

  async function share() {
    const link = `${window.location.origin}/join/${pin}`
    // On a phone this opens the share sheet, which is how the latecomer is
    // actually going to be sent the link; copying is the desktop answer.
    const result = await shareLink(link, t('lobby.shareInvite'))
    if (result !== 'copied') return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mb-3 rounded-xl border border-line bg-surface-raised px-3 py-2">
      {/* The set names the game, so it is the title — full size, and centred.
          Left-aligned it drifted to whichever edge the language dictated and
          read as a caption sitting next to the PIN; a title belongs in the
          middle whichever way the words run. */}
      {wordSetName && (
        <div
          dir="auto"
          className="truncate pb-1 text-center text-2xl font-black leading-tight text-content"
          title={wordSetName}
        >
          {wordSetName}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-content-muted">
          {t('lobby.pinLabel')}
        </span>
        <span
          className={
            'tracking-[0.15em] ' +
            // Beneath a title this is a footnote for whoever is still
            // arriving, so it gives up both its size and its colour. On its
            // own it is the header, and carries the weight itself.
            (wordSetName
              ? 'text-xs font-bold text-content-muted'
              : 'font-black text-brand-600')
          }
        >
          {pin}
        </span>

        <button
          type="button"
          onClick={share}
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
    </div>
  )
}

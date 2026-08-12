/** What actually happened, so the button can say the right thing. */
export type ShareResult = 'shared' | 'copied' | 'failed'

/**
 * Hand a room link to whoever the player wants to send it to.
 *
 * On a phone — which is nearly all of them — the share sheet is the native
 * path: it opens WhatsApp, Messages, or whatever else they invite people
 * with, in one tap. Copying to the clipboard is the desktop answer and the
 * fallback, and `prompt` is the last resort for the browsers where even that
 * is unavailable, because a link you can select beats no link at all.
 */
export async function shareLink(
  url: string,
  title: string,
): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (err) {
      // Dismissing the sheet is an abort, not a failure — falling through to
      // the clipboard would silently copy a link they decided not to send.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'failed'
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    // Last resort, and itself guarded: `prompt` is refused outright in some
    // embedded webviews — which is exactly where share links get opened from
    // — and an unguarded call there throws out of the button's handler.
    try {
      window.prompt(title, url)
    } catch {
      /* nowhere left to put it; the PIN is on screen either way */
    }
    return 'failed'
  }
}

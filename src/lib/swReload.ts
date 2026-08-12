/**
 * Reload once when a newly deployed service worker takes over.
 *
 * The worker is built with `skipWaiting` and `clientsClaim`, so a new version
 * activates and claims the page immediately — but the page has *already*
 * rendered from the old cache by then, and nothing tells it to re-render. The
 * result was that a deploy stayed invisible for a whole session: you'd open
 * the app, see the previous version, and only get the new one after closing
 * and reopening. That is how a shipped lobby settings panel appeared to be
 * missing on a phone while being present in the deployed bundle.
 *
 * `controllerchange` fires exactly when the new worker claims this page, which
 * is the right moment to pick up the new assets — unless somebody is in the
 * middle of a game. See `holdAppReload`.
 */

/** Live holds. While there is at least one, a reload waits. */
let holds = 0
/** A deploy landed while held, and is owed as soon as the last hold goes. */
let owed = false

/**
 * Ask for reloads to wait, and get back the release.
 *
 * A deploy reloading every phone at once is fine on the home screen and awful
 * mid-round: the reveal you were watching disappears, the card you were
 * holding is dealt again from the server, and everyone at the table blames the
 * game. The new version is worth having, just not this second — so the game
 * screen holds the reload for as long as it is on screen, and the moment it
 * isn't, the deploy lands.
 */
export function holdAppReload(): () => void {
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds--
    if (holds === 0 && owed) {
      owed = false
      window.location.reload()
    }
  }
}

export function reloadOnServiceWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) return

  // On a first-ever visit there is no controller yet; that claim is the
  // initial install, not an update, and reloading then would be pointless.
  if (!navigator.serviceWorker.controller) return

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The guard matters: without it a worker that keeps claiming would put
    // the page in a reload loop.
    if (reloading) return
    if (holds > 0) {
      owed = true
      return
    }
    reloading = true
    window.location.reload()
  })
}

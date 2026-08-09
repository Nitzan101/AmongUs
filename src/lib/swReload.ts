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
 * is the right moment to pick up the new assets.
 */
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
    reloading = true
    window.location.reload()
  })
}

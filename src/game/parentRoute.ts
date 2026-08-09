/**
 * Where the header's Back button goes, per screen.
 *
 * It used to call `navigate(-1)`, which is browser history, not app structure.
 * Two things went wrong with that:
 *
 *  - **It could leave the app entirely.** Open a share link, or reopen the app
 *    straight into a game, and the previous history entry is some other
 *    website. "Back" then behaved like the browser's undo, not like going up a
 *    level.
 *  - **It accumulated.** Editing a word set and saving pushes a new entry each
 *    time, so after editing n sets you needed 2n taps to get home.
 *
 * Going to a declared parent instead makes Back mean one thing — up a level —
 * no matter how you arrived or how long you have been clicking around.
 *
 * `null` means the screen has no parent and the button is hidden: the lobby
 * and an active game are left through "Leave game", which also settles what
 * happens to the room. Sending them "home" would be a lie anyway, since the
 * home screen auto-resumes straight back into the active game.
 */
export function parentRoute(pathname: string): string | null {
  if (pathname === '/') return null
  if (pathname.startsWith('/lobby/')) return null
  if (pathname.startsWith('/game/')) return null

  // A share link lands on /join/:pin without passing through the PIN screen,
  // but "up" from picking a name is still "enter a different PIN".
  if (pathname.startsWith('/join/')) return '/join'
  // Covers both /sets/new and /sets/:id.
  if (pathname.startsWith('/sets/')) return '/sets'

  return '/'
}

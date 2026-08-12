import { GameError } from './gameService'

/** Map a join/PIN-check failure to a translation key under `join.errors`. */
export function joinErrorKey(err: unknown): string {
  const code = err instanceof GameError ? err.code : ''
  switch (code) {
    case 'game-not-found':
      return 'join.errors.notFound'
    case 'game-started':
      return 'join.errors.started'
    case 'game-full':
      return 'join.errors.full'
    case 'name-taken':
      return 'join.errors.nameTaken'
    case 'empty-name':
      return 'join.errors.emptyName'
    case 'not-configured':
      return 'join.errors.notConfigured'
    default:
      // Anything unmapped becomes a vague "try again" for the player, which
      // once hid a Firestore PERMISSION_DENIED for days. Keep the friendly
      // message, but leave the real error somewhere a developer can find it.
      console.error('Unmapped join error:', err)
      return 'join.errors.generic'
  }
}

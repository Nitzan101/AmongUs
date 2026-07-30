import { GameError } from './gameService'

/** Map a join/PIN-check failure to a translation key under `join.errors`. */
export function joinErrorKey(err: unknown): string {
  const code = err instanceof GameError ? err.code : ''
  switch (code) {
    case 'game-not-found':
      return 'join.errors.notFound'
    case 'game-started':
      return 'join.errors.started'
    case 'name-taken':
      return 'join.errors.nameTaken'
    case 'not-configured':
      return 'join.errors.notConfigured'
    default:
      return 'join.errors.generic'
  }
}

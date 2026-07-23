/** Map a Firebase auth error to a translation key under `auth.errors`. */
export function authErrorKey(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'auth.errors.invalidCredential'
    case 'auth/email-already-in-use':
      return 'auth.errors.emailInUse'
    case 'auth/weak-password':
      return 'auth.errors.weakPassword'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'auth.errors.popupClosed'
    case 'auth/network-request-failed':
      return 'auth.errors.network'
    default:
      return 'auth.errors.generic'
  }
}

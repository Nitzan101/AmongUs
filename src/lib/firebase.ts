import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Sign-in must run on the same origin as the app.
 *
 * Firebase Hosting serves a project on both `<id>.web.app` and
 * `<id>.firebaseapp.com`, and serves the `/__/auth/*` helpers on both. If the
 * app is opened on one domain while `authDomain` points at the other, the
 * sign-in popup is cross-origin — and browsers now partition third-party
 * storage, so the popup can never hand the result back and just hangs.
 *
 * Using the current hostname whenever we're on a Hosting domain keeps the whole
 * flow same-origin. Elsewhere (localhost, a LAN IP during development) we fall
 * back to the configured domain, which works because those are allow-listed.
 */
function resolveAuthDomain(): string {
  const configured = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  if (typeof window === 'undefined') return configured
  const host = window.location.hostname
  return /\.(web\.app|firebaseapp\.com)$/.test(host) ? host : configured
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * True once real Firebase config is present. Until then the app runs fine
 * (home, join, rules all work) but sign-in is disabled instead of crashing.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey)

export const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null

export const auth: Auth | null = app ? getAuth(app) : null

export const db: Firestore | null = app ? getFirestore(app) : null

export const googleProvider = new GoogleAuthProvider()

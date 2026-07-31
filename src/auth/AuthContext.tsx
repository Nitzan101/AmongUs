import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  configured: boolean
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function ensureAuth() {
  if (!auth) {
    throw new Error('not-configured')
  }
  return auth
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      // No Firebase config yet — settle into a logged-out state.
      setLoading(false)
      return
    }
    // Pick up a sign-in that completed via redirect (see signInWithGoogle).
    getRedirectResult(auth).catch(() => {
      /* nothing pending, or it already failed visibly */
    })
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      async signInWithGoogle() {
        const a = ensureAuth()
        try {
          await signInWithPopup(a, googleProvider)
        } catch (err) {
          // Popups are unavailable in a lot of the places people open share
          // links from — in-app browsers (WhatsApp, Instagram), and anywhere
          // with strict popup blocking. Fall back to a full-page redirect,
          // which getRedirectResult picks up when we come back.
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code: unknown }).code)
              : ''
          const popupUnavailable =
            code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment' ||
            code === 'auth/web-storage-unsupported'
          if (!popupUnavailable) throw err
          await signInWithRedirect(a, googleProvider)
        }
      },
      async signUpWithEmail(name, email, password) {
        const cred = await createUserWithEmailAndPassword(
          ensureAuth(),
          email,
          password,
        )
        if (name) {
          await updateProfile(cred.user, { displayName: name })
          setUser({ ...cred.user })
        }
      },
      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(ensureAuth(), email, password)
      },
      async signOut() {
        await firebaseSignOut(ensureAuth())
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

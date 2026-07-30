import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * An account holder's saved defaults (stored at users/{uid}). Both fields are
 * optional — they only pre-fill the name/character screen, which stays editable
 * per game. Guests have no profile (their identity is per-game only).
 */
export interface Profile {
  nickname?: string
  character?: string
}

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as Profile) : null
}

export async function saveProfile(
  uid: string,
  profile: Profile,
): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', uid), profile, { merge: true })
}

/** Load the signed-in user's saved defaults (null while loading or for guests). */
export function useProfile(uid: string | undefined, isGuest: boolean) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(Boolean(uid) && !isGuest)

  useEffect(() => {
    let cancelled = false
    if (!uid || isGuest) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getProfile(uid)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        /* defaults are a convenience — fall back to an empty form */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid, isGuest])

  return { profile, loading }
}

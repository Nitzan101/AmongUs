import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { GameOptions } from './types'

/**
 * An account holder's saved defaults (stored at users/{uid}). Every field is
 * optional — they only pre-fill, and stay editable per game. Guests have no
 * profile (their identity is per-game only).
 */
export interface Profile {
  nickname?: string
  character?: string
  /**
   * The host's last-used game settings, so creating a room can skip straight
   * to a shareable link instead of asking the same questions every time.
   *
   * Deliberately per-account rather than per-group: someone who plays Hard
   * with friends and Easy with family will get the wrong default half the
   * time, which is why these stay editable in the lobby.
   */
  gameOptions?: SavedGameOptions
}

/**
 * The subset of `GameOptions` worth remembering. `wordSetId` is excluded on
 * purpose — a set can be deleted or emptied between sessions, and silently
 * defaulting a new room to a set that no longer deals is worse than starting
 * from the built-in bank.
 */
export type SavedGameOptions = Pick<
  GameOptions,
  'mode' | 'difficulty' | 'scoring' | 'guess' | 'imposterAware' | 'language'
>

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

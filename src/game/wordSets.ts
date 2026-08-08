import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { WordAssignment } from '../words'

/**
 * One entry in a custom set. `confusing` is optional — when the creator leaves
 * it blank, the game fills it at deal time with another main word from the
 * same set, which keeps the theme intact.
 */
export interface WordSetEntry {
  main: string
  confusing?: string
}

/** A themed word set owned by an account (stored at wordSets/{id}). */
export interface WordSet {
  id: string
  ownerId: string
  name: string
  /** An emoji the creator picked, so sets are recognisable at a glance. */
  icon?: string
  entries: WordSetEntry[]
  updatedAt?: Timestamp | null
}

/** A set needs at least this many entries for blank confusing words to work. */
export const MIN_SET_ENTRIES = 2

/** Shown for sets saved before icons existed, and as the picker's default. */
export const DEFAULT_SET_ICON = '✏️'

/**
 * A small spread of themes rather than an exhaustive picker — birthdays, food,
 * sport, travel, and so on — enough to label a set without a search field.
 */
export const SET_ICONS = [
  '✏️', '🎂', '🎉', '🎬', '🎵', '⚽', '🍕', '✈️',
  '🐶', '🌍', '💼', '🎮', '📚', '🚗', '🌸', '⭐',
] as const

/**
 * Emoji are stored as-is, but a set saved from another device could carry
 * anything; keep only a short string so one bad value can't break the layout.
 */
function cleanIcon(icon: string | undefined): string | undefined {
  const trimmed = icon?.trim()
  return trimmed ? trimmed.slice(0, 8) : undefined
}

function requireDb() {
  if (!db) throw new Error('not-configured')
  return db
}

const setsRef = () => collection(requireDb(), 'wordSets')
const setRef = (id: string) => doc(requireDb(), 'wordSets', id)

/**
 * Drop blank rows and trim whitespace, so stray empty rows never reach a game.
 * A blank confusing word omits the key entirely rather than storing `undefined`,
 * which Firestore rejects.
 */
export function cleanEntries(entries: WordSetEntry[]): WordSetEntry[] {
  const cleaned: WordSetEntry[] = []
  for (const e of entries) {
    const main = e.main.trim()
    if (!main) continue
    const confusing = e.confusing?.trim()
    cleaned.push(confusing ? { main, confusing } : { main })
  }
  return cleaned
}

export async function listMyWordSets(ownerId: string): Promise<WordSet[]> {
  const snap = await getDocs(query(setsRef(), where('ownerId', '==', ownerId)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WordSet, 'id'>) }))
}

export async function getWordSet(id: string): Promise<WordSet | null> {
  const snap = await getDoc(setRef(id))
  return snap.exists()
    ? { id: snap.id, ...(snap.data() as Omit<WordSet, 'id'>) }
    : null
}

export async function createWordSet(
  ownerId: string,
  name: string,
  entries: WordSetEntry[],
  icon?: string,
): Promise<string> {
  const ref = doc(setsRef())
  const cleanedIcon = cleanIcon(icon)
  await setDoc(ref, {
    ownerId,
    name: name.trim(),
    // Omitted rather than set to undefined, which Firestore rejects.
    ...(cleanedIcon ? { icon: cleanedIcon } : {}),
    entries: cleanEntries(entries),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateWordSet(
  id: string,
  name: string,
  entries: WordSetEntry[],
  icon?: string,
): Promise<void> {
  const cleanedIcon = cleanIcon(icon)
  await updateDoc(setRef(id), {
    name: name.trim(),
    // deleteField() rather than a bare undefined, so clearing an icon on an
    // existing set actually removes it instead of being rejected.
    icon: cleanedIcon ?? deleteField(),
    entries: cleanEntries(entries),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWordSet(id: string): Promise<void> {
  await deleteDoc(setRef(id))
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Deal from a custom set. A filled `confusing` is used as written; a blank one
 * is replaced by another entry's main word, so the imposter still gets
 * something on-theme rather than a word from the generic bank.
 */
export function pickWordsFromSet(entries: WordSetEntry[]): WordAssignment {
  const usable = cleanEntries(entries)
  const entry = randomItem(usable)
  const main = entry.main
  if (entry.confusing) return { main, confusing: entry.confusing }

  const others = usable.filter((e) => e.main !== main)
  return {
    main,
    confusing: others.length > 0 ? randomItem(others).main : main,
  }
}

/** Load the signed-in user's sets (empty for guests). */
export function useMyWordSets(uid: string | undefined, isGuest: boolean) {
  const [sets, setSets] = useState<WordSet[]>([])
  const [loading, setLoading] = useState(Boolean(uid) && !isGuest)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!uid || isGuest) {
      setSets([])
      setLoading(false)
      return
    }
    setLoading(true)
    listMyWordSets(uid)
      .then((s) => {
        if (!cancelled) setSets(s)
      })
      .catch(() => {
        if (!cancelled) setSets([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid, isGuest, reloadKey])

  return { sets, loading, reload: () => setReloadKey((k) => k + 1) }
}

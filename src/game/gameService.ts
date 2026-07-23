import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import type { Game, GameOptions, Player } from './types'

/** Errors thrown by this module carry a stable `code` the UI maps to a message. */
export class GameError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

function requireDb() {
  if (!db || !auth) throw new GameError('not-configured')
  return { db, auth }
}

/** Ensure there's a signed-in user, creating an anonymous guest if needed. */
export async function ensureSignedIn(): Promise<string> {
  const { auth } = requireDb()
  if (auth.currentUser) return auth.currentUser.uid
  const cred = await signInAnonymously(auth)
  return cred.user.uid
}

function randomPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const gameRef = (pin: string) => doc(requireDb().db, 'games', pin)
const playersRef = (pin: string) =>
  collection(requireDb().db, 'games', pin, 'players')
const playerRef = (pin: string, uid: string) =>
  doc(requireDb().db, 'games', pin, 'players', uid)

/** Create a new game room, add the host as the first player, return the PIN. */
export async function createGame(
  options: GameOptions,
  host: { uid: string; name: string; character: string },
): Promise<string> {
  requireDb()

  // Pick a PIN that isn't already taken (retry a few times).
  let pin = randomPin()
  for (let i = 0; i < 5; i++) {
    const existing = await getDoc(gameRef(pin))
    if (!existing.exists()) break
    pin = randomPin()
  }

  const game: Game = {
    pin,
    hostId: host.uid,
    status: 'lobby',
    ...options,
  }
  await setDoc(gameRef(pin), game)

  const player: Player = {
    id: host.uid,
    name: host.name,
    character: host.character,
    isHost: true,
    score: 0,
  }
  await setDoc(playerRef(pin, host.uid), player)

  return pin
}

/** Join an existing game as a (possibly anonymous) player. */
export async function joinGame(
  pin: string,
  name: string,
  character: string,
): Promise<void> {
  requireDb()
  const uid = await ensureSignedIn()

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')
  if ((snap.data() as Game).status !== 'lobby') throw new GameError('game-started')

  // Reject a nickname already taken by someone else.
  const players = await getDocs(playersRef(pin))
  const clash = players.docs.some(
    (d) =>
      d.id !== uid &&
      (d.data() as Player).name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
  )
  if (clash) throw new GameError('name-taken')

  const player: Player = {
    id: uid,
    name: name.trim(),
    character,
    isHost: false,
    score: 0,
  }
  await setDoc(playerRef(pin, uid), player)
}

/** Live updates to the game document. */
export function subscribeGame(
  pin: string,
  onChange: (game: Game | null) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    gameRef(pin),
    (snap) => onChange(snap.exists() ? (snap.data() as Game) : null),
    onError,
  )
}

/** Live updates to the player list. */
export function subscribePlayers(
  pin: string,
  onChange: (players: Player[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    playersRef(pin),
    (snap) => onChange(snap.docs.map((d) => d.data() as Player)),
    onError,
  )
}

/** Remove a player from the game (host action). */
export async function kickPlayer(pin: string, playerId: string): Promise<void> {
  requireDb()
  await deleteDoc(playerRef(pin, playerId))
}

/** Leave a game (removes your own player doc). */
export async function leaveGame(pin: string, uid: string): Promise<void> {
  requireDb()
  await deleteDoc(playerRef(pin, uid))
}

/** Move the game from the lobby into play (host action). */
export async function startGame(pin: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { status: 'playing' })
}

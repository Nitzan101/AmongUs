import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { buildAssignment } from './assignment'
import { tallyVotes } from './tally'
import type { Game, GameOptions, Player, RoundPhase, Secret, Vote } from './types'

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
const secretRef = (pin: string, uid: string) =>
  doc(requireDb().db, 'games', pin, 'secrets', uid)
const votesRef = (pin: string) => collection(requireDb().db, 'games', pin, 'votes')
const voteRef = (pin: string, voterId: string) =>
  doc(requireDb().db, 'games', pin, 'votes', voterId)

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

/**
 * Deal a fresh game (host action): choose the imposter, deal words into
 * per-player secret docs, set the turn order, and move into the clue phase.
 */
export async function startGame(pin: string): Promise<void> {
  const { db } = requireDb()

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')
  const game = snap.data() as Game

  const playersSnap = await getDocs(playersRef(pin))
  const playerIds = playersSnap.docs.map((d) => d.id)
  if (playerIds.length < 4) throw new GameError('not-enough-players')

  const assignment = buildAssignment(playerIds, {
    language: game.language,
    difficulty: game.difficulty,
    seatOrder: game.seatOrder,
    prevGameNumber: game.gameNumber,
  })

  const batch = writeBatch(db)
  for (const id of playerIds) {
    batch.set(secretRef(pin, id), assignment.secrets[id])
  }
  batch.update(gameRef(pin), {
    status: 'playing',
    seatOrder: assignment.seatOrder,
    gameNumber: assignment.gameNumber,
    round: {
      number: 1,
      phase: 'clues',
      turnOrder: assignment.turnOrder,
      aliveIds: assignment.seatOrder,
    },
  })
  await batch.commit()
}

/** Advance the round to a new phase (host action). */
export async function setPhase(pin: string, phase: RoundPhase): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { 'round.phase': phase })
}

/** Live updates to the caller's own secret assignment. */
export function subscribeSecret(
  pin: string,
  uid: string,
  onChange: (secret: Secret | null) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    secretRef(pin, uid),
    (snap) => onChange(snap.exists() ? (snap.data() as Secret) : null),
    onError,
  )
}

async function clearVotes(pin: string): Promise<void> {
  const { db } = requireDb()
  const snap = await getDocs(votesRef(pin))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** Find which of the given players is the imposter (read at game end only). */
async function findImposter(
  pin: string,
  ids: string[],
): Promise<string | null> {
  for (const id of ids) {
    const snap = await getDoc(secretRef(pin, id))
    if (snap.exists() && (snap.data() as Secret).role === 'imposter') return id
  }
  return null
}

/** Open voting (host, from the clue phase). */
export async function openVoting(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  await updateDoc(gameRef(pin), {
    'round.phase': 'voting',
    'round.votingRound': 'first',
    'round.candidates': game.round?.aliveIds ?? [],
  })
}

/** Cast (or change) your vote. */
export async function castVote(
  pin: string,
  voterId: string,
  targetId: string,
): Promise<void> {
  requireDb()
  const vote: Vote = { voter: voterId, target: targetId }
  await setDoc(voteRef(pin, voterId), vote)
}

/** Live updates to the current votes. */
export function subscribeVotes(
  pin: string,
  onChange: (votes: Vote[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    votesRef(pin),
    (snap) => onChange(snap.docs.map((d) => d.data() as Vote)),
    onError,
  )
}

/** Reveal the votes (host, once everyone has voted). */
export async function revealVotes(pin: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { 'round.phase': 'tally' })
}

/**
 * Resolve the revealed votes (host). Unique top → elimination + role reveal.
 * Tie on the first vote → revote among the tied; tie again → no elimination,
 * next round.
 */
export async function resolveVote(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  const round = game.round!
  const votesSnap = await getDocs(votesRef(pin))
  const votes = votesSnap.docs.map((d) => d.data() as Vote)
  const candidates = round.candidates ?? round.aliveIds

  const result = tallyVotes(votes, candidates)

  if (result.kind === 'tie') {
    await clearVotes(pin)
    if (round.votingRound === 'first' && (result.tied?.length ?? 0) > 1) {
      // Revote among only the tied players.
      await updateDoc(gameRef(pin), {
        'round.phase': 'voting',
        'round.votingRound': 'revote',
        'round.candidates': result.tied,
      })
    } else {
      // Still tied (or nobody votable) → nobody out, next round.
      await updateDoc(gameRef(pin), {
        'round.phase': 'clues',
        'round.number': round.number + 1,
        'round.votingRound': null,
        'round.candidates': null,
      })
    }
    return
  }

  const eliminatedId = result.eliminatedId!
  const secretSnap = await getDoc(secretRef(pin, eliminatedId))
  const role = secretSnap.exists()
    ? (secretSnap.data() as Secret).role
    : 'crew'
  await updateDoc(gameRef(pin), {
    'round.phase': 'reveal',
    'round.eliminatedId': eliminatedId,
    'round.eliminatedRole': role,
  })
}

/** Continue after the elimination reveal (host): next round, or game over. */
export async function continueAfterReveal(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  const round = (snap.data() as Game).round!
  const newAlive = round.aliveIds.filter((id) => id !== round.eliminatedId)
  await clearVotes(pin)

  if (round.eliminatedRole === 'imposter') {
    await updateDoc(gameRef(pin), {
      'round.phase': 'result',
      'round.outcome': 'crew-wins',
      'round.aliveIds': newAlive,
      'round.imposterId': round.eliminatedId,
    })
  } else if (newAlive.length <= 2) {
    // Imposter has reached the final two → auto-win.
    await updateDoc(gameRef(pin), {
      'round.phase': 'result',
      'round.outcome': 'imposter-wins',
      'round.aliveIds': newAlive,
      'round.imposterId': await findImposter(pin, newAlive),
    })
  } else {
    await updateDoc(gameRef(pin), {
      'round.phase': 'clues',
      'round.number': round.number + 1,
      'round.aliveIds': newAlive,
      'round.eliminatedId': null,
      'round.eliminatedRole': null,
      'round.votingRound': null,
      'round.candidates': null,
    })
  }
}

/** Return the room to the lobby for another game (host). */
export async function backToLobby(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  await updateDoc(gameRef(pin), { status: 'lobby', round: null })
}

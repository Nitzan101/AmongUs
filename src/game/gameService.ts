import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { buildAssignment } from './assignment'
import { tallyVotes } from './tally'
import { computeScores } from './scoring'
import { isCloseMatch, normalizeGuess } from './textMatch'
import type {
  Clue,
  Game,
  GameOptions,
  Outcome,
  Player,
  RoundPhase,
  Secret,
  Vote,
} from './types'

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
const cluesRef = (pin: string) => collection(requireDb().db, 'games', pin, 'clues')
const clueRef = (pin: string, round: number, playerId: string) =>
  doc(requireDb().db, 'games', pin, 'clues', `r${round}_${playerId}`)

const LAST_GAME_KEY = 'imposter:lastPin'

function rememberGame(pin: string): void {
  try {
    localStorage.setItem(LAST_GAME_KEY, pin)
  } catch {
    /* storage unavailable — resume just won't work on this device */
  }
}

/** Forget the remembered game (called on explicit leave, or once we notice we're no longer in it). */
export function forgetGame(): void {
  try {
    localStorage.removeItem(LAST_GAME_KEY)
  } catch {
    /* storage unavailable */
  }
}

function getRememberedGame(): string | null {
  try {
    return localStorage.getItem(LAST_GAME_KEY)
  } catch {
    return null
  }
}

/** Synchronous check so the UI can skip a loading flash when there's nothing to resume. */
export function hasRememberedGame(): boolean {
  return getRememberedGame() !== null
}

/** If this device was mid-game, find it so the app can drop back into it. */
export async function findMyActiveGame(
  uid: string,
): Promise<{ pin: string; game: Game } | null> {
  const pin = getRememberedGame()
  if (!pin) return null

  const gSnap = await getDoc(gameRef(pin))
  if (!gSnap.exists()) {
    forgetGame()
    return null
  }
  const pSnap = await getDoc(playerRef(pin, uid))
  if (!pSnap.exists()) {
    forgetGame()
    return null
  }
  return { pin, game: gSnap.data() as Game }
}

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

  const player = {
    id: host.uid,
    name: host.name,
    character: host.character,
    isHost: true,
    score: 0,
    lastSeen: serverTimestamp(),
  }
  await setDoc(playerRef(pin, host.uid), player)

  rememberGame(pin)
  return pin
}

/**
 * Check a PIN before asking for a name/character, so the player finds out
 * immediately if the game doesn't exist or has already started.
 */
export async function checkGameJoinable(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')
  if ((snap.data() as Game).status !== 'lobby') throw new GameError('game-started')
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

  const player = {
    id: uid,
    name: name.trim(),
    character,
    isHost: false,
    score: 0,
    lastSeen: serverTimestamp(),
  }
  await setDoc(playerRef(pin, uid), player)
  rememberGame(pin)
}

/** Update this player's "still here" timestamp. Silently ignored if they've left. */
export async function touchPresence(pin: string, uid: string): Promise<void> {
  requireDb()
  await updateDoc(playerRef(pin, uid), { lastSeen: serverTimestamp() }).catch(
    () => {},
  )
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
  await removeFromRound(pin, playerId)
}

/**
 * Leave a game. If the leaver was the host, leadership passes to `newHostId`
 * when given (the host's own choice) or to whoever remains, so the game can
 * still be driven; the room is deleted if nobody is left.
 */
export async function leaveGame(
  pin: string,
  uid: string,
  newHostId?: string,
): Promise<void> {
  requireDb()
  await deleteDoc(playerRef(pin, uid))
  forgetGame()

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game

  const remaining = (await getDocs(playersRef(pin))).docs
  if (remaining.length === 0) {
    await closeGame(pin)
    return
  }

  if (game.hostId === uid) {
    const successor =
      newHostId && remaining.some((d) => d.id === newHostId)
        ? newHostId
        : remaining[0].id
    await promoteHost(pin, successor)
  }
  await removeFromRound(pin, uid)
}

/**
 * End the game for everyone (host action): deletes the room and everything in
 * it, so every player's app drops back to the home screen.
 */
export async function closeGame(pin: string): Promise<void> {
  const { db } = requireDb()
  for (const sub of ['players', 'secrets', 'votes', 'clues']) {
    const snap = await getDocs(collection(db, 'games', pin, sub))
    if (snap.empty) continue
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(gameRef(pin))
  forgetGame()
}

/** Hand leadership to another player (host migration). */
export async function promoteHost(
  pin: string,
  newHostId: string,
): Promise<void> {
  const { db } = requireDb()
  const players = await getDocs(playersRef(pin))
  const batch = writeBatch(db)
  players.docs.forEach((d) => {
    const shouldBeHost = d.id === newHostId
    if ((d.data() as Player).isHost !== shouldBeHost) {
      batch.update(d.ref, { isHost: shouldBeHost })
    }
  })
  batch.update(gameRef(pin), { hostId: newHostId })
  await batch.commit()
}

/** Drop a departed player from the active round so play can continue. */
async function removeFromRound(pin: string, uid: string): Promise<void> {
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game
  const round = game.round
  if (game.status !== 'playing' || !round) return

  const updates: Record<string, unknown> = {}
  if (round.aliveIds.includes(uid)) {
    updates['round.aliveIds'] = round.aliveIds.filter((id) => id !== uid)
  }
  if (round.turnOrder.includes(uid)) {
    updates['round.turnOrder'] = round.turnOrder.filter((id) => id !== uid)
  }
  if (round.candidates?.includes(uid)) {
    updates['round.candidates'] = round.candidates.filter((id) => id !== uid)
  }
  if (Object.keys(updates).length > 0) {
    await updateDoc(gameRef(pin), updates)
  }
  // Their vote no longer counts toward "everyone voted".
  await deleteDoc(voteRef(pin, uid)).catch(() => {})
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

  await clearVotes(pin)
  await clearClues(pin)
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
      voteHistory: [],
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

async function clearClues(pin: string): Promise<void> {
  const { db } = requireDb()
  const snap = await getDocs(cluesRef(pin))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** Live updates to the typed clues (full-virtual mode). */
export function subscribeClues(
  pin: string,
  onChange: (clues: Clue[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    cluesRef(pin),
    (snap) => {
      const clues = snap.docs.map((d) => d.data() as Clue)
      clues.sort((a, b) =>
        a.round === b.round ? a.index - b.index : a.round - b.round,
      )
      onChange(clues)
    },
    onError,
  )
}

/**
 * Submit your clue word for this round (full-virtual mode). Rejects a word
 * already said this game, and enforces that it's actually your turn.
 */
export async function submitClue(
  pin: string,
  playerId: string,
  word: string,
): Promise<void> {
  requireDb()
  const trimmed = word.trim()
  if (!trimmed) throw new GameError('empty-word')

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')
  const round = (snap.data() as Game).round
  if (!round) throw new GameError('no-round')

  const existing = (await getDocs(cluesRef(pin))).docs.map(
    (d) => d.data() as Clue,
  )
  if (existing.some((c) => normalizeGuess(c.word) === normalizeGuess(trimmed))) {
    throw new GameError('word-already-said')
  }

  const thisRound = existing.filter((c) => c.round === round.number)
  if (thisRound.some((c) => c.playerId === playerId)) {
    throw new GameError('already-submitted')
  }

  // Only the player whose turn it is may submit.
  const order = round.turnOrder.filter((id) => round.aliveIds.includes(id))
  const expected = order[thisRound.length]
  if (expected !== playerId) throw new GameError('not-your-turn')

  const clue: Clue = {
    playerId,
    word: trimmed,
    round: round.number,
    index: thisRound.length,
  }
  await setDoc(clueRef(pin, round.number, playerId), clue)
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

  // Keep a running history of every vote for the Detective bonus.
  const voteHistory = [...(round.voteHistory ?? []), ...votes]
  await updateDoc(gameRef(pin), { 'round.voteHistory': voteHistory })

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

/** Continue after the elimination reveal (host): guess, next round, or game over. */
export async function continueAfterReveal(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  const round = game.round!
  const newAlive = round.aliveIds.filter((id) => id !== round.eliminatedId)
  await clearVotes(pin)

  if (round.eliminatedRole === 'imposter') {
    // Crew caught the imposter.
    if (game.guess !== 'off') {
      await updateDoc(gameRef(pin), {
        'round.phase': 'guess',
        'round.aliveIds': newAlive,
        'round.guessText': null,
        'round.guessCorrect': null,
      })
    } else {
      await updateDoc(gameRef(pin), { 'round.aliveIds': newAlive })
      await finalizeGame(pin, 'crew-wins', false)
    }
  } else if (newAlive.length <= 2) {
    // Imposter has reached the final two → auto-win.
    await updateDoc(gameRef(pin), { 'round.aliveIds': newAlive })
    await finalizeGame(pin, 'imposter-wins', false)
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

/** The caught imposter submits their guess at the main word. */
export async function castGuess(pin: string, text: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { 'round.guessText': text })
}

/**
 * Resolve the imposter's guess (host). An exact match or a small typo is
 * accepted automatically; anything else (including a fair synonym) is shown
 * to the host to judge, rather than auto-rejected.
 */
export async function resolveGuess(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  const round = game.round!
  const imposterId = round.eliminatedId ?? ''
  const crewId =
    (game.seatOrder ?? round.aliveIds).find((id) => id !== imposterId) ?? ''
  const crewSecret = await getDoc(secretRef(pin, crewId))
  const mainWord = crewSecret.exists() ? (crewSecret.data() as Secret).word : ''

  if (isCloseMatch(round.guessText ?? '', mainWord)) {
    await finalizeGame(pin, 'crew-wins', true)
    return
  }
  await updateDoc(gameRef(pin), { 'round.guessNeedsReview': true })
}

/** Host manually judges a guess that didn't auto-match (typo vs. synonym vs. wrong). */
export async function resolveGuessReview(
  pin: string,
  correct: boolean,
): Promise<void> {
  requireDb()
  await finalizeGame(pin, 'crew-wins', correct)
}

/** Move from the round recap to the cumulative scoreboard (host). */
export async function continueToScoreboard(pin: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { 'round.phase': 'result' })
}

/** Score the finished game, apply it to the scoreboard, and reveal everything. */
async function finalizeGame(
  pin: string,
  outcome: Outcome,
  guessCorrect: boolean,
): Promise<void> {
  const { db } = requireDb()
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  const round = game.round!
  const playerIds = game.seatOrder ?? round.aliveIds
  const imposterId =
    outcome === 'crew-wins'
      ? (round.eliminatedId ?? '')
      : ((await findImposter(pin, round.aliveIds)) ?? '')
  const crewId = playerIds.find((id) => id !== imposterId) ?? playerIds[0]
  const crewSecret = await getDoc(secretRef(pin, crewId))
  const mainWord = crewSecret.exists() ? (crewSecret.data() as Secret).word : ''

  const scoreLines = computeScores({
    preset: game.scoring,
    playerIds,
    imposterId,
    outcome,
    aliveIds: round.aliveIds,
    guessRule: game.guess,
    guessCorrect,
    voteHistory: round.voteHistory ?? [],
  })

  const playersSnap = await getDocs(playersRef(pin))
  const batch = writeBatch(db)
  playersSnap.docs.forEach((d) => {
    const delta = scoreLines[d.id]?.delta ?? 0
    if (delta) batch.update(d.ref, { score: increment(delta) })
  })
  batch.update(gameRef(pin), {
    'round.phase': 'recap',
    'round.outcome': outcome,
    'round.imposterId': imposterId,
    'round.mainWord': mainWord,
    'round.guessCorrect': guessCorrect,
    'round.scoreBreakdown': scoreLines,
  })
  await batch.commit()
}

/** Return the room to the lobby for another game (host). */
export async function backToLobby(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  await clearClues(pin)
  await updateDoc(gameRef(pin), { status: 'lobby', round: null })
}

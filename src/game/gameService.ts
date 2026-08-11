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
import {
  cleanEntries,
  getWordSet,
  MIN_SET_ENTRIES,
  type WordSetEntry,
} from './wordSets'
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
 * Rename yourself, or change your character, from the lobby.
 *
 * The host never chose either when creating the room — that screen was traded
 * away so the share link appears in one tap — so this is where they fix a
 * random animal or a name taken from their email address. Players who joined
 * normally can correct a typo the same way.
 */
export async function updatePlayerIdentity(
  pin: string,
  uid: string,
  name: string,
  character: string,
): Promise<void> {
  requireDb()
  const trimmed = name.trim()
  if (!trimmed) throw new GameError('empty-name')

  // Same clash rule as joining: two players with one name makes voting by
  // name ambiguous.
  const players = await getDocs(playersRef(pin))
  const clash = players.docs.some(
    (d) =>
      d.id !== uid &&
      (d.data() as Player).name.trim().toLowerCase() === trimmed.toLowerCase(),
  )
  if (clash) throw new GameError('name-taken')

  await updateDoc(playerRef(pin, uid), { name: trimmed, character })
}

/**
 * Change a room's settings from the lobby (host only, enforced by the rules).
 *
 * Safe to do while players trickle in: `startGame` reads the game document
 * fresh when it deals, so whatever is set at the moment Start is pressed is
 * what the game uses. Callers must keep this to the lobby — changing anything
 * mid-game would not re-deal, so it would only mislead.
 */
export async function updateGameOptions(
  pin: string,
  patch: Partial<GameOptions>,
): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), patch)
}

/** What a PIN check found, so the caller knows whether to ask for a name. */
export interface JoinCheck {
  /** True when this device is already a player — skip the identity step. */
  alreadyJoined: boolean
  /**
   * True when a round is already running. Joining still works; the newcomer
   * watches this one out and is dealt into the next.
   */
  inProgress: boolean
}

/**
 * Check a PIN before asking for a name/character, so a wrong PIN is caught
 * before anyone fills in a name.
 *
 * Someone who is *already* a player is let straight back in, even mid-game:
 * that's the rejoin path (tapping the share link again, or reopening after a
 * crash), and it would be absurd to tell a player their own game has already
 * started. The remembered PIN is refreshed so auto-resume works afterwards.
 */
export async function checkGameJoinable(pin: string): Promise<JoinCheck> {
  requireDb()
  const uid = await ensureSignedIn()
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')

  const mine = await getDoc(playerRef(pin, uid))
  if (mine.exists()) {
    rememberGame(pin)
    return { alreadyJoined: true, inProgress: false }
  }

  // A running game no longer turns latecomers away. At a party someone always
  // arrives halfway through, and being told to wait outside until the whole
  // room finishes is worse than watching a round. They sit this one out and
  // are dealt into the next, which the room returns to a lobby for anyway.
  return {
    alreadyJoined: false,
    inProgress: (snap.data() as Game).status !== 'lobby',
  }
}

/**
 * Join an existing game as a (possibly anonymous) player.
 *
 * Joining mid-round is allowed. The new player simply isn't in the running
 * round's `turnOrder` or `aliveIds`, so they watch it out; `startGame`
 * reconciles the seating from the real player list, so the next game deals
 * them in with a seat of their own.
 */
export async function joinGame(
  pin: string,
  name: string,
  character: string,
): Promise<void> {
  requireDb()
  const uid = await ensureSignedIn()

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')

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

  // Coming back is coming back as somebody new.
  //
  // Leaving is meant to be final, but the round can still be carrying this
  // uid — either from a game they were dealt into before walking, or because
  // their cleanup never landed. Left there, the app treats them as a player
  // who never went away: holding a seat, votable, expected to speak. Clearing
  // it makes them a spectator on zero points who is dealt into the next game,
  // which is what leaving and returning should mean.
  const gameNow = snap.data() as Game
  const round = gameNow.round
  if (gameNow.status === 'playing' && round) {
    const stale =
      round.aliveIds.includes(uid) ||
      round.turnOrder.includes(uid) ||
      Boolean(round.candidates?.includes(uid))
    if (stale) {
      await updateDoc(gameRef(pin), {
        'round.aliveIds': round.aliveIds.filter((id) => id !== uid),
        'round.turnOrder': round.turnOrder.filter((id) => id !== uid),
        ...(round.candidates
          ? { 'round.candidates': round.candidates.filter((id) => id !== uid) }
          : {}),
      })
    }
  }
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

  // Cleanup FIRST, while we still have the right to do it. The rules only let
  // a current player (or the host) touch the round, so deleting ourselves and
  // then tidying up meant the tidy-up was silently denied: the leaver stayed
  // in `aliveIds`, could still be voted for, and the round waited on a vote
  // that was never coming.
  await removeFromRound(pin, uid)

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

  // Ending the game is deliberately NOT done here. Finalising writes every
  // player's score, which the rules only allow the host to do — a departing
  // player attempting it would just be denied. The host's device watches for
  // the final two instead (see `endIfTooFewAlive`).
}

/**
 * End the game when the table has shrunk to two — **host only**.
 *
 * People walking out can reach the final two just as an elimination can, and
 * the same rule applies: with two left there is no majority to be had. Without
 * this the round carried on with a pair voting at each other, and a tie simply
 * started another one.
 *
 * The host drives it for the same reason they drive the reveal: finalising
 * writes everyone's scores, which only the host may do. Safe to call on every
 * change — it returns immediately unless the game is live and actually down to
 * two.
 */
export async function endIfTooFewAlive(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game
  const round = game.round
  if (game.status !== 'playing' || !round) return
  // Only while the round is idle. `tally`, `reveal` and `guess` are each
  // mid-resolution and already decide the ending themselves — stepping in
  // during one finalised the game underneath `continueAfterReveal`, which
  // then had nothing coherent to continue and left the button dead.
  if (round.phase !== 'clues' && round.phase !== 'voting') return

  // Trust the player list, not `aliveIds`.
  //
  // `aliveIds` is maintained by whoever leaves, and that write can simply not
  // happen — a closed tab, a dropped connection, a rule that refused it. When
  // it didn't, the round went on believing four people were playing while two
  // were in the room, and nothing ever ended. Recomputing from the players who
  // actually still exist makes this self-correcting: it no longer matters why
  // the earlier cleanup was missed.
  const playersSnap = await getDocs(playersRef(pin))
  const present = new Set(playersSnap.docs.map((d) => d.id))
  const trulyAlive = round.aliveIds.filter((id) => present.has(id))

  if (trulyAlive.length !== round.aliveIds.length) {
    await updateDoc(gameRef(pin), {
      'round.aliveIds': trulyAlive,
      'round.turnOrder': round.turnOrder.filter((id) => present.has(id)),
      ...(round.candidates
        ? { 'round.candidates': round.candidates.filter((id) => present.has(id)) }
        : {}),
    })
  }

  // Two conditions end a game early, and both come from people leaving rather
  // than being caught:
  //
  //  * The imposter has gone. There is nobody left to catch, so the crew have
  //    it — however many players remain. Without this the round ran on with no
  //    imposter in it at all, which nobody can ever win.
  //  * Only two are left. No majority is possible, so the imposter takes it,
  //    exactly as when an elimination reaches the final two.
  const imposterStillIn = await findImposter(pin, trulyAlive)
  if (!imposterStillIn) {
    // Say who it *was*. Scoring needs a real imposter id, and the usual source
    // — the player just eliminated — is empty here, because nobody was
    // eliminated: they walked. The seating still lists them, since it records
    // who the game was dealt to.
    const departed = await findImposter(pin, game.seatOrder ?? round.turnOrder)
    await finalizeGame(pin, 'crew-wins', false, departed ?? undefined)
    return
  }
  if (trulyAlive.length <= 2) {
    await finalizeGame(pin, 'imposter-wins', false)
  }
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

  // A custom set replaces the built-in bank for this game. If it has since been
  // deleted or emptied, fall back to the bank rather than failing to deal.
  let setEntries: WordSetEntry[] | undefined
  // Recorded on the game so every player can see which set they're playing
  // from. Only the host can read their own sets, so this is the one chance to
  // capture the name; null when the built-in bank is used.
  let wordSetName: string | null = null
  if (game.wordSetId) {
    const set = await getWordSet(game.wordSetId).catch(() => null)
    const usable = set ? cleanEntries(set.entries) : []
    if (usable.length >= MIN_SET_ENTRIES) {
      setEntries = usable
      wordSetName = set?.name ?? null
    }
  }

  const assignment = buildAssignment(playerIds, {
    language: game.language,
    difficulty: game.difficulty,
    seatOrder: game.seatOrder,
    prevGameNumber: game.gameNumber,
    setEntries,
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
    wordSetName,
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

/** Host override: move on without waiting for the guess (counts as wrong). */
export async function skipGuess(pin: string): Promise<void> {
  requireDb()
  await finalizeGame(pin, 'crew-wins', false)
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
  /**
   * Who the imposter was, when the usual sources can't say. A crew win
   * normally means the imposter was just eliminated, so it reads
   * `eliminatedId` — but a game that ends because the imposter *left* has no
   * elimination, and scoring with an empty id crashed.
   */
  imposterIdOverride?: string,
): Promise<void> {
  const { db } = requireDb()
  const snap = await getDoc(gameRef(pin))
  const game = snap.data() as Game
  const round = game.round!
  const playerIds = game.seatOrder ?? round.aliveIds
  const imposterId =
    imposterIdOverride ??
    (outcome === 'crew-wins'
      ? (round.eliminatedId ?? '')
      : ((await findImposter(pin, round.aliveIds)) ?? ''))
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

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
  PlayerBadge,
  Round,
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

/**
 * Ensure there's a signed-in user, creating an anonymous guest if needed.
 *
 * **Wait for the session to be restored before concluding there isn't one.**
 * Firebase reads the persisted account back asynchronously, so `currentUser`
 * is null for the first moments of every cold load — and the first thing a
 * share link does on landing is call this. Deciding then that nobody was
 * signed in created a guest and *replaced the real account with it*: the app
 * came back as "Hi, Guest", and every game after that counted for nobody.
 * Silent, permanent, and on the app's most-used way in.
 */
export async function ensureSignedIn(): Promise<string> {
  const { auth } = requireDb()
  await auth.authStateReady()
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
const secretsRef = (pin: string) =>
  collection(requireDb().db, 'games', pin, 'secrets')
const secretRef = (pin: string, uid: string) =>
  doc(requireDb().db, 'games', pin, 'secrets', uid)
const votesRef = (pin: string) => collection(requireDb().db, 'games', pin, 'votes')
const voteRef = (pin: string, voterId: string) =>
  doc(requireDb().db, 'games', pin, 'votes', voterId)
const cluesRef = (pin: string) => collection(requireDb().db, 'games', pin, 'clues')
const clueRef = (pin: string, round: number, playerId: string) =>
  doc(requireDb().db, 'games', pin, 'clues', `r${round}_${playerId}`)
const nameRef = (pin: string, key: string) =>
  doc(requireDb().db, 'games', pin, 'names', key)

/**
 * Fewest players a game can be dealt to. Below four there aren't enough crew
 * for a vote to mean anything.
 *
 * Lives here rather than in each screen that needs it: the lobby and the
 * end-of-game screen both gate the Start button on it, and they each had their
 * own copy with a comment asking whoever changed one to remember the other.
 */
export const MIN_PLAYERS = 4

/** As many as one screen of player rows can hold, and as many as a table can hear. */
export const MAX_PLAYERS = 12

/**
 * The document id a nickname claims (see `claimName`).
 *
 * Percent-encoded because a document id may not contain a slash, and prefixed
 * so it can never come out as `.`, `..`, or a reserved `__…__` id.
 */
function nameKey(name: string): string {
  return `n_${encodeURIComponent(name.trim().toLowerCase())}`
}

/**
 * Take a nickname for this room, atomically.
 *
 * Checking the player list and then writing loses the race: two people typing
 * "Ben" at the same moment are two reads that both saw nothing, and both then
 * write. Here the *name is the document id*, so the second write is a write to
 * a document that already exists — which the rules refuse. One of them gets
 * in; the other is told the name is taken.
 *
 * A claim can outlive its owner when their cleanup never lands, so the rules
 * also let one be taken over once the holder has no player document and the
 * claim has had a minute to settle. The delay is what protects the gap between
 * claiming a name and creating the player document, during which the claimant
 * legitimately looks absent.
 */
async function claimName(pin: string, uid: string, name: string): Promise<void> {
  const ref = nameRef(pin, nameKey(name))
  try {
    await setDoc(ref, { uid, name: name.trim(), claimedAt: serverTimestamp() })
    return
  } catch {
    // Refused. Find out why before turning anyone away.
  }

  // A refusal is not proof the name is taken, and treating it as one would be
  // the worse failure by far: rules are deployed separately from the app, so
  // between the two this collection can be unreadable and unwritable
  // altogether — and refusing every join is a far bigger problem than the
  // race this guards against. So we look. Only somebody else's claim, plainly
  // visible, blocks the name; anything we cannot see falls back to the player
  // list check, exactly as before claims existed.
  const held = await getDoc(ref).catch(() => null)
  if (held?.exists() && (held.data() as { uid?: string }).uid !== uid) {
    throw new GameError('name-taken')
  }
}

/** Give a nickname back, so whoever wants it next may have it. */
async function releaseName(pin: string, name: string | undefined): Promise<void> {
  if (!name?.trim()) return
  await deleteDoc(nameRef(pin, nameKey(name))).catch(() => {})
}

/**
 * The game and its round together, or null if either has gone.
 *
 * Every caller below is something a person just pressed, and the host can
 * close the room in the moment between the press and the read. Casting
 * `snap.data()` regardless turned that race into a TypeError on `undefined`
 * — a crash in a promise nobody was watching — where doing nothing at all is
 * the correct answer: the room the action referred to no longer exists.
 */
async function loadRound(
  pin: string,
): Promise<{ game: Game; round: Round } | null> {
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return null
  const game = snap.data() as Game
  return game.round ? { game, round: game.round } : null
}

/**
 * Delete every document in one of a game's sub-collections.
 *
 * Chunked, because a write batch takes at most 500 operations. Only the clues
 * of a long full-virtual game at a full table can realistically approach that
 * — but a room that cannot be closed is a poor way to discover the limit.
 */
async function clearCollection(pin: string, sub: string): Promise<void> {
  const { db } = requireDb()
  const snap = await getDocs(collection(db, 'games', pin, sub))
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/** Comfortably under Firestore's 500-operation ceiling. */
const BATCH_LIMIT = 450

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
  host: {
    uid: string
    name: string
    character: string
    /** Copied from the account's saved default, so it shows from the start. */
    badge?: PlayerBadge | null
  },
): Promise<string> {
  requireDb()

  // Pick a PIN that isn't already taken.
  //
  // Every candidate is checked, including the last. The old loop generated a
  // replacement *after* its final check and then used it unverified, so a
  // clash surfaced as a permission-denied on the write and a generic "couldn't
  // create a game" — the one failure mode with an obvious retry.
  let pin = ''
  for (let i = 0; i < 6; i++) {
    const candidate = randomPin()
    const existing = await getDoc(gameRef(candidate))
    if (!existing.exists()) {
      pin = candidate
      break
    }
  }
  if (!pin) throw new GameError('pin-unavailable')

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
    ...(host.badge ? { displayedBadge: host.badge } : {}),
  }
  await setDoc(playerRef(pin, host.uid), player)
  // Nothing to lose the race against in an empty room, but the claim has to
  // exist or the first person through the door could take the host's name.
  await claimName(pin, host.uid, host.name).catch(() => {})

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

  const previous = (players.docs.find((d) => d.id === uid)?.data() as
    | Player
    | undefined)?.name
  // Changing only the character keeps the name, and re-claiming it would be
  // needless work; a change of case or spacing is the same claim too.
  const renamed = !previous || nameKey(previous) !== nameKey(trimmed)

  // Claim first, release last, so the name is never briefly unclaimed — and
  // so losing the race leaves the identity exactly as it was.
  if (renamed) await claimName(pin, uid, trimmed)
  try {
    await updateDoc(playerRef(pin, uid), { name: trimmed, character })
  } catch (e) {
    if (renamed) await releaseName(pin, trimmed)
    throw e
  }
  if (renamed) await releaseName(pin, previous)
}

/**
 * Update which badge this player shows in *this* room, right now.
 *
 * The account-level default (`profile.displayedBadge`) is saved separately —
 * see `saveProfile` — and copied onto future rooms at create/join time. This
 * is the other half: refreshing the room you're already sitting in, so
 * picking a new badge from an in-game announcement shows up immediately
 * instead of waiting for the next room.
 */
export async function setPlayerBadge(
  pin: string,
  uid: string,
  badge: PlayerBadge | null,
): Promise<void> {
  requireDb()
  await updateDoc(playerRef(pin, uid), { displayedBadge: badge })
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
  /** True when the room is already at `MAX_PLAYERS`, so there is no seat. */
  full: boolean
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

  // The whole player list rather than just our own document: it answers
  // "am I in already?" and "is there room?" in one round trip.
  const players = await getDocs(playersRef(pin))
  if (players.docs.some((d) => d.id === uid)) {
    rememberGame(pin)
    return { alreadyJoined: true, inProgress: false, full: false }
  }

  // A running game no longer turns latecomers away. At a party someone always
  // arrives halfway through, and being told to wait outside until the whole
  // room finishes is worse than watching a round. They sit this one out and
  // are dealt into the next, which the room returns to a lobby for anyway.
  return {
    alreadyJoined: false,
    inProgress: (snap.data() as Game).status !== 'lobby',
    full: players.size >= MAX_PLAYERS,
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
  /** Copied from the account's saved default, so it shows from the start. */
  badge?: PlayerBadge | null,
): Promise<void> {
  requireDb()
  const uid = await ensureSignedIn()

  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) throw new GameError('game-not-found')

  const players = await getDocs(playersRef(pin))
  if (!players.docs.some((d) => d.id === uid) && players.size >= MAX_PLAYERS) {
    throw new GameError('game-full')
  }

  // Reject a nickname already taken by someone else. The claim below is what
  // actually settles a tie; this catches the ordinary case first, so a name
  // that was never in contention fails without a write — and it still covers
  // rooms created before claims existed, which have none.
  const clash = players.docs.some(
    (d) =>
      d.id !== uid &&
      (d.data() as Player).name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
  )
  if (clash) throw new GameError('name-taken')

  await claimName(pin, uid, name)

  const player = {
    id: uid,
    name: name.trim(),
    character,
    isHost: false,
    score: 0,
    lastSeen: serverTimestamp(),
    ...(badge ? { displayedBadge: badge } : {}),
  }
  try {
    await setDoc(playerRef(pin, uid), player)
  } catch (e) {
    // Don't sit on a name we never took a seat with.
    await releaseName(pin, name)
    throw e
  }
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
  // Read while they still exist: their name has to be handed back, and in a
  // moment there will be nothing left to read it from.
  const gone = await getDoc(playerRef(pin, playerId)).catch(() => null)
  // Same rule as leaving: removing the imposter ends the game. The host may
  // read anyone's secret, so this works from here.
  if (await isImposter(pin, playerId)) {
    await endBecauseImposterLeft(pin, playerId).catch((e) =>
      console.error('ending on imposter kick failed', e),
    )
  }
  await deleteDoc(playerRef(pin, playerId))
  if (gone?.exists()) await releaseName(pin, (gone.data() as Player).name)
  await removeFromRound(pin, playerId).catch((e) => {
    console.error('round cleanup on kick failed', e)
  })
}

/**
 * What a departing host decided about the custom set their room is playing
 * with: lend it to whoever takes over, or keep it to themselves.
 */
export type WordSetHandover = 'keep' | 'revoke'

/**
 * Settle what happens to a leaving host's own word set.
 *
 * Called while they are still the host, because that is the only moment they
 * may write anything on the game document other than `round`.
 *
 * Nothing is done for the built-in bank, and nothing for a host who is only
 * borrowing someone else's set — it was never theirs to lend or take back.
 */
async function handOverWordSet(
  pin: string,
  decision: WordSetHandover,
): Promise<void> {
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game
  if (!game.wordSetId) return

  if (decision === 'keep') {
    await updateDoc(gameRef(pin), {
      sharedWordSetId: game.wordSetId,
      wordSetRevertAfterGame: false,
    })
    return
  }

  if (game.status === 'lobby') {
    await updateDoc(gameRef(pin), { wordSetId: null, sharedWordSetId: null })
    return
  }

  // Mid-game the words are already dealt and half of them said out loud, so
  // pulling the set now would spoil the round without hiding anything. It goes
  // back to the bank when the room next returns to the lobby.
  await updateDoc(gameRef(pin), {
    wordSetRevertAfterGame: true,
    sharedWordSetId: null,
  })
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
  /** Only meaningful for a host leaving a room set to one of their own sets. */
  wordSet?: WordSetHandover,
): Promise<void> {
  requireDb()

  // Read before any of the leaving happens: the nickname has to go back to
  // the room, and the only record of it is about to be deleted.
  const mine = await getDoc(playerRef(pin, uid)).catch(() => null)
  const myName = mine?.exists() ? (mine.data() as Player).name : undefined

  // First, while the game document is still ours to write.
  if (wordSet) {
    await handOverWordSet(pin, wordSet).catch((e) =>
      console.error('word set handover failed', e),
    )
  }

  // Before anything else: if the imposter is the one walking, the game is
  // over — there is nobody left to catch. Done here, while we are still a
  // player, because that is the only moment we may both read our own card and
  // write the round.
  if (await isImposter(pin, uid)) {
    await endBecauseImposterLeft(pin, uid).catch((e) =>
      console.error('ending on imposter leave failed', e),
    )
  }

  // Cleanup FIRST, while we still have the right to do it: the rules only let
  // a current player (or the host) touch the round, so deleting ourselves and
  // then tidying up meant the tidy-up was silently denied.
  //
  // But never let that stop the leaving. When this threw, the delete below
  // never ran and the player didn't leave at all — they came back as though
  // nothing had happened. Leaving must always succeed; the round being tidy is
  // a bonus, and `endIfTooFewAlive` repairs it from the player list anyway.
  await removeFromRound(pin, uid).catch((e) => {
    console.error('round cleanup on leave failed; leaving anyway', e)
  })

  await deleteDoc(playerRef(pin, uid))
  await releaseName(pin, myName)
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
  requireDb()
  for (const sub of ['players', 'secrets', 'votes', 'clues', 'names']) {
    // One awkward sub-collection must not strand the room.
    //
    // These ran unguarded, so a single refusal threw before the game document
    // itself was deleted — leaving a room that every player was still sitting
    // in, and a Close button that appeared to do nothing. Leftovers under a
    // deleted game are invisible; a game nobody can close is not.
    try {
      await clearCollection(pin, sub)
    } catch (e) {
      console.error(`clearing ${sub} while closing the room failed`, e)
    }
  }
  await deleteDoc(gameRef(pin))
  forgetGame()
}

/**
 * Hand leadership to another player (host migration).
 *
 * One write, to the one field that decides anything. `games.hostId` is the
 * host; every screen works that out for itself. This used to also stamp an
 * `isHost` flag onto every player document in the same batch, which was a
 * copy of the same fact in as many places as there were players — and any of
 * them could end up disagreeing with it.
 */
export async function promoteHost(
  pin: string,
  newHostId: string,
): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { hostId: newHostId })
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
 * End the game because the imposter has gone — crew win, at any player count.
 *
 * Called by whoever is leaving, *before* they remove themselves, and by the
 * host when kicking. That timing is the point: a player may read their own
 * secret and may write the round, so at that moment they can both know they
 * are the imposter and act on it. A second later, with their player document
 * gone, they could do neither.
 *
 * This replaces trying to work it out from the outside. The watchers on other
 * devices call `findImposter`, which reads *everyone's* secrets — something
 * only the host is allowed to do, so on every other device it threw and the
 * whole check quietly died. The person leaving never had that problem: they
 * only ever needed to look at their own card.
 */
export async function endBecauseImposterLeft(
  pin: string,
  imposterId: string,
): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game
  const round = game.round
  if (game.status !== 'playing' || !round) return
  if (round.phase === 'recap' || round.phase === 'result') return
  await finalizeGame(pin, 'crew-wins', false, imposterId, true)
}

/** True when this player holds the imposter's card. Reads only their own. */
async function isImposter(pin: string, uid: string): Promise<boolean> {
  const snap = await getDoc(secretRef(pin, uid)).catch(() => null)
  return Boolean(snap?.exists() && (snap.data() as Secret).role === 'imposter')
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
  //
  // Both need to know who holds the card, so both are the host's to decide in
  // practice — nobody else may read the secrets. Rather than guess from a
  // refusal, a device that cannot see simply stops here; if the host has gone
  // quiet, presence migration hands the job to someone who can.
  const dealt = game.seatOrder ?? round.turnOrder
  const everyoneDealtIsStillHere = dealt.every((id) => present.has(id))

  // Nobody has left, so the imposter certainly hasn't — worth knowing, because
  // it skips a read per player on the common path. This runs on every change
  // to a table someone has already walked out of.
  if (!everyoneDealtIsStillHere) {
    const search = await findImposter(pin, trulyAlive)
    if (!search.complete) return
    if (!search.id) {
      // Say who it *was*. Scoring needs a real imposter id, and the usual
      // source — the player just eliminated — is empty here, because nobody
      // was eliminated: they walked. The seating still lists them, since it
      // records who the game was dealt to.
      const departed = await findImposter(pin, dealt)
      await finalizeGame(pin, 'crew-wins', false, departed.id ?? undefined, true)
      return
    }
  }

  if (trulyAlive.length <= 2) {
    // Same reasoning: finalising an imposter win has to name the imposter, and
    // only a device that can read the cards can do that honestly.
    const search = await findImposter(pin, trulyAlive)
    if (!search.complete || !search.id) return
    await finalizeGame(pin, 'imposter-wins', false, search.id)
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
  if (playerIds.length < MIN_PLAYERS) throw new GameError('not-enough-players')

  // A custom set replaces the built-in bank for this game. If it has since been
  // deleted or emptied, fall back to the bank rather than failing to deal.
  let setEntries: WordSetEntry[] | undefined
  // Recorded on the game so every player can see which set they're playing
  // from. Only the host can read their own sets, so this is the one chance to
  // capture the name; null when the built-in bank is used.
  let wordSetName: string | null = null
  // The room points at a set that has since been deleted, or emptied below the
  // minimum. Falling back to the bank is right, but leaving `wordSetId` behind
  // was not: the lobby went on showing that set as the chosen one while every
  // game dealt random words, and nothing ever said otherwise.
  let wordSetGone = false
  if (game.wordSetId) {
    const set = await getWordSet(game.wordSetId).catch(() => null)
    const usable = set ? cleanEntries(set.entries) : []
    if (usable.length >= MIN_SET_ENTRIES) {
      setEntries = usable
      wordSetName = set?.name ?? null
    } else {
      wordSetGone = true
    }
  }

  const assignment = buildAssignment(playerIds, {
    language: game.language,
    difficulty: game.difficulty,
    seatOrder: game.seatOrder,
    prevGameNumber: game.gameNumber,
    setEntries,
    usedWords: game.usedWords,
    imposterAware: game.imposterAware,
  })

  // Every word has been played. Rather than deal one the table already knows
  // the answer to, the evening ends here — on the podium, which is a better
  // last screen than a repeat anyway.
  if (!assignment) {
    await updateDoc(gameRef(pin), { status: 'finished', round: null })
    return
  }

  await clearVotes(pin)
  await clearClues(pin)
  const batch = writeBatch(db)
  for (const id of playerIds) {
    batch.set(secretRef(pin, id), assignment.secrets[id])
  }
  // Throw away cards belonging to people who are no longer at the table.
  //
  // Only `closeGame` ever cleared these, so a room that ran all evening kept a
  // role and a word for everyone who had ever sat in it. Harmless in itself,
  // but it is one more thing `findImposter` can trip over, and it grows
  // without bound in exactly the long-lived rooms it matters least to.
  const previousSecrets = await getDocs(secretsRef(pin)).catch(() => null)
  previousSecrets?.docs.forEach((d) => {
    if (!playerIds.includes(d.id)) batch.delete(d.ref)
  })
  // Who was at the table when the cards went out, by name.
  //
  // Player documents are the only record of a name, and they are deleted the
  // moment someone leaves — so the recap of a game the imposter walked out of
  // had nobody to name and silently dropped the whole "the imposter was…"
  // line. This survives them. Nothing secret is in it: the same names are
  // readable from the player list by anyone in the room.
  const seatNames: Record<string, { name: string; character: string }> = {}
  for (const d of playersSnap.docs) {
    const p = d.data() as Player
    seatNames[d.id] = { name: p.name, character: p.character }
  }

  batch.update(gameRef(pin), {
    status: 'playing',
    seatOrder: assignment.seatOrder,
    seatNames,
    gameNumber: assignment.gameNumber,
    usedWords: [...(game.usedWords ?? []), assignment.mainWord],
    wordSetName,
    ...(wordSetGone
      ? {
          wordSetId: null,
          ...(game.sharedWordSetId === game.wordSetId
            ? { sharedWordSetId: null }
            : {}),
        }
      : {}),
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
  await clearCollection(pin, 'votes')
}

async function clearClues(pin: string): Promise<void> {
  await clearCollection(pin, 'clues')
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

  // Only the player whose turn it is may submit — which is the first player
  // still in who hasn't spoken yet, *not* the one at position "clues so far".
  //
  // Counting broke as soon as anyone left after speaking: their clue stays in
  // the round (nobody but the host may delete one) while they drop out of the
  // order, so the count ran one ahead of the seat and skipped whoever came
  // next. Two such leavers and the round could read as finished with two
  // players never asked to speak at all.
  const order = round.turnOrder.filter((id) => round.aliveIds.includes(id))
  const spoken = new Set(thisRound.map((c) => c.playerId))
  const expected = order.find((id) => !spoken.has(id))
  if (expected !== playerId) throw new GameError('not-your-turn')

  const clue: Clue = {
    playerId,
    word: trimmed,
    round: round.number,
    index: thisRound.length,
  }
  await setDoc(clueRef(pin, round.number, playerId), clue)
}

/** What a search of the secrets found — and whether it could see at all. */
interface ImposterSearch {
  id: string | null
  /**
   * False when a card couldn't be read, so `id: null` means "don't know"
   * rather than "not among them".
   */
  complete: boolean
}

/**
 * Find which of the given players is the imposter (read at game end only).
 *
 * **Says when it couldn't look.** Reading another player's secret is a
 * host-only right, so on every other device most of these reads are refused.
 * Returning a bare `null` made "refused" indistinguishable from "not the
 * imposter" — and the one caller that matters, `endIfTooFewAlive`, reads that
 * as *the imposter has left* and hands the game to the crew. On a crew
 * member's phone that would have ended a perfectly live game.
 *
 * Finding the card is conclusive whatever else was refused, which is why a hit
 * always reports complete. That also means the imposter's own device always
 * knows the imposter is still in the room.
 */
async function findImposter(
  pin: string,
  ids: string[],
): Promise<ImposterSearch> {
  let complete = true
  for (const id of ids) {
    const snap = await getDoc(secretRef(pin, id)).catch(() => null)
    if (!snap) {
      complete = false
      continue
    }
    if (snap.exists() && (snap.data() as Secret).role === 'imposter') {
      return { id, complete: true }
    }
  }
  return { id: null, complete }
}

/** Open voting (host, from the clue phase). */
export async function openVoting(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  const loaded = await loadRound(pin)
  if (!loaded) return
  await updateDoc(gameRef(pin), {
    'round.phase': 'voting',
    'round.votingRound': 'first',
    'round.candidates': loaded.round.aliveIds,
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
  const loaded = await loadRound(pin)
  if (!loaded) return
  const { round } = loaded
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
  // For the "Clean Sweep" badge. Stamped here rather than derived later from
  // `voteHistory`, because by game end that array has every round's votes
  // piled together — a later round (or a tie's own revote) can no longer be
  // told apart from this one, but `votes` right now is exactly this tally.
  const unanimous = votes.length > 0 && votes.every((v) => v.target === eliminatedId)
  await updateDoc(gameRef(pin), {
    'round.phase': 'reveal',
    'round.eliminatedId': eliminatedId,
    'round.eliminatedRole': role,
    'round.eliminationUnanimous': unanimous,
  })
}

/** Continue after the elimination reveal (host): guess, next round, or game over. */
export async function continueAfterReveal(pin: string): Promise<void> {
  requireDb()
  const loaded = await loadRound(pin)
  if (!loaded) return
  const { game, round } = loaded
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
    // Imposter has reached the final two → they've won. They still get to name
    // the word: winning is no reason to be denied the best part of the round,
    // and a correct guess is worth points on top.
    if (game.guess !== 'off') {
      await updateDoc(gameRef(pin), {
        'round.phase': 'guess',
        'round.aliveIds': newAlive,
        'round.imposterWon': true,
        'round.eliminatedId': null,
        'round.eliminatedRole': null,
        'round.guessText': null,
        'round.guessCorrect': null,
      })
    } else {
      await updateDoc(gameRef(pin), { 'round.aliveIds': newAlive })
      await finalizeGame(pin, 'imposter-wins', false)
    }
  } else {
    await updateDoc(gameRef(pin), {
      'round.phase': 'clues',
      'round.number': round.number + 1,
      'round.aliveIds': newAlive,
      'round.eliminatedId': null,
      'round.eliminatedRole': null,
      'round.eliminationUnanimous': null,
      'round.votingRound': null,
      'round.candidates': null,
    })
  }
}

/** The imposter submits their guess at the main word. */
export async function castGuess(pin: string, text: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { 'round.guessText': text })
}

/**
 * Who won, once the guess is out of the way.
 *
 * The guess phase is reached two ways now — caught, or having reached the
 * final two — and only the round knows which. Reading it wrong would hand the
 * game to the wrong side after a correct guess.
 */
function outcomeAfterGuess(round: Round): Outcome {
  return round.imposterWon ? 'imposter-wins' : 'crew-wins'
}

/**
 * The crew's word, read off any crew member's card (host only).
 *
 * Picking "the first seat that isn't the eliminated player" worked while the
 * only way here was being caught. A winning imposter is nobody's elimination,
 * so that could land on the imposter's own card — comparing the guess against
 * the word they were already holding.
 */
async function readMainWord(pin: string, ids: string[]): Promise<string> {
  for (const id of ids) {
    const snap = await getDoc(secretRef(pin, id)).catch(() => null)
    if (!snap?.exists()) continue
    const secret = snap.data() as Secret
    if (secret.role === 'crew') return secret.word
  }
  return ''
}

/** Host override: move on without waiting for the guess (counts as wrong). */
export async function skipGuess(pin: string): Promise<void> {
  requireDb()
  const loaded = await loadRound(pin)
  if (!loaded) return
  await finalizeGame(pin, outcomeAfterGuess(loaded.round), false)
}

/**
 * Resolve the imposter's guess (host). An exact match or a small typo is
 * accepted automatically; anything else (including a fair synonym) is shown
 * to the host to judge, rather than auto-rejected.
 */
export async function resolveGuess(pin: string): Promise<void> {
  requireDb()
  const loaded = await loadRound(pin)
  if (!loaded) return
  const { game, round } = loaded
  const mainWord = await readMainWord(pin, game.seatOrder ?? round.turnOrder)

  if (isCloseMatch(round.guessText ?? '', mainWord)) {
    await finalizeGame(pin, outcomeAfterGuess(round), true)
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
  const loaded = await loadRound(pin)
  if (!loaded) return
  await finalizeGame(pin, outcomeAfterGuess(loaded.round), correct)
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
  /**
   * The game is ending because the imposter walked out, so they earn nothing
   * for it. Kept separate from the override above: that one only says "the id
   * came from somewhere other than the elimination", which is also true of an
   * imposter who legitimately reached the final two after other people left —
   * and reading the two as the same thing quietly refused that player every
   * point they had actually earned.
   */
  imposterLeft = false,
): Promise<void> {
  requireDb()
  const loaded = await loadRound(pin)
  if (!loaded) return
  const { game, round } = loaded
  // Score the people who actually played this game, which is the round's own
  // turn order — not the seating.
  //
  // `seatOrder` is written when the game is dealt and never shrinks, so it
  // still lists anyone who has since left. Scoring from it paid crew points to
  // someone who walked out and came back as a spectator: they were never in
  // this round, but the seating still remembered them. `turnOrder` is trimmed
  // when a player leaves and never includes a mid-game joiner, so it is the
  // honest list of who was dealt in and is still here. Eliminated players stay
  // in it, which is right — being voted out is not the same as leaving.
  const playerIds =
    round.turnOrder.length > 0
      ? round.turnOrder
      : (game.seatOrder ?? round.aliveIds)
  // An empty id is survivable — `computeScores` scores no imposter rather than
  // crashing on one it can't find — but it costs the recap its reveal, so it
  // is a last resort rather than a normal outcome.
  const imposterId =
    imposterIdOverride ??
    (outcome === 'crew-wins'
      ? (round.eliminatedId ?? '')
      : ((await findImposter(pin, round.aliveIds)).id ?? ''))
  // Reading someone else's secret is a host-only right, and this no longer
  // runs only on the host: an imposter walking out ends the game from their
  // own device. Losing the word for the reveal is a poor trade against the
  // game never ending at all, so a refusal here costs the reveal, not the
  // ending. The round keeps whatever it already had.
  const mainWord =
    (await readMainWord(pin, playerIds)) || (round.mainWord ?? '')

  // Rounds the imposter got through without being voted out — the whole of
  // their score now. Caught in round 1 is none; reaching the final two in
  // round 3 is all three. An imposter who *walked out* gets nothing: the
  // override is only ever passed for that case, and leaving is not surviving.
  const roundsSurvived = imposterLeft
    ? 0
    : outcome === 'crew-wins'
      ? Math.max(0, round.number - 1)
      : round.number

  // Crew voted out along the way, for the Survivors preset. Everyone dealt in,
  // less everyone still standing, less the imposter themselves when they were
  // the one just caught. Clamped, and zero for an imposter who walked out.
  const crewEliminated = imposterLeft
    ? 0
    : Math.max(
        0,
        playerIds.length -
          round.aliveIds.length -
          (outcome === 'crew-wins' ? 1 : 0),
      )

  const scoreLines = computeScores({
    preset: game.scoring,
    playerIds,
    imposterId,
    outcome,
    aliveIds: round.aliveIds,
    guessRule: game.guess,
    guessCorrect,
    voteHistory: round.voteHistory ?? [],
    roundsSurvived,
    crewEliminated,
  })

  // Only the round is written here — not everyone's scores.
  //
  // Writing other players' documents is a host-only right, which made ending
  // a game a host-only act. That was the deeper reason endings kept not
  // happening: if the host had left, or their phone was asleep, nobody could
  // finish the game. Now any player can end it, and each device applies its
  // own points from `scoreBreakdown` (see `applyMyScore`).
  await updateDoc(gameRef(pin), {
    'round.phase': 'recap',
    'round.outcome': outcome,
    'round.imposterId': imposterId,
    'round.mainWord': mainWord,
    'round.guessCorrect': guessCorrect,
    'round.imposterRounds': roundsSurvived,
    'round.scoreBreakdown': scoreLines,
  })
}

/**
 * Add this game's points to your own running total — **your own only**.
 *
 * The counterpart to finalising writing just the round: everyone applies their
 * own line from `scoreBreakdown`, which each player is allowed to do, instead
 * of the host writing everybody's. `scoredGame` makes it idempotent, since
 * every device sees the finished round repeatedly and a reload must not pay
 * out twice.
 */
export async function applyMyScore(
  pin: string,
  uid: string,
  gameNumber: number,
  delta: number,
  /** Whether this player's side won, counted for the podium's tie-break. */
  won = false,
): Promise<void> {
  requireDb()
  const key = `${pin}:${gameNumber}`
  const ref = playerRef(pin, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  if ((snap.data() as Player).scoredGame === key) return
  await updateDoc(ref, {
    scoredGame: key,
    ...(delta ? { score: increment(delta) } : {}),
    ...(won ? { wins: increment(1) } : {}),
  })
}

/**
 * Abandon the running game without scoring it (host).
 *
 * For the round that stops being a game — someone has to leave, the words were
 * a bad draw, the table has lost interest. It returns to the lobby with no
 * points awarded and nothing recorded against anyone's stats, because no game
 * really happened. The words that were dealt still count as used: they were
 * seen, and dealing them again would be a repeat.
 */
export async function skipGame(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  await clearClues(pin)
  await updateDoc(gameRef(pin), { status: 'lobby', round: null })
}

/**
 * End the evening (host): the room stops on its podium.
 *
 * Deliberately not the same as closing the room, which deletes everything and
 * throws everyone out. Here the scores stay up so people can look at them.
 */
export async function finishRoom(pin: string): Promise<void> {
  requireDb()
  await clearVotes(pin)
  await clearClues(pin)
  await updateDoc(gameRef(pin), { status: 'finished', round: null })
}

/** Reopen a finished room for more games (host). */
export async function reopenRoom(pin: string): Promise<void> {
  requireDb()
  await updateDoc(gameRef(pin), { status: 'lobby', round: null })
}

/** Return the room to the lobby for another game (host). */
export async function backToLobby(pin: string): Promise<void> {
  requireDb()
  const snap = await getDoc(gameRef(pin))
  if (!snap.exists()) return
  const game = snap.data() as Game
  await clearVotes(pin)
  await clearClues(pin)
  await updateDoc(gameRef(pin), {
    status: 'lobby',
    round: null,
    // A host who left mid-game without lending their set only lent it for the
    // game that was already running. That game is over, so it goes back now.
    ...(game?.wordSetRevertAfterGame
      ? { wordSetId: null, wordSetRevertAfterGame: false, wordSetName: null }
      : {}),
  })
}

/**
 * Exercises firestore.rules against the operations the app actually performs,
 * plus the attacks the rules are meant to stop.
 *
 * Run with the emulator: npm run test:rules
 */
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

const HOST = 'host_uid'
const P2 = 'player2_uid'
const P3 = 'player3_uid'
const OUTSIDER = 'outsider_uid'
const PIN = '123456'

let passed = 0
let failed = 0
const failures = []

async function check(name, promise) {
  try {
    await promise
    passed++
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed++
    failures.push(name)
    console.log(`  FAIL  ${name} — ${e.message.split('\n')[0]}`)
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: 'imposter-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
})

/** Seed a game with the rules bypassed, so tests start from a known state. */
async function seed({ hostLastSeen = 'fresh' } = {}) {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'games', PIN), {
      pin: PIN,
      hostId: HOST,
      status: 'playing',
      language: 'en',
      mode: 'half',
      difficulty: 'medium',
      scoring: 'teamRace',
      guess: 'final',
      seatOrder: [HOST, P2, P3],
      round: {
        number: 1,
        phase: 'clues',
        turnOrder: [HOST, P2, P3],
        aliveIds: [HOST, P2, P3],
        voteHistory: [],
      },
    })
    // "Stale" now only drives the disconnected tag — it is deliberately not
    // enough to lose the room, which is what the migration tests check.
    const seen =
      hostLastSeen === 'fresh'
        ? Timestamp.now()
        : Timestamp.fromMillis(Date.now() - 300000)
    await setDoc(doc(db, 'games', PIN, 'players', HOST), {
      id: HOST, name: 'Host', character: '🦊', isHost: true, score: 0, lastSeen: seen,
    })
    for (const uid of [P2, P3]) {
      await setDoc(doc(db, 'games', PIN, 'players', uid), {
        id: uid, name: uid, character: '🐼', isHost: false, score: 0,
        lastSeen: Timestamp.now(),
      })
      await setDoc(doc(db, 'games', PIN, 'secrets', uid), {
        role: 'crew', word: 'Pizza',
      })
    }
    await setDoc(doc(db, 'games', PIN, 'secrets', HOST), {
      role: 'imposter', word: 'Sushi',
    })
  })
}

const as = (uid) => testEnv.authenticatedContext(uid).firestore()
const g = (db, ...p) => doc(db, 'games', PIN, ...p)

console.log('\n--- Things the app must be able to do ---')
await seed()
await check('host updates round phase',
  assertSucceeds(updateDoc(g(as(HOST)), { 'round.phase': 'voting' })))
await check('host writes another player\'s secret (dealing)',
  assertSucceeds(setDoc(g(as(HOST), 'secrets', P2), { role: 'crew', word: 'X' })))
await check('host reads a secret (resolving elimination)',
  assertSucceeds(getDoc(g(as(HOST), 'secrets', P2))))
await check('host updates another player\'s score',
  assertSucceeds(updateDoc(g(as(HOST), 'players', P2), { score: 5 })))
await check('host kicks a player',
  assertSucceeds(deleteDoc(g(as(HOST), 'players', P3))))

await seed()
await check('player reads own secret',
  assertSucceeds(getDoc(g(as(P2), 'secrets', P2))))
await check('player casts own vote',
  assertSucceeds(setDoc(g(as(P2), 'votes', P2), { voter: P2, target: P3 })))
await check('player submits own clue',
  assertSucceeds(setDoc(g(as(P2), 'clues', 'c1'), { playerId: P2, word: 'hi', round: 1, index: 0 })))
await check('player updates own presence',
  assertSucceeds(updateDoc(g(as(P2), 'players', P2), { lastSeen: serverTimestamp() })))
await check('player leaves (deletes own doc)',
  assertSucceeds(deleteDoc(g(as(P2), 'players', P2))))

await seed()
await check('caught imposter submits a guess (round write by non-host)',
  assertSucceeds(updateDoc(g(as(P2)), { 'round.guessText': 'Pizza' })))
await check('leaving player strips self from round',
  assertSucceeds(updateDoc(g(as(P2)), { 'round.aliveIds': [HOST, P3] })))
await check('anyone signed in creates a game',
  assertSucceeds(setDoc(doc(as(OUTSIDER), 'games', '999999'), { pin: '999999', hostId: OUTSIDER, status: 'lobby' })))

console.log('\n--- Host migration ---')
// Being quiet must never cost the host the room, however long for.
await seed({ hostLastSeen: 'fresh' })
await check('player CANNOT take over while the host is active',
  assertFails(updateDoc(g(as(P2)), { hostId: P2 })))
await seed({ hostLastSeen: 'stale' })
await check('player CANNOT take over from a host who is merely quiet',
  assertFails(updateDoc(g(as(P2)), { hostId: P2 })))
// Leaving the room is the one thing that hands it on.
await seed()
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await deleteDoc(doc(ctx.firestore(), 'games', PIN, 'players', HOST))
})
await check('player takes over once the host has left the room',
  assertSucceeds(updateDoc(g(as(P2)), { hostId: P2 })))

console.log('\n--- Things the rules must prevent ---')
await seed()
await check('player cannot read another player\'s secret',
  assertFails(getDoc(g(as(P2), 'secrets', P3))))
await check('player cannot write another player\'s secret',
  assertFails(setDoc(g(as(P2), 'secrets', P3), { role: 'crew', word: 'x' })))
await check('player cannot cast a vote as someone else',
  assertFails(setDoc(g(as(P2), 'votes', P3), { voter: P3, target: HOST })))
await check('player cannot submit a clue as someone else',
  assertFails(setDoc(g(as(P2), 'clues', 'c9'), { playerId: P3, word: 'x', round: 1, index: 0 })))
await check('player cannot change game settings',
  assertFails(updateDoc(g(as(P2)), { difficulty: 'easy' })))
await check('player cannot change game status',
  assertFails(updateDoc(g(as(P2)), { status: 'lobby' })))
await check('player cannot delete the game',
  assertFails(deleteDoc(g(as(P2)))))
await check('non-player cannot join by writing a player doc for someone else',
  assertFails(setDoc(g(as(OUTSIDER), 'players', P2), { id: P2, name: 'x' })))
await check('unauthenticated cannot read a game',
  assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'games', PIN))))

console.log('\n--- Host migration at a full table ---')
// Rules may only look up so many documents per request, and the promotion
// batch used to write every player's `isHost` flag beside the game document.
// At a big table that is a lot of lookups for one commit.
for (const size of [3, 6, 9, 12]) {
  await seed()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await deleteDoc(doc(ctx.firestore(), 'games', PIN, 'players', HOST))
  })
  const extras = []
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    for (let i = 0; i < size - 3; i++) {
      const id = 'extra' + i
      extras.push(id)
      await setDoc(doc(db, 'games', PIN, 'players', id), {
        id, name: id, character: '🐨', isHost: false, score: 0, lastSeen: Timestamp.now(),
      })
    }
  })
  const everyone = [P2, P3, ...extras]

  // One client instance: a batch and its refs must come from the same one.
  const mine = as(P2)
  const wide = writeBatch(mine)
  everyone.forEach((id) => wide.update(g(mine, 'players', id), { isHost: id === P2 }))
  wide.update(g(mine), { hostId: P2 })
  await check(size + ' players — promotion that writes every isHost flag',
    assertSucceeds(wide.commit()))

  await seed()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await deleteDoc(doc(ctx.firestore(), 'games', PIN, 'players', HOST))
  })
  await check(size + ' players — promotion that writes only hostId',
    assertSucceeds(updateDoc(g(as(P2)), { hostId: P2 })))
}

console.log('\n--- Nickname claims ---')
// The whole point of the claims collection: "is this name free?" has to be one
// atomic step, or two people typing the same name both read an empty room.
await seed()
await check('player claims a free nickname',
  assertSucceeds(setDoc(g(as(P2), 'names', 'n_ben'), { uid: P2, name: 'Ben', claimedAt: serverTimestamp() })))
await check('someone else CANNOT take a claimed nickname',
  assertFails(setDoc(g(as(P3), 'names', 'n_ben'), { uid: P3, name: 'Ben', claimedAt: serverTimestamp() })))
await check('holder renews their own claim (renaming back, changing character)',
  assertSucceeds(setDoc(g(as(P2), 'names', 'n_ben'), { uid: P2, name: 'BEN', claimedAt: serverTimestamp() })))
await check('claim cannot be back-dated or post-dated',
  assertFails(setDoc(g(as(P3), 'names', 'n_dan'), { uid: P3, name: 'Dan', claimedAt: Timestamp.fromMillis(Date.now() + 86400000) })))
await check('holder releases their own claim',
  assertSucceeds(deleteDoc(g(as(P2), 'names', 'n_ben'))))

// A claim can outlive its owner when their cleanup never lands. It has to
// come free eventually, or one closed tab locks a name away for the night.
await seed()
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  // Nobody by this uid is in the room any more.
  await setDoc(doc(db, 'games', PIN, 'names', 'n_ghost'), {
    uid: 'ghost_uid', name: 'Ghost', claimedAt: Timestamp.fromMillis(Date.now() - 120000),
  })
  // Fresh: this is what an honest claimant looks like in the moment between
  // taking a name and creating their player document.
  await setDoc(doc(db, 'games', PIN, 'names', 'n_joining'), {
    uid: 'joining_uid', name: 'Joining', claimedAt: Timestamp.now(),
  })
  // Held by someone who is very much still here, but claimed long ago.
  await setDoc(doc(db, 'games', PIN, 'names', 'n_player3_uid'), {
    uid: P3, name: P3, claimedAt: Timestamp.fromMillis(Date.now() - 120000),
  })
})
await check('an abandoned claim can be taken over',
  assertSucceeds(setDoc(g(as(P2), 'names', 'n_ghost'), { uid: P2, name: 'Ghost', claimedAt: serverTimestamp() })))
await check('a claim mid-join is NOT stealable (the grace period)',
  assertFails(setDoc(g(as(P2), 'names', 'n_joining'), { uid: P2, name: 'Joining', claimedAt: serverTimestamp() })))
await check('an old claim whose holder is still here is NOT stealable',
  assertFails(setDoc(g(as(P2), 'names', 'n_player3_uid'), { uid: P2, name: P3, claimedAt: serverTimestamp() })))
await check('player cannot delete someone else\'s claim',
  assertFails(deleteDoc(g(as(P2), 'names', 'n_player3_uid'))))
await check('host clears up any claim (kicking, closing the room)',
  assertSucceeds(deleteDoc(g(as(HOST), 'names', 'n_player3_uid'))))

console.log('\n--- Profiles & word sets ---')
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', HOST), { nickname: 'Host' })
  await setDoc(doc(ctx.firestore(), 'wordSets', 's1'), {
    ownerId: HOST, name: 'Mine', entries: [{ main: 'a' }, { main: 'b' }],
  })
})
await check('owner reads own profile',
  assertSucceeds(getDoc(doc(as(HOST), 'users', HOST))))
await check('other user cannot read your profile',
  assertFails(getDoc(doc(as(P2), 'users', HOST))))
await check('other user cannot write your profile',
  assertFails(setDoc(doc(as(P2), 'users', HOST), { nickname: 'hacked' })))
await check('signed-in user can read a word set (needed to deal)',
  assertSucceeds(getDoc(doc(as(P2), 'wordSets', 's1'))))
await check('non-owner cannot edit a word set',
  assertFails(updateDoc(doc(as(P2), 'wordSets', 's1'), { name: 'hacked' })))
await check('non-owner cannot delete a word set',
  assertFails(deleteDoc(doc(as(P2), 'wordSets', 's1'))))
await check('owner edits own word set',
  assertSucceeds(updateDoc(doc(as(HOST), 'wordSets', 's1'), { name: 'Renamed' })))

await testEnv.cleanup()

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) {
  console.log('Failing:', failures.join('; '))
  process.exit(1)
}

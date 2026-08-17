/**
 * A finished game must pay its points exactly once.
 *
 * Run with the emulator: npm run test:payment
 *
 * This has its own test because the bug it guards is invisible in ordinary
 * testing. A game worth 6 kept arriving on the scoreboard as 12, and no amount
 * of clicking through the app in one tab would show it: the SDK serialises
 * writes to a document and the local cache reveals the pending one, so a
 * single client cannot lose the race with itself.
 *
 * Two *independent* clients can — one account open on a phone and a tablet,
 * which is how this family plays. Separate caches, neither seeing the other's
 * pending write, both finding no "already paid" mark, both paying out.
 *
 * So the test keeps both shapes: the old read-then-write, which must still be
 * shown to double, and the transaction that replaced it. If someone ever
 * simplifies `applyMyScore` back into a read followed by a write, the first
 * case stops failing in the way it is supposed to and this file says so.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore'

const PIN = '123456'
const UID = 'player_uid'
let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `   (${detail})` : ''}`)
  if (ok) pass++
  else fail++
}

const env = await initializeTestEnvironment({
  projectId: 'imposter-payment-test',
  firestore: { rules: 'rules_version="2";service cloud.firestore{match /databases/{d}/documents{match /{p=**}{allow read,write:if true;}}}', host: '127.0.0.1', port: 8080 },
})

// Two clients that share nothing but the server.
const clientA = env.authenticatedContext(UID).firestore()
const clientB = env.authenticatedContext(UID + '_other_device').firestore()
const refFor = (db) => doc(db, 'games', PIN, 'players', UID)

async function reset() {
  await env.clearFirestore()
  await setDoc(refFor(clientA), { id: UID, score: 0, wins: 0 })
  // Let both clients see the fresh document before the race starts.
  await Promise.all([getDoc(refFor(clientA)), getDoc(refFor(clientB))])
}

/** What the code used to do: read, check the mark, then write. */
async function oldApply(db, key, delta) {
  const ref = refFor(db)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  if (snap.data().scoredGame === key) return
  await updateDoc(ref, { scoredGame: key, score: increment(delta) })
}

/** What it does now: read and write inside one transaction. */
async function newApply(db, key, delta) {
  const ref = refFor(db)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const p = snap.data()
    if (p.scoredGame === key) return
    tx.update(ref, { scoredGame: key, score: (p.score ?? 0) + delta })
  })
}

console.log('\nTwo devices, one account, both paying the same game at once:\n')

await reset()
await Promise.all([oldApply(clientA, `${PIN}:2`, 6), oldApply(clientB, `${PIN}:2`, 6)])
const oldScore = (await getDoc(refFor(clientA))).data().score
check('the old read-then-write DOUBLES the payment', oldScore === 12, `score ${oldScore}, expected the bug's 12`)

await reset()
await Promise.all([newApply(clientA, `${PIN}:2`, 6), newApply(clientB, `${PIN}:2`, 6)])
const newScore = (await getDoc(refFor(clientA))).data().score
check('a transaction pays exactly once', newScore === 6, `score ${newScore}, want 6`)

await reset()
await Promise.all(Array.from({ length: 6 }, (_, i) =>
  newApply(i % 2 ? clientA : clientB, `${PIN}:2`, 6)))
const manyScore = (await getDoc(refFor(clientA))).data().score
check('six attempts across both devices still pay once', manyScore === 6, `score ${manyScore}, want 6`)

// And the next game must still land on top.
await newApply(clientA, `${PIN}:3`, 3)
const nextScore = (await getDoc(refFor(clientA))).data().score
check('the following game still pays', nextScore === 9, `score ${nextScore}, want 9`)

await env.cleanup()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

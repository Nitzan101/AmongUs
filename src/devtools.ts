// Dev-only console helpers for driving the game without four real devices.
// Imported only when import.meta.env.DEV is true, so it never ships to production.
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore'
import * as gameService from './game/gameService'
import { buildAssignment } from './game/assignment'
import { computeScores } from './game/scoring'
import { tallyVotes } from './game/tally'
import { auth, db } from './lib/firebase'

;(window as unknown as { __imposter: unknown }).__imposter = {
  ...gameService,
  buildAssignment,
  computeScores,
  tallyVotes,
  auth,
  db,
  fs: { doc, setDoc, getDoc, getDocs, collection, deleteDoc },
}

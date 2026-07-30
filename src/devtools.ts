// Dev-only console helpers for driving the game without four real devices.
// Imported only when import.meta.env.DEV is true, so it never ships to production.
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import * as gameService from './game/gameService'
import { buildAssignment } from './game/assignment'
import { computeScores } from './game/scoring'
import { tallyVotes } from './game/tally'
import * as presence from './game/presence'
import { auth, db } from './lib/firebase'

;(window as unknown as { __imposter: unknown }).__imposter = {
  ...gameService,
  buildAssignment,
  computeScores,
  tallyVotes,
  presence,
  auth,
  db,
  fs: { doc, setDoc, getDoc, getDocs, collection, deleteDoc, updateDoc, Timestamp },
}

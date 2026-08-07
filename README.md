# Imposter

A bilingual (English / Hebrew) multiplayer party game for the phone. Every player secretly gets
the same **main word** except one random **imposter**, who gets a different word. Players give
clue-words and vote to unmask the imposter; the imposter tries to blend in and survive.

See [docs/SPEC.md](docs/SPEC.md) for the full game rules, scoring, and product decisions.

## Tech stack

- **React + TypeScript** — the UI, built with **Vite**, styled with **Tailwind CSS**.
- **Firebase** — realtime database (Firestore), authentication, and hosting (planned, Milestone 2).

## Getting started

```bash
npm install     # install dependencies (first time only)
npm run dev     # start the local dev server, then open the printed URL
```

Other scripts:

```bash
npm run build      # type-check and produce a production build
npm run preview    # preview the production build locally
npm run lint       # run the linter
npm run test:rules # test firestore.rules against the Firestore emulator
npm run icons      # regenerate the PWA icons
```

`npm run test:rules` needs Java (for the Firebase emulator).

## Project status

Built milestone by milestone — see the milestone list in [docs/SPEC.md](docs/SPEC.md).
**All milestones (0–8) are complete, and the game is live at
[imposter-12401.web.app](https://imposter-12401.web.app).**

The full playable game in **both modes**: in-person
(clues spoken aloud) and **fully online** (clues typed in-app, with a live said-words feed and
automatic duplicate blocking). Deal secret words, rotating turn order, secret voting with a
reveal, elimination + role flip, tie→revote→skip, a caught-imposter guess phase (auto-match with
a host Correct/Wrong fallback for typos/synonyms), three scoring presets, a **round recap**
explaining each player's points before the cumulative scoreboard, and next-game. Account holders
can build **custom themed word sets** ("Mom's birthday") and play from them, with blank confusing
words auto-filled from the same set. Hardened with a presence heartbeat, "disconnected" tags,
automatic host migration if the host vanishes, host "reveal now"/"skip guess" overrides,
auto-resume into your active game on reload, and reveal animations.
See [docs/SPEC.md §9–15](docs/SPEC.md) for details.

**Milestone 8** added an interactive rules walkthrough, PWA install, tested Firestore security
rules, and the public deploy. Since going live: Google sign-in was fixed for the deployed
domains (see `resolveAuthDomain` in `src/lib/firebase.ts`), the host can pick the word language
independently of the UI language, and the tutorial explains the main-screen buttons.

What's left is the open backlog in [docs/SPEC.md §10](docs/SPEC.md) — most notably the
**imposter-awareness host option**, which §3 records as agreed but which was never built.

### Deploying an update

Needs the account owner's Firebase login (a one-off per machine):

```bash
npx firebase login
```

The Firebase project is set in `.firebaserc`, so no `firebase use` is needed. Then:

```bash
npm run build
npx firebase deploy --only firestore:rules,hosting
```

### Running it on a fresh machine

`.env.local` is git-ignored, so it never arrives with a clone — create it from `.env.example`
using the values in Firebase Console → Project settings → General → Your apps → Config.
Without it the app still runs (home, join, and the rules walkthrough work), but sign-in is
disabled and no game can be hosted.

For phone testing on the local network, the dev server listens on the LAN (`server.host` in
`vite.config.ts`); open the printed `Network:` URL on a phone on the same WiFi.

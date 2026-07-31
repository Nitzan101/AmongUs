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
Currently: **Milestones 1–7 complete** — the full playable game in **both modes**: in-person
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

**Milestone 8** adds an interactive rules walkthrough, PWA install, and tested Firestore security
rules. The one step left is the deploy itself, which needs the account owner's Firebase login:

```bash
npx firebase login
npx firebase use --add   # pick the Firebase project
npm run build
npx firebase deploy --only firestore:rules,hosting
```

Still to come: custom word sets (M7), then security rules + public deploy (M8).

For phone testing on the local network, the dev server listens on the LAN (`server.host` in
`vite.config.ts`); open the printed `Network:` URL on a phone on the same WiFi.

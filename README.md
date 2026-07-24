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
npm run build   # type-check and produce a production build
npm run preview # preview the production build locally
npm run lint    # run the linter
```

## Project status

Built milestone by milestone — see the milestone list in [docs/SPEC.md](docs/SPEC.md).
Currently: **Milestone 4 complete** — a Firestore-backed live lobby: hosts create a game (PIN +
share link), guests join without an account (anonymous auth), and the player list syncs in real
time with host kick and a start-game gate. Verified across three devices. On top of the word bank
(M3), Firebase auth (M2), and the localized skeleton (M1).

For phone testing on the local network, the dev server listens on the LAN (`server.host` in
`vite.config.ts`); open the printed `Network:` URL on a phone on the same WiFi.

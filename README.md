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
Currently: **Milestones 1–6 complete** — the full playable game in **both modes**: in-person
(clues spoken aloud) and **fully online** (clues typed in-app, with a live said-words feed and
automatic duplicate blocking). Deal secret words, rotating turn order, secret voting with a
reveal, elimination + role flip, tie→revote→skip, a caught-imposter guess phase (auto-match with
a host Correct/Wrong fallback for typos/synonyms), three scoring presets, a **round recap**
explaining each player's points before the cumulative scoreboard, and next-game — hardened with a
presence heartbeat, "disconnected" tags, automatic host migration if the host vanishes, a host
"reveal now" override, auto-resume into your active game on reload, and reveal animations.
See [docs/SPEC.md §9–12](docs/SPEC.md) for details.

Still to come: custom word sets (M7), then security rules + public deploy (M8).

For phone testing on the local network, the dev server listens on the LAN (`server.host` in
`vite.config.ts`); open the printed `Network:` URL on a phone on the same WiFi.

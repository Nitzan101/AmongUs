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
Currently: **Milestone 1 complete** — navigable screen skeleton, playful light/dark
design system, and full English/Hebrew switching with right-to-left support.

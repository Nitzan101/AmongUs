# Imposter — Game & App Specification

A party game where every player secretly receives the same **main word** except one
random **imposter**, who receives a different **confusing word**. Players give clue-words;
the group votes to find the imposter; the imposter tries to blend in and survive.

---

## 1. Game rules

- Each round every player, in a **fixed circular turn order**, says **one word** connected to
  their own word. Turn order rotates by one seat each new game (1,2,3 → 2,3,1 → 3,1,2 …).
- **Forbidden:** a word from the **root** of the main word. Socially enforced (the app only
  reminds players); slipping up can expose or wrongly incriminate a player. Noted on the rules screen.
- **No reactions:** players must keep a straight face — reacting to a clue (laughing, frowning,
  "huh?") leaks whether it fit and ruins the round. Emphasised on the rules screen.
- **No duplicate words** — you cannot repeat a word already said. App-enforced in full-virtual
  mode (players see the said-words feed); social rule in half-virtual mode.
- After the circle, all living players cast a **secret, simultaneous vote** (no self-vote; the
  imposter must vote too). When everyone has voted, **all votes are revealed together** in a
  visual layout.
- The player with the **most votes** is eliminated and their role revealed:
  - **Imposter caught → game ends** (crew wins).
  - **Crew member eliminated →** next round begins without them, imposter still hidden.
- **Tie:** one revote among only the tied players; if still tied, **no elimination**, next round begins.
- **Imposter auto-wins** if he survives to the **final 2** (no majority possible).
- **Minimum 4 players.**
- Current-game scores are **hidden until the game ends** (prevents leaking who the imposter is).

## 2. Scoring (host picks a preset per game)

Let `V` = maximum possible votes in the game, `k` = the vote number on which the imposter was caught.

- **Team Race** (default): all crew — *including wrongly eliminated ones* — get `V − k + 1` points.
  Imposter gets `2` per vote survived, `+2` bonus for reaching the final 2.
- **Survivors:** only crew still alive when the imposter is caught get `+3`; eliminated crew get `0`.
  Imposter scored as in Team Race.
- **Detective:** Team Race, plus `+1` for every vote in which a player personally voted for the true
  imposter (revealed at game end).

**Caught-imposter guess (host option):**
- **Final Guess** (default): caught imposter guesses the main word; correct = `+2`, crew keeps its points.
- **Steal the Win:** correct guess cancels all crew points; imposter takes `+3` on top of survival points.
- **Off:** no guess phase.

## 3. Host options at game creation

- **Language:** English / Hebrew (full RTL support for Hebrew).
- **Mode:**
  - **Half-virtual** — app handles words, turn order, votes, scores only. Players speak out loud;
    the host taps one **Finish → vote** button when the circle is done.
  - **Full-virtual** — players type words in-app; everyone sees the said-words feed; duplicates blocked.
- **Difficulty (for the imposter):** Easy (confusing word is a *near-twin*) / Medium (default —
  confusing word is *same category, clearly different*) / Hard (confusing word is *unrelated*,
  from a different category).
- **Scoring preset:** Team Race / Survivors / Detective.
- **Guess rule:** Final Guess / Steal the Win / Off.
- **Imposter awareness:** default the imposter knows he is the imposter; optional hidden-role variant.

## 4. Accounts & joining

- **Create/host a game → requires an account** (Google sign-in or email/password).
- **Join a game → no account required** (guest picks a nickname + a fun avatar/character).
- Join by **game PIN** or **shareable link**. Host can **kick** players from the lobby.
- **Room persists across games**, with a **cumulative session scoreboard**. Host taps "Next game".
- **Disconnect → rejoin** by the same PIN/link; game state is preserved.

## 5. Word sets

- **Built-in bank:** authored per language (separate EN and HE lists — not translated), organized
  as **categories → clusters → words** (words in one cluster are near-twins). The confusing word is
  generated **live by distance** — easy = same cluster, medium = different cluster/same category,
  hard = different category — so there is **no fixed word→word mapping to memorize** and every word
  can play any role. Currently ~131 words per language across 8 categories; expandable.
- **Custom sets** (account holders): creator writes the **main words**; next to each they may
  optionally fill a **confusing word**, or leave it blank to be auto-filled from the same set.
  Example: "Mom's Birthday" themed around the creator's mother.

## 6. Rules / tutorial

- **"How to play" button** on the home screen and inside the lobby.
- Bilingual, **interactive**: swipeable illustrated cards that walk through a mini-round
  (your word → clues → hidden imposter → vote → scoring), not a wall of text.
- Built in the polish milestone so it illustrates the real finished screens.

## 7. Technology

- **Frontend:** React + TypeScript, built with Vite, styled with Tailwind CSS.
  Localization via react-i18next (RTL-aware). Ships as an installable PWA.
- **Backend:** Firebase — Firestore (realtime sync), Auth (Google, email/password, anonymous
  guests), Hosting. Free Spark plan.

## 8. Build milestones

0. Project setup — repo, scaffold, spec in repo. *(you can open the blank app)*
1. Skeleton + languages — screens, navigation, full EN/HE switch with RTL, look & feel.
2. Firebase wiring + accounts — Google/email sign-in, guest mode.
3. Word bank — author ~250 pairs/language + difficulty modes.
4. Lobby — create game with host options, PIN + link join, nicknames & avatars, kick, live list.
5. Core game (half-virtual) — full loop: words, turn order, voting, reveal, elimination, guess,
   scoring, cumulative scoreboard, next game with rotated order. *(playable!)*
6. Full-virtual mode — typed words, said-words feed, duplicate blocking.
7. Custom word sets — create/edit themed sets with optional per-entry confusing word.
8. Polish + deploy — PWA install, animations, rules/tutorial screen, public URL.

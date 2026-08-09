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
- **Voice chat:** off by default; the host may enable a mutable microphone for the game (§10).

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
6. Full-virtual mode — typed words, said-words feed, duplicate blocking. ✅ *(done)*
7. Custom word sets — create/edit themed sets with optional per-entry confusing word.
8. Polish + deploy — PWA install, animations, rules/tutorial screen, public URL.

## 9. Robustness backlog (connection & host handling)

Raised during Milestone 5. **Party-proofing pass (post-M5) resolved the critical items:**

- ✅ **Presence heartbeat:** each client writes `player.lastSeen` every 8s (+ on tab refocus).
  A player shows a **"Disconnected"** tag once their heartbeat is >20s stale (lobby, turn order,
  and voting candidates) — visible, but never auto-kicked.
- ✅ **Host migration:** if the host's heartbeat goes stale >45s, every other client
  deterministically computes the same backup (lowest uid among currently-fresh non-host players)
  and only that one promotes itself via the existing `promoteHost`. No freeze if the host vanishes.
  (Explicit host **leave** already migrated leadership immediately, pre-dating this pass.)
- ✅ **Host "reveal now" override:** during voting, the host can force the tally without waiting
  for stragglers — `revealVotes` never required unanimous votes, it just needed a button.
- ✅ **Auto-resume:** the device remembers its last game (`localStorage`); reopening the app
  drops you straight back into the lobby/game instead of showing the home screen, and clears
  itself if the game is gone or you're no longer a player (kicked, etc.). Verified via a
  cold-load redirect and the "kicked → cleared → stays home" case.
- ✅ **Kicked mid-game:** the game backend already removed a kicked/left player from
  `aliveIds`/`turnOrder`/`candidates` and their in-flight vote (pre-dating this pass); the game
  screen now also notices it's missing from the player list and bounces to the lobby.

**Also resolved since:**
- ✅ **Mid-game kick UI:** a collapsed "Manage players" panel sits under every phase of the game
  for the host, so someone whose phone died can be removed without waiting for the round to end.
  Collapsed by design — an always-visible ✕ beside each player during a tense vote invites
  mis-taps. The `kickPlayer` cleanup it calls already existed.
- ✅ **Rejoin UX polish:** `checkGameJoinable` now reports whether this device is already a
  player, and both join routes send them straight to the lobby instead of re-asking for a
  nickname. This also fixes a worse case: a player returning to a game **already in progress**
  used to be told "this game has already started" — their own game — because the status check
  ran before any membership check.

**Remaining, lower-priority:**
- **Join in progress:** a *new* player is still blocked ("already started"). Future: let
  latecomers wait and join the next game (the room already returns to a lobby between games).

## 10. Future features backlog

- **Account vs guest (design):** guests (anonymous) are zero-friction but device-bound; accounts
  give a stable cross-device identity and are the only way to accumulate long-term stats. Keep
  guest join; gently encourage sign-in for anyone who wants history/medals to persist. A signed-in
  user joining uses their account identity as their player — supported and encouraged.
- **Stats & badges:** avg placement, "won 5 games", "led 3 games", "1-year account", etc. Needs a
  per-account stats store updated at game end; account users only.
- **Share/publish a game or word set:** shareable link to copy a themed set into your own account
  and host with it — ties into custom word sets (Milestone 7).
- ✅ **Emoji for a word set — BUILT.** The creator picks from a 16-emoji spread when editing a
  set; it shows in the sets list and the game-creation picker, defaulting to ✏️ for sets saved
  before icons existed. Stored as `WordSet.icon`, omitted rather than written as `undefined`
  (Firestore rejects that), and cleared with `deleteField()` so removing one actually removes it.
  *Still open:* an **uploaded image** instead of an emoji, which would share the plumbing with the
  custom-character upload below.
- **Imposter-awareness option — AGREED BUT NOT BUILT.** In stage 3 the choice was "host option":
  default that the imposter knows they're the imposter, with an optional hidden-role variant where
  nobody is told. Recorded in §3 as a host option, but never implemented — the create screen has no
  such setting and every game deals a known imposter. Needs: a `GameOptions` flag, a create-screen
  option, and a `WordCard` variant that hides the "You're the imposter!" banner while still dealing
  the confusing word.
- **Word bank size:** currently ~131 words per language. The stated aim was ~250 after the
  "100 is few" feedback, so both banks are worth another authoring pass.
- **Warn before leaving unsaved edits:** "Back" in the header runs `navigate(-1)` unconditionally
  (`Layout.tsx`), so a half-written word set is lost without a word of warning. Ask for
  confirmation when the form is dirty, and leave silently when it isn't — a prompt on an untouched
  form trains people to dismiss it. Notes:
  - **Where it bites:** the word-set editor above all (long forms, easy to lose a lot), then the
    profile screen, then the create-game flow.
  - **The Back button lives in the shared layout**, not in the pages that own the form state, so
    this needs a way for a page to say "I'm dirty" — a small context, or moving Back into the
    pages. The context is less duplication; think about it before writing.
  - **Dirty means changed, not non-empty.** Compare against what was loaded, so re-saving an
    untouched existing set doesn't prompt. The editor already appends spare blank rows as you
    type, and those must not count as changes.
  - **The browser back button and swipe-back sidestep any in-app dialog.** Covering those needs a
    router blocker (and `beforeunload` for tab close/refresh), which is a bigger job — worth
    deciding whether to cover the in-app button only, or all the ways out.
- ✅ **Navigation icons for profile and word sets — BUILT.** `src/components/NavIcons.tsx`: a
  person glyph for the profile and a stack-of-cards glyph for the sets (a folder's tab detail
  vanishes at 18px). Inline SVG stroked with `currentColor`, so they inherit the button's colour
  and follow the theme — same approach as the Google mark. On the home account card and each
  page's heading. Distinct from the per-set emoji above: that varies per set, this is fixed.
- **In-game voice chat (host option, off by default):** a microphone button players can mute and
  unmute during the game, enabled by the host at game creation like the other options. Notes worth
  keeping before this is scoped:
  - **Only meaningful in full-virtual mode.** In-person players are already talking in the room.
  - **Free-plan reality:** WebRTC peer-to-peer works with Firestore for signalling and costs
    nothing, but a full mesh degrades past roughly 4–6 players — which is exactly this game's
    size, so it may just fit. Anything larger wants an SFU (Agora/LiveKit/Daily), which is paid
    and would be the first running cost the project has.
  - **It collides with two existing rules.** §1 asks players to keep a straight face, and
    full-virtual mode enforces clue order and duplicate blocking through typed input. Live voice
    during the clue phase would undermine both. Suggested shape: keep clues typed, and open the
    microphone only for the **discussion/voting phase** — where arguing is the whole point and the
    game currently has no channel for it at all. That preserves the enforcement and adds the
    social part where it belongs.
  - **Practicalities:** microphone permission prompts on mobile browsers, echo when several
    players sit in one room, battery drain, and a clear always-visible indicator of who is
    currently unmuted.

**Language vs. words (design decision):** the UI language (EN/HE toggle) and the word-content
language are independent. Words are **never translated** — a dealt word is a fixed string shown
as authored, regardless of each player's UI language (auto-translating would break the
imposter/confusing-word pairing and the root rule). Custom sets accept free text in any language
and may mix languages. Already true for dealt words today. The refinement this decision flagged —
an explicit "word language" picker at game creation, separate from the host's UI language — has
since been built for the built-in bank (see §16).

## 15. Custom word sets (Milestone 7)

Account holders can play with their own themed words instead of the built-in bank.

- **A set** (`wordSets/{id}`) is `{ ownerId, name, entries[] }`, where each entry is a **real word**
  plus an **optional confusing word**. Managed at `/sets` (list, delete) and `/sets/:id` (create/edit,
  with `new` as the id for a fresh one).
- **Blank confusing words auto-fill at deal time** from another entry's main word in the *same set*,
  so the imposter still gets something on-theme rather than a word from the generic bank. A filled
  one is used exactly as written.
- **Free text, any language, mixable** — consistent with the language-vs-words decision above.
  Rows are trimmed and blank rows dropped on save (`cleanEntries`); a blank confusing word omits the
  key entirely, since Firestore rejects `undefined`.
- **Minimum 2 entries** (`MIN_SET_ENTRIES`) for auto-fill to have something to draw from. Smaller
  sets are flagged in the list and hidden from the game-creation picker.
- **Choosing a set:** the create-game screen shows a **Words** section (built-in bank vs. each usable
  set) whenever the host has at least one usable set. Picking a custom set **hides the difficulty
  options**, since difficulty tunes the built-in bank's cluster distances and a custom set carries
  its own pairings.
- **Resilience:** if the chosen set is deleted or emptied before a game starts, `startGame` falls
  back to the built-in bank rather than failing to deal.

**Future:** share/publish a set so a friend can copy it into their own account and host with it
(already noted in the future-features backlog).

## 17. Polish & deploy (Milestone 8)

- **Interactive rules walkthrough** (`/rules`): six swipeable cards that play out one mini-round
  using miniature versions of the real screens, rather than a wall of text. Swipe (RTL-aware),
  arrow keys, and tappable progress dots. The example words and names are translated, so each
  language gets a natural walkthrough.
- **PWA:** installable to a phone home screen — generated icon set (`scripts/make-icons.mjs`,
  `npm run icons`: pure pixel maths + zlib, no image dependencies), standalone display, theme
  colour, iOS `apple-touch-icon` and safe-area padding so content clears the notch. The service
  worker auto-updates, and Firestore/Auth traffic is explicitly `NetworkOnly` so live game state
  is never served from cache.
- **Security rules** (`firestore.rules`) replace the wide-open development rules. Verified with
  `npm run test:rules` — 31 assertions against the Firestore emulator covering every operation the
  app performs and the attacks the rules must stop. Writing them surfaced three operations a naive
  ruleset would have broken: the host reading secrets to resolve eliminations, the caught imposter
  writing their guess to the game doc, and a player taking over hosting when the host's phone dies.
  Deliberate tradeoffs are documented at the top of the rules file.
- **Hosting config** (`firebase.json`): serves `dist`, rewrites all routes to `index.html` so deep
  links like `/join/123456` work, long-caches hashed assets, and keeps `sw.js` uncached so updates
  are picked up.

**Deploying** (needs the account owner, since it requires a Firebase login):
```
npx firebase login
npx firebase use --add          # pick the imposter-12401 project
npm run build
npx firebase deploy --only firestore:rules,hosting
```
Firebase Hosting domains (`*.web.app`, `*.firebaseapp.com`) are authorised for Google sign-in
automatically. A custom domain would need adding under Authentication → Settings → Authorised
domains.

## 16. Turn circle & word language

- **Turn circle (fully-online mode):** players are drawn in a ring, the way they'd sit around a
  table, numbered in clue-giving order. The player whose turn it is is highlighted and pulsing,
  with their name in the middle ("Now up: Ben"); players who have already gone get a ✓, eliminated
  players are greyed and struck through, and disconnected ones are labelled. Once everyone has
  spoken the centre flips to "Everyone's spoken". This replaced a layout where the clue feed took
  the place of the turn order entirely, so nobody could see whose turn it was. In-person mode keeps
  its numbered list (the app can't know who has spoken there).
- **Word language picker:** the host chooses which language the *secret words* come from at game
  creation, defaulting to their current UI language but switchable — so an English-speaking host can
  deal Hebrew words to Hebrew-speaking friends. This is the refinement flagged under the
  language-vs-words decision. Shown only for the built-in bank; custom sets are free text and carry
  their own language.

## 14. Leaving a game

- **Anyone can leave at any time** — the option is on the lobby *and* on every phase of an active
  game (previously it only existed in the lobby, so a mid-game player was stuck).
- **A regular player** confirms and is removed; they're also dropped from the round's `aliveIds`,
  `turnOrder`, `candidates`, and any in-flight vote, so play continues cleanly.
- **The host must decide what happens to the game** before leaving:
  - **Pass hosting & leave** — pick *which* player takes over (previously the app silently picked
    whoever came first), then leave.
  - **Close the game for everyone** — `closeGame` deletes the room and every subcollection
    (players, secrets, votes, clues) and clears the remembered PIN, so all players' apps drop back
    to the home screen instead of auto-resuming into a dead game.
- If the last player leaves, the room closes automatically.

## 13. Player identity & profiles

Everyone picks their own name and character — the host is no longer auto-named from their account.

- **Joining is two steps:** `/join` asks only for the **PIN**, validates it, then `/join/:pin` asks
  for **name + character**. A game that doesn't exist or has already started is reported at the PIN
  step, so nobody fills in a name for a game they can't enter. Share links land directly on
  `/join/:pin`, which re-checks the PIN before showing the form.
- **Creating is two steps too:** game options → name/character → create. The host chooses like
  everyone else.
- **Account defaults (optional):** account holders can save a default nickname and character
  (`users/{uid}`), set during sign-up and editable at `/profile`. These **pre-fill** the
  name/character screen and stay editable per game. Guests have no profile and pick per game.
- `IdentityFields` is the shared component behind all three screens, so the choice looks and
  behaves identically everywhere.

**Future:** let players upload their own image to use as a character, instead of only the built-in
emoji set. Would need Firebase Storage, an upload/crop UI, and moderation thinking for a public
deploy — noted here so the emoji picker stays swappable.

## 12. Full-virtual mode (Milestone 6)

How typed play differs from the in-person (half-virtual) mode:

- **Clues are typed, not spoken.** Each clue is its own document at
  `games/{pin}/clues/r{round}_{playerId}`, so concurrent submissions never overwrite each other.
- **Strict turn order.** Only the next alive player in `turnOrder` who hasn't submitted this
  round may send a word (`submitClue` throws `not-your-turn` otherwise). Eliminated players are
  skipped automatically, since the turn sequence is derived from `aliveIds`.
- **Duplicate blocking is app-enforced and game-wide** — a word already said in *any* round is
  rejected (`word-already-said`), compared case- and whitespace-insensitively via `normalizeGuess`.
  Also guards `already-submitted` and `empty-word`.
- **Said-words feed:** a live list grouped by round (the current round marked "now"), showing each
  player's avatar, name, and word. Visible during the clue phase, and behind a collapsible
  `<details>` during voting so players can re-read the clues while deciding.
- **The input only appears on your turn**; otherwise it shows who everyone is waiting for. The host
  can still open voting early (with a hint if not everyone has typed).
- Clues are cleared when a new game is dealt and when returning to the lobby.

## 11. Post-playtest polish (round two)

Raised after a live 4-device playtest of Milestone 5:

- **Eliminated players are now clearly marked.** An eliminated player stays visible in the turn
  order (greyed out, strikethrough, "Out" tag) instead of silently disappearing, and if it's
  *you* who's eliminated, the clue screen shows a "you're eliminated — spectating" message
  instead of your old word. (Voting already correctly excluded them; only the visual indicator
  was missing.)
- **Round recap before the scoreboard.** Ending a game now shows a dedicated recap: outcome,
  imposter + word reveal, guess result, and a **per-player point breakdown with a short reason**
  (e.g. "Team race bonus", "Survived 2 votes", "Spotted the imposter (2x)") — only *then* does the
  host continue to the cumulative scoreboard. `computeScores` returns `{ delta, reasons[] }` per
  player instead of a bare number; `Round.scoreBreakdown` stores it for the recap screen.
- **Guess matching: auto-match + host fallback.** An exact match or a small typo (Levenshtein-based,
  `src/game/textMatch.ts`) is accepted automatically. Anything else — including a fair synonym —
  is shown to everyone with the host given a manual **Correct/Wrong** call (`round.guessNeedsReview`),
  rather than ever auto-rejecting a reasonable guess.
- **More dramatic reveal effects.** The elimination reveal now has a ~900ms suspense pulse before
  flipping to the result (pop-in animation for good news, an "ominous shake" for bad news), and the
  recap screen fires a small confetti burst on a crew win. Pure CSS keyframes in `index.css`, no
  new dependencies.

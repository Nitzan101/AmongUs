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

## 3. Host options (set in the lobby — see §19)

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
- **Imposter awareness:** default the imposter knows he is the imposter; optional hidden-role
  variant where nobody is told (§18).
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
  can play any role. **265 words per language across 11 categories and 59 clusters.**
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

**Also resolved:**
- ✅ **Join in progress** — see §25. A latecomer is no longer turned away.

## 10. Future features backlog

- ✅ **Account vs guest (design) — SETTLED.** Guests (anonymous) are zero-friction but
  device-bound; accounts give a stable identity and are the only thing stats accumulate against.
  Guest join stays untouched. The encouragement now has something concrete to offer, so it sits on
  the **final scoreboard** — the one moment a guest can see what an account would have kept — as a
  quiet line under the scores rather than a popup: an offer, not a toll. Nothing gates on it, and
  it appears nowhere else in the flow.
- ✅ **Greet a guest as "Guest" — BUILT.** `HomePage` falls back to a new `auth.guest` key
  ("Guest" / "אורח") when there's no display name or email, instead of rendering "Hi, !". The
  guest's *game* nickname is deliberately not reused: it's chosen per game rather than stored on
  the account, so there's nothing to show before they join one.
- ✅ **Stats & badges — BUILT.** See §28. *Still open:* logging which game options get chosen.
  Nothing measures which of the host options anyone ever changes, so trimming the list would be
  guesswork — but per-account counters can't answer it either. That needs aggregation across
  accounts, which means server-side work nobody can read from a profile screen.
- ✅ **Share a word set — BUILT.** See §27. (Sharing a *game* was never a separate thing: the
  lobby's share link already does that.)
- ✅ **Emoji for a word set — BUILT.** The creator picks from a 16-emoji spread when editing a
  set; it shows in the sets list and the game-creation picker, defaulting to ✏️ for sets saved
  before icons existed. Stored as `WordSet.icon`, omitted rather than written as `undefined`
  (Firestore rejects that), and cleared with `deleteField()` so removing one actually removes it.
  *Still open:* an **uploaded image** instead of an emoji, which would share the plumbing with the
  custom-character upload below.
- ✅ **Imposter-awareness option — BUILT.** See §18.
- ✅ **Word bank size — DONE.** 265 words per language (from 131 EN / 130 HE), past the ~250 aim.
  11 categories, 59 clusters, both languages structurally identical. Grown in all three
  dimensions on purpose, because each feeds a different difficulty: bigger clusters for easy,
  more clusters per category for medium, three new categories (clothing 👕, entertainment 🎬,
  household 🏠) for hard.
- ✅ **Turn circle in half-virtual mode — BUILT.** See §26.
- ✅ **Warn before leaving unsaved edits — BUILT.** See §20.
- ✅ **Navigation icons for profile and word sets — BUILT.** `src/components/NavIcons.tsx`: a
  person glyph for the profile and a stack-of-cards glyph for the sets (a folder's tab detail
  vanishes at 18px). Inline SVG stroked with `currentColor`, so they inherit the button's colour
  and follow the theme — same approach as the Google mark. On the home account card and each
  page's heading. Distinct from the per-set emoji above: that varies per set, this is fixed.
- **In-game voice chat (host option, off by default):** a microphone button players can mute and
  unmute during the game, enabled by the host at game creation like the other options. Notes worth
  keeping before this is scoped:
  - **It belongs in *half*-virtual mode, not full.** An earlier note here had this backwards, on
    the assumption that "in person" meant "in the same room". It doesn't — it means the clues are
    *spoken rather than typed*, and that is precisely the mode a scattered group cannot play at
    all today. Full-virtual already works from anywhere. So the microphone should be open for the
    whole game, clues included, because in that mode the clues **are** the speech. The objection
    that voice would undermine typed-clue enforcement also evaporates: half mode has no typed
    clues to enforce.
  - **Free-plan reality:** WebRTC peer-to-peer works with Firestore for signalling and costs
    nothing, but a full mesh degrades past roughly 4–6 players — which is exactly this game's
    size, so it may just fit. Anything larger wants an SFU (Agora/LiveKit/Daily), which is paid
    and would be the first running cost the project has.
  - **Nothing in the rules conflicts.** §1's "keep a straight face" is about the room, not the
    channel; hearing each other is what the mode already assumes. Half mode never knew who had
    spoken — the host advances the phases by hand — and that stays true over voice, so the turn
    display carries the order exactly as it does at a table.
  - **Practicalities:** microphone permission prompts on mobile browsers, iOS Safari refusing to
    play audio without a user gesture, phones suspending a backgrounded tab mid-game, battery
    drain, and a clear always-visible indicator of who is currently unmuted.
  - **What it competes with is the reason to think twice.** A scattered group playing a party
    game is, in practice, already on a call — WhatsApp, FaceTime, Discord. Voice in the app has to
    beat a call they have *already started*, which makes it a convenience feature rather than a
    capability one, at the price of the most intricate code in the project (offer/answer and ICE
    through Firestore, renegotiation as players join and leave, teardown on leave — a path this
    codebase has repeatedly got wrong). And none of it can be verified from here: audio flowing
    between two real devices is not something this environment can observe.
  - **The cheap version of the same idea:** the mode's own description says "in person" and
    "out loud", which reads as *same room* and quietly rules out the scattered case. Saying "in
    the room or on a call" instead unlocks the use case immediately, for the price of a string.

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

**Sharing a set:** see §27.

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

## 18. Imposter awareness (hidden-role variant)

A host option, chosen at game creation alongside difficulty and scoring.

- **They know** (default) — the classic game. The imposter's card announces "You're the
  imposter!" and they set about bluffing.
- **Hidden role** — nobody is told anything. The imposter is shown the ordinary crew card and
  gives clues sincerely, with no idea their word is the odd one out. They're caught because their
  honest clues don't fit, and the payoff is the moment they realise it was them.

**The deal is identical in both.** One player still receives the confusing word; only the card
changes. `GameOptions.imposterAware` gates a single condition in `WordCard`
(`secret.role === 'imposter' && imposterAware`), so the crew layout renders for everyone.

- The field is **optional, and a missing value means `true`** — games created before this option
  existed were played the classic way, and `game.imposterAware !== false` keeps them that way.
- The setting **persists for the whole room**, like `mode` and `scoring`: only `createGame` writes
  the game document wholesale, and every later write is field-scoped, so "next game" keeps it.
- **The guess phase still works.** By the time it runs the imposter has been caught and revealed,
  so they know what they are; a hidden-role game ends with the same desperate guess at the main
  word. Deliberately not forced to Off — the "oh no, it was *me*" reveal followed by a guess is
  the best moment the variant produces.
- The crew hint ("Give a clue the others will get — but the imposter won't") reads correctly to a
  hidden imposter, who believes they're crew. No separate copy needed.
- **Known limit, consistent with the rest of the rules:** `Secret.role` is still stored in the
  player's own document, because the host reads secrets to resolve eliminations and scoring. A
  player who opened developer tools could therefore read their own role even in hidden mode. This
  is the same class of tradeoff already documented at the top of `firestore.rules` — closing it
  properly needs server-side logic on a paid plan.

## 19. Creating a room, and settings in the lobby

Sharing the link is urgent — nobody can join until it exists — while the settings are patient.
Treating them as one screen made the host answer six questions with friends waiting, so they were
split by urgency.

- **Creating is one tap.** `/create` has no form: it gates on having an account, then creates the
  room and redirects to the lobby. Name comes from the saved profile, then the account's display
  name or email prefix; character from the profile, else random. A `useRef` guard stops a
  double-render creating two rooms.
- **Settings moved into the lobby** (`GameSettingsPanel`), where the host adjusts them while
  players trickle in. Safe because `startGame` re-reads the game document when it deals, so
  whatever is set when Start is pressed is what plays.
- **Editable only while `status === 'lobby'`.** A mid-game change wouldn't re-deal, so it would
  only mislead. The room returns to a lobby between games, so a group can retune between rounds.
- **Everyone sees the settings**, read-only for non-hosts: knowing it's Hard and Steal the Win is
  part of deciding whether to play, and it costs nothing since every client already reads the game
  document.
- **Changes are highlighted for a few seconds** (`lobby.justChanged`), so someone who joined under
  one set of rules notices them changing.
- **The host's choices are saved to their profile** (`Profile.gameOptions`) and seed their next
  room. `wordSetId` is deliberately excluded: a set can be deleted or emptied between sessions,
  and silently defaulting to one that no longer deals is worse than starting from the bank.
  Per-account, not per-group — someone who plays Hard with friends and Easy with family will get
  the wrong default half the time, which is exactly why the lobby stays editable.
- `OPTION_SPECS` in `src/game/gameOptions.ts` describes every option once, so the panel is a loop
  rather than six near-identical blocks, and nothing can drift out of sync.

## 20. Guarding unsaved edits

Leaving the word-set editor used to discard a half-written set in silence.

- **Dirty means *changed*, not *non-empty*.** Both guarded pages keep a `useRef` snapshot of what
  was loaded and compare against it, so opening a set and touching nothing never prompts —
  a prompt on an untouched form only teaches people to dismiss prompts.
- **The editor's spare blank row must not count.** It appends one as you type, so the snapshot
  runs rows through `cleanEntries` first. Verified: typing into the name and a word row, then
  clearing both, leaves an extra blank row behind and still does not prompt.
- **Three exits, three mechanisms**, because no single one covers them all:
  - **The header's Back button** — a page registers a guard with `LeaveGuardProvider`, and
    `Layout` asks it before navigating. `useBlocker` was tried first and **did not intercept the
    `navigate(-1)` this button performs** — tested twice, including with a synthetic history entry
    — so the button is guarded directly rather than trusting a mechanism that misses the main
    case. The guard lives in a ref: registering must not re-render Layout.
  - **Other in-app navigation** — `useBlocker` is kept, since it does catch pushes.
  - **Closing or reloading the tab** — `beforeunload`. Chrome logs "blocked attempt to show a
    beforeunload confirmation panel" under automation, which is how we know it is armed.
- **Saving is not an escape to warn about:** `allowNext()` stands the guard down before the save
  path navigates, and the profile screen resets its baseline in place since it stays put.
- Applied to the **word-set editor** and the **profile screen**. Not the create-game flow, which
  no longer has a form (§19), nor the lobby settings panel, which saves on every tap.

## 21. Navigation: what "Back" means

Back used to call `navigate(-1)`, which is *browser history*, not app structure. Two failures came
out of one playtest:

- **It could leave the app.** Opening a share link, or reopening straight into a game, leaves the
  previous history entry pointing at some other website — so Back behaved like the browser's undo
  rather than going up a level.
- **It accumulated.** Saving a word set pushed a new entry, so after editing n sets it took 2n
  taps to get home.

`parentRoute()` now declares a parent per screen and Back navigates there with `replace`, so the
stack never grows and Back means one thing however you arrived.

- **The lobby and an active game have no parent, so the button is hidden.** They are left through
  **Leave game**, which also decides what happens to the room. Sending them "home" would be a lie
  anyway: the home screen auto-resumes straight back into the active game.
- `/join/:pin` goes up to `/join`, and `/sets/:id` (including `new`) to `/sets`.
- Saving a set also navigates with `replace`, so the editor doesn't stay on the stack.

## 22. Picking up a deploy

The service worker is built with `skipWaiting` and `clientsClaim`, so a new version activates and
claims the page at once — but the page has **already rendered from the old cache** by then, and
nothing told it to re-render. A deploy therefore stayed invisible for a whole session: you'd open
the app, see the previous version, and only get the new one after closing and reopening. That is
how a lobby settings panel that was demonstrably in the deployed bundle appeared to be missing on
a phone.

`reloadOnServiceWorkerUpdate()` listens for `controllerchange` and reloads once. It skips the very
first visit, where the absence of a controller means an initial install rather than an update, and
guards the reload so a worker that keeps claiming cannot loop.

## 23. Seating across games in a room

A room hosts many games and `seatOrder` persists between them, so the one-seat-per-game rotation
means something. But nothing kept it in step with who was actually present: `removeFromRound`
only edits `round.*`, and `startGame` passed the stored `seatOrder` straight through.

From the **second game onward** that was wrong in both directions:

- Someone who **joined between games** was dealt a secret (the deal loops over the real player
  list) but was absent from `turnOrder` and `aliveIds`, which came from the stale seating. They
  held a word, never got a turn, and could not be voted for.
- Someone who **left** kept their seat, so the game waited on a phantom the others could vote for.

`reconcileSeatOrder` now rebuilds the seating at deal time: players still present keep their
relative order (the point of stable seating), leavers drop out, and newcomers take the last seats.
The result is always exactly the current player list, so seats, secrets, turn order and `aliveIds`
can no longer disagree. `finalizeGame` scores off `seatOrder` too, so it was mis-scoring the same
way.

Checked against a real two-game room: after a newcomer joined and a player left between games, the
newcomer was seated, had a turn and was alive, the leaver was gone, and the rotation still advanced
by one.

## 24. Guests are not signed in

Joining a game silently creates an **anonymous** Firebase user, so `user` being non-null said
nothing about whether anyone had signed in. Treating the two as the same left a guest in a state
that was both at once: greeted by name and offered **Sign out**, while **Sign in** was unreachable
— `SignInPage` redirected home for any `user`, so anyone who had ever joined a game could never
reach the form. Tapping "Sign in to host" bounced straight back to the home screen.

`AuthContext` now exposes **`isGuest`** (`!user || user.isAnonymous`) as the single answer, and the
five screens that each re-derived it use that instead, so it cannot drift apart again.

- The home screen keeps **"Hi, Guest!"** — a guest has a session worth acknowledging — but offers
  a way *in* rather than out. Sign out belongs to real accounts.
- A first-time visitor with no user at all gets no greeting; there is nobody to greet yet.
- `SignInPage` now leaves only once there is a real account.

**Known consequence, not yet handled:** signing in while a guest creates a *new* Firebase user, so
the uid changes and the old anonymous identity is orphaned. A guest who signs in while sitting in
a game will no longer match their player document and will have to rejoin. The proper fix is to
upgrade the anonymous account in place (`linkWithPopup` / `linkWithCredential`, falling back to a
normal sign-in on `auth/credential-already-in-use`), which preserves the uid. Deliberately left
out of this change: it rewrites the sign-in paths, and those cannot be tested here without real
Google and email credentials.

## 25. Joining a game already in progress

Latecomers used to be refused with "this game has already started" and left with nothing to do
until the whole room finished. At a party somebody always arrives halfway through, so they now
join straight away, watch the round out, and are dealt into the next one.

- `checkGameJoinable` returns `inProgress` instead of throwing, and the identity screen says so
  **before** anything is filled in, so nobody joins expecting to play immediately.
- **No game-state surgery.** The newcomer is simply absent from the running round's `turnOrder`
  and `aliveIds`, which every phase already handles for spectators. `startGame` reconciles seating
  from the real player list (§23), so the next game seats them without any extra work — that fix
  is what made this small.
- **"Waiting" is not "eliminated".** Both were previously just "not in `aliveIds`", which would
  have told a newcomer they'd been voted out of a game they never played. Absence from
  `turnOrder` entirely is the discriminator, and it gets its own message in the clue and voting
  phases.
- They hold no secret, get no clue input, and cast no vote, so `revealVotes` still fires on the
  real players' votes alone. They score nothing for the round they watched, since scoring runs
  off the seating the game was dealt with.

Verified end to end: a newcomer added mid-round was absent from game 1's turn order, then in game
2 appeared in the seating, the turn order, `aliveIds`, and had a secret dealt.

## 26. Turn circle in person

The ring drawing was fully-online only; in-person games got a numbered list. The ring mirrors how
the group is actually sitting, so it's now a host option — **default off**, keeping the list.

The two variants differ by what the app can honestly know:

- **`live`** (online) — clues are typed, so it knows whose turn it is: that seat pulses and
  everyone who has spoken gets a ✓.
- **`order`** (in person) — words are spoken aloud and the app hears none of it. So it shows the
  seating and **who begins**, and nothing else: no ✓ marks, and no pulse, because pulsing means
  "we're waiting on you" and the app is in no position to say that.

Hidden from the settings panel in online mode, where the ring is always used and there is nothing
to choose. Eliminated and disconnected styling still applies in both, since those come from game
state rather than clues.

**Who starts skips the eliminated.** `turnOrder` keeps eliminated players in their seats, so from
the second round on the first seat may be someone who is out. The `order` variant picks the first
player still alive, the way the online variant already did through `aliveOrder`. Naming a dead
player as the one who begins would send the table to the wrong person.

**The starter changes per game, not per round** (§1): the order rotates one seat each new game, so
within a game the same person opens every round — barring elimination, which is exactly the case
above.

## 27. Sharing a word set

A 🔗 on each row of `/sets` copies a link to the clipboard; opening it lands on
`/sets/import/:id`, which offers to save a copy into your own account.

- **A copy, not a shared reference.** The recipient can rename it, add words, or delete it with
  none of that reaching back to the original — and a set can't vanish mid-game because whoever
  wrote it deleted theirs. Sharing a set is passing on a recipe, not lending a book.
- **The import page never shows the words.** A share link can reach anyone, including someone
  sitting in a game being dealt from that very set, and any signed-in user may read a set — so
  printing the list would hand them the answers. Name, icon and word count are enough to decide.
  Once copied it's theirs to open.
- **No rules change was needed.** `wordSets` already allowed read by any signed-in user and create
  with `ownerId == request.auth.uid`, with a comment anticipating exactly this.
- Guests get the account gate: a set has nowhere to live without an account. Someone opening
  their *own* share link is told so, and can still make a second copy.
- The route is declared **before** `/sets/:id`, or a share link would be read as a set id to edit.
- The clipboard can be unavailable (insecure origin, or a browser wanting a gesture it didn't
  see), so that falls back to a prompt showing the link.

Verified across two real accounts: the recipient read a set they didn't own and got a separate
document owned by themselves, with name, icon and entries preserved — including an optional
`confusing` field present on one entry and absent on others. Deleting the original as a non-owner
was correctly refused.

## 28. Stats & badges

An account's running record, shown on `/profile`: games played, wins, average points, times
imposter, imposter wins, games hosted — plus seven badges.

- **Each player records their own.** The rules only let a user write their own `users/{uid}`, so
  the host — who resolves everything else about an ending — cannot do this for the table. Every
  device writes its own line when it sees the game reach `recap`.
- **Counting once is the whole problem.** Reloading, re-rendering, or coming back to a finished
  recap must not inflate anyone's record, so `stats.lastGame` holds `pin:gameNumber` (unique per
  game within a room) and a repeat write is refused. A `useRef` in the page catches re-renders
  before they reach Firestore at all.
- **Skipped for guests**, whose identity is per-device and won't exist tomorrow, and for anyone
  who **joined mid-game and only watched** — absent from `turnOrder`, so it was never their game.
- **Badges are derived, never stored** (`badgesFor`), so thresholds can change without migrating
  anyone's data and nobody keeps a badge the numbers no longer support. Unearned ones show greyed
  with progress rather than hidden: a locked "3/5 wins" is something to play towards.
- **Stats never interrupt the game.** A failed write is swallowed and retried next time; they're
  a keepsake, not part of play.
- No rules change: writing your own profile document was already allowed.

Verified against real Firestore: a first game set every counter and `firstPlayedAt`; replaying the
identical `pin:gameNumber` returned false and changed nothing; a genuinely different game
incremented correctly. Badge thresholds checked at zero, at target, past target (progress caps at
the target rather than overshooting), and the one-year badge at 400 days versus 10.

## 29. A host's word set when hosting changes hands

A set belongs to an account, not to a room. When a host who chose one of their own sets hands the
room on, the set is the one thing that can't simply carry over — the new host doesn't own it and
so would never see it in their own list, while the room would go on dealing from it.

So leaving asks. The question appears only when the room is set to a **custom set the leaver owns**
— the built-in bank needs no permission, and a host who merely inherited a set was never in a
position to lend or withhold it.

- **Let them keep playing with it** lends the set to the room: `sharedWordSetId` on the game
  document. Kept apart from `wordSetId` deliberately — the new host must be able to switch to the
  built-in bank and back, and once `wordSetId` had moved off a set they can't see, there would be
  no route back to it. The lobby lists the lent set alongside the host's own, labelled as left
  behind by the previous host.
- **Take it back** ends the loan. In the lobby that's immediate: `wordSetId` clears and the room is
  on the built-in bank before the leaver's screen has closed. Mid-game it can't be, because the
  words are already dealt and half of them said out loud — pulling the set would spoil the round
  without hiding anything the table hasn't seen. `wordSetRevertAfterGame` marks it instead, and
  `backToLobby` clears the set when that game finishes.
- **Default is to lend.** The room is playing with the set right now and everyone has already read
  its words; carrying on is the answer that changes nothing, so taking it back is the deliberate tap.
- **Closing the game asks nothing** — the room and everything about it is about to be deleted.
- **A host who vanishes rather than leaves** (closed tab, dead phone) never answers, so their set
  stays selected with nobody able to identify it. That state is now named rather than mysterious:
  the lobby says the room is set to a set belonging to a host who has left, and that changing it is
  one-way. Reverting automatically was rejected — a host whose phone sleeps for 45 seconds loses
  hosting to the migration rule, and silently swapping their words out from under the table is
  worse than a sentence of explanation.
- **No rules change.** Sets are readable by any signed-in user, which is what makes a loan work at
  all, and the handover is written while the leaver is still host — the only moment they may write
  anything on the game document besides `round`.

Verified against real Firestore across two accounts: lending recorded `sharedWordSetId` and left
`wordSetId` in place; revoking in the lobby cleared it immediately; revoking mid-game left the
running game dealt from the set and cleared it on the return to the lobby. Signed in as a second
account that did not own the set, the lent set appeared in the picker already selected, and the
un-lent one produced the explanation instead.

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
- **Everyone else is told, not just ejected.** The other players hold on a "The host closed the
  game" screen and return home when they acknowledge it, rather than being thrown to the home
  screen mid-conversation with no explanation (`useGameClosed`, `GameClosedScreen`). Two things
  this had to get right:
  - **Derived during render, not from an effect.** The first attempt set a flag in an effect and
    lost a race: the page's own "game is gone, go home" effect ran in the same commit, still saw
    the old value, and navigated away before the notice could appear.
  - **A kick and a teardown look identical for a moment.** `closeGame` deletes the players
    *before* the game document, so every player briefly looks kicked. The game screen's kick
    redirect therefore also requires `players.length > 0` — a real kick always leaves the others
    behind, a teardown empties everyone. Without it, closing a room mid-round bounced players to
    a lobby that had never seen the game, which sent them home silently: exactly the behaviour
    the notice exists to replace.
  - Someone arriving at a PIN that never existed still goes straight home; the notice needs us to
    have actually been in the game.
- If the last player leaves, the room closes automatically.

## 13. Player identity & profiles

Everyone picks their own name and character — the host is no longer auto-named from their account.

- **Joining is two steps:** `/join` asks only for the **PIN**, validates it, then `/join/:pin` asks
  for **name + character**. A game that doesn't exist or has already started is reported at the PIN
  step, so nobody fills in a name for a game they can't enter. Share links land directly on
  `/join/:pin`, which re-checks the PIN before showing the form.
- **Creating is one tap** (see §19) — the host isn't asked at all, and instead edits their name
  and character in the lobby by tapping their own row.
- **Account defaults (optional):** account holders can save a default nickname and character
  (`users/{uid}`), set during sign-up and editable at `/profile`. These **pre-fill** the
  name/character screen and stay editable per game. Guests have no profile and pick per game.
- **Renaming in the lobby** (`updatePlayerIdentity`) applies the same clash rule as joining —
  two players sharing a name makes voting by name ambiguous.
- `IdentityFields` is the shared component behind every one of these, so the choice looks and
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

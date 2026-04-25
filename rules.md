# KEYBOARD COMMANDER: MASTER WATCHDOG DIRECTIVE

> Re-prime this document at the start of every coding session. Sections are ordered by drift risk — Section 0 first, the rest reference.

---

## 0. DRIFT SENTINELS (Read First)

These are the rules historically most violated during refactors. If a patch touches any of these areas, verify the rule before merging.

| # | Sentinel | Verify By |
|---|---|---|
| S1 | **Whitelist state guards, never blacklist.** Use `if(state !== "TYPING") return;` not `if(state === "X" \|\| state === "Y") return;` | Search for `state === ` chains in input handlers |
| S2 | **Async chains carry abort tokens.** Any recursive `setTimeout`/`Promise` chain that can be superseded must capture an ID and verify it on every tick. | Search for `setTimeout` inside a function that also writes `this.state` |
| S3 | **Lifecycle resets are exhaustive.** Every state transition (start, restart, FAILED, DONE, ArrowDown re-dictate) resets `currentIndex`, bumps the active token, clears its own timers, and refreshes the display. | Walk every `this.state = "..."` write and confirm the checklist |
| S4 | **`e.repeat` filtered in every mission input handler.** OS auto-repeat must never reach the comparison logic. | `grep e.repeat mission_*.js` — must hit every mission |
| S5 | **5-Tier Wallet on every reward.** `data_blocks`, `logic_shards`, `sync_sparks`, `consecutive_coins`, `glitch` — all five touched on every mission completion summary. | Diff each mission's `endX()` against `kc_mission_core.completeLesson()` |
| S6 | **Audio killswitch precedes Hub transition.** `KC.audio.stopIntro()` AND `KC.audio.stopActiveAudio()` are called *before* `KC.hub.enterHub()` on every abort path. | Trace every code path that calls `enterHub()` |
| S7 | **No browser modals, ever.** No `alert`, `confirm`, `prompt`. | `grep -E "\\b(alert\|confirm\|prompt)\\(" *.js` |
| S8 | **No truncated patches.** Code emitted by an assistant must be paste-ready — never `// ...rest of function`. | Visual review of any AI-generated diff |

---

## 1. THE PRIME DIRECTIVE & ARCHITECTURE

- **Core Concept:** An audio-first Typing RPG / Rhythm Game. The system prioritizes instant audio feedback (latency < 20ms) and creates muscle memory for real-world screen reader navigation.
- **Architecture:** Headless HTML5, CSS3, Vanilla JavaScript. NO frameworks. Strict adherence to a clean, modular file structure (`/audio`, top-level JS files, single `style.css`).
- **No Browser Modals:** NEVER use `alert()`, `prompt()`, or native `confirm()`. All UI interaction must be handled via DOM manipulation, state-based listeners, and custom menus.
- **The Initialization Protocol:** The application boots with a splash screen containing a focusable button. The `<main id="game-terminal">` container MUST carry `role="application"` so screen readers (NVDA, JAWS) automatically latch into Focus/Forms mode on page load. Clicking the boot button captures the first user interaction (satisfying browser autoplay policies) and transfers focus to the primary input trap.
- **Namespace Discipline:** All runtime state lives under the `KC.*` namespace (`KC.state`, `KC.audio`, `KC.bgm`, `KC.core`, `KC.hub`, `KC.mission`, `KC.mission_<name>`). Missions register themselves on `window.KC` at file load. Never introduce a parallel global.

## 2. CURRICULUM ARCHITECTURE

### The 9-Quadrant Progression
- **Alpha Quadrants (1–4):** Home Row, Top & Home, Bottom & Home, All Alpha.
- **Data Quadrants (5–8):** Number Row, Shift Symbols, Punctuation & Brackets, Numpad.
- **Control Quadrant (9):** Navigation & Editing.
- **Banned Keys:** System-level modifiers and state keys (`Escape`, `Tab`, `CapsLock`, `Shift`, `Control`, `Alt`, `Meta`) are permanently banned as active typing targets in any quadrant — they unavoidably conflict with screen reader controls and browser focus mechanics.

## 3. SCREEN READER & ACCESSIBILITY ENGINEERING

- **The Input Trap:** Core interaction relies on an always-focused `<input type="text" id="input-trap">` element. This element must be aggressively cleared via `KC.input.flush()` to prevent "ghost buffer" issues during rapid typing.
- **ARIA Output via `KC.core.announce()`:** All speech goes through the central announcer, which writes to the `#live-region` element. The announcer's contract is **overwrite-based**: every call replaces `innerText` wholesale, which is sufficient to force re-announcement of identical strings on most screen readers. If a future bug shows a swallowed re-announcement, switch that single call to the explicit `element.textContent = ''; element.textContent = newText;` pattern — do not refactor the announcer globally.
- **Live Region Polarity:** Use `aria-live="polite"` for standard feedback, `assertive` for critical errors (mission fail, instability tier 4+).
- **Audio Engine Hybridization:** Use the native `AudioContext` synthesizer (`playTone`, `playSequence`, `playSynth`) for instantaneous system feedback (menu clicks, hit markers, countdown beeps). Use HTML5 `Audio` objects for ambient tracks and voiceovers to prevent screen reader TTS ducking/clipping.
- **Context-Aware Verbosity:** Sequential menu navigation must minimize verbosity. Filter and "humanize" internal string names (snake_case → "Snake Case") before sending to the announcer.
- **Mutation Toggles:** When the SAME announcement string would fire repeatedly (e.g., per-code success in Launch Codes), alternate between two synonyms (`"Code accepted."` ↔ `"Code verified."`) via a boolean toggle so screen readers reliably re-announce. This is a per-mission optimization, not a global pattern; apply only where repetition is observed.
- **Verbose Diagnostics:** User-facing error states must explicitly announce expected vs. received (e.g., `"Expected 8, received 3."`) — never a generic "Incorrect" buzz, which causes sequence desync confusion.
- **Accessible Diagnostic Dumps (PageUp Pattern):** When a mission carries a forensic logger, the dump UI MUST be an on-screen `<textarea>` that is `appendChild`'d to `document.body`, auto-`focus()`'d, auto-`select()`'d, and announced via `KC.core.announce()` with copy instructions. Never dump to `console.log` only — DevTools is hostile to screen readers. Pause the host mission (`this.isActive = false`) while the dump overlay is up.

## 4. STATE & ASYNC HYGIENE

This section codifies the patterns that prevent the desync class of bugs.

### 4.1 The Whitelist Guard Rule

Input handlers MUST express their lockouts as **whitelists of allowed states**, not blacklists of forbidden ones. A blacklist drifts: every new state added elsewhere risks being silently included in the lockout.

**Forbidden:**
```js
if (this.state === "DICTATING" || this.state === "DONE" || this.state === "FAILED" || this.state === "WAITING") return;
```

**Required:**
```js
// Only allow input during typing-eligible states.
const allow = this.state === "TYPING" || this.state === "DICTATING"; // type-along permitted
if (!allow) return;
```

Case study: the v3.40.4 launch-codes desync was caused by `DICTATING` being on the blacklist, which silently swallowed shadow-typed keys. The first key that finally got logged was therefore from a later position in the code than the user thought — every subsequent comparison was off by N.

### 4.2 The Async Token Pattern (`dictationId`)

Any asynchronous sequence that can be superseded (dictation, spell-out, multi-step announce, recursive `setTimeout` audio chains) MUST follow this exact shape:

```js
// 1. State (declared in init):
this.dictationId = 0;

// 2. Bump on every supersede event (generate, ArrowDown re-dictate, FAILED, DONE):
this.dictationId++;

// 3. Capture on chain entry:
const myId = this.dictationId;

// 4. Verify on every tick:
playStep: function(seq, i, myId) {
    if (!this.isActive) return;
    if (myId !== this.dictationId) return;   // <-- aborted by a newer chain
    // ... do work ...
    setTimeout(() => this.playStep(seq, i + 1, myId), delay);
}

// 5. Terminal state writes are guarded:
if (this.state === "DICTATING") this.state = "TYPING";
//   ^^ never blindly overwrite a state the user may have already moved past
```

Audit hits showing this pattern is currently complete only in `mission_launch.js`. `mission_race.js` uses a `spellTimers[]` array that is cleared in `endRace()` only — a mid-mission abort can leak. Any future audio-chain mission inherits this rule by default.

### 4.3 Lifecycle Reset Checklist

Every state transition that begins a new "round" (mission start, generate next code, ArrowDown re-dictate, FAILED → recover, DONE → next) MUST reset *every* item in the checklist below before the new round's audio fires. Missing one item is the desync.

| Field | Reset to | Notes |
|---|---|---|
| `currentIndex` | `0` | The #1 source of off-by-N desync |
| `dictationId` | `++` (bump) | Kills any in-flight chain |
| `state` | The new round's entry state | Set BEFORE async kicks off |
| Active timers | `clearInterval` / `clearTimeout` | Including `timerInterval`, hint timers, drop timers |
| Display | `this.updateDisplay()` | Reflect the reset visually |
| Diagnostic log | optional `diag('GENERATE', ...)` | If logger exists |

### 4.4 Audio Chain Cancel-on-Resolve

When a round resolves early (DONE before all digits dictated, FAILED on wrong key), the resolution path MUST bump the async token (4.2 step 2) so residual audio doesn't bleed over the resolution announcement. Suppress per-keystroke click SFX while `state === "DICTATING"` — they collide with the dictation channel.

## 5. GAME ECONOMY & PERSISTENCE

- **Storage:** Data is persisted in `localStorage`.
- **The 5-Tier Unified Wallet** — every mission summary and transaction receipt MUST display all five categories:
  1. `data_blocks` — Standard currency, earned by keystroke volume.
  2. `logic_shards` — Premium currency, earned via high accuracy (>90%).
  3. `sync_sparks` — Velocity currency, earned by maintaining high Transmission Rates (TRS).
  4. `consecutive_coins` — Focus currency, earned by perfect typing streaks (≥15 deep).
  5. `glitch` — Negative liability, accumulated by errors. Must be purged.
- **Single Reward Authority:** `kc_mission_core.completeLesson()` is the canonical path that awards all five currencies. Specialized missions (`mission_race`, `mission_stream`, `mission_launch`) that do not delegate to it MUST replicate the full 5-currency calculation. **Sentinel S5** flags this — the audit found `mission_stream` and `mission_launch` award only `data_blocks`, and `mission_race` skips `sync_sparks` and `consecutive_coins`. Any new mission must either delegate or replicate.
- **Multi-User Architecture:** Master Roster (`kbc_roster`) stores an array of user callsigns. Each user's data lives in an isolated key (`kbc_profile_[Name]`). Never revert to single-key saving.
- **The Data Engine:** The `career` object maintains a `history_buffer` (capped at last 50 missions) and a `zone_stats` object tracking lifetime cumulative performance (Missions, WPM, Accuracy) split by keyboard quadrant.

## 6. INPUT & NAVIGATION STANDARDS

- **Typing Mode:** Standard character entry for typing drills.
- **Menu Navigation (2D System):** Up/Down selects vertical items. Left/Right switches categories or tabs and adjusts values in Mission Setup rows.
- **Global Commands:**
  - `Enter` — Advance / Confirm / Boot System.
  - `Escape` — Abort Mission / Exit Menu / Step Back.
- **Menu Clarity:** All Hub/Facility menu objects must include a plain-English `desc` property. Facility labels stay strictly nominal ("Archive", not "Access Archive").
- **First-Letter Navigation:** Variable lists (rosters, inventories) must support letter-key jump-to-next.
- **Visual State Indicators:** Use high-contrast text/border color shifts (e.g., toggling `.theme-login` on `body`) for major UI state changes. Do not alter the base background color.
- **System Resets:** Hard reset / return to splash uses native `location.reload()` — required to safely destroy Web Audio API contexts and prevent memory leaks.
- **2D Data Tables:** Data-heavy facilities (Archive) use 2D grid logic. Up/Down traverses entries (Y-axis); Left/Right traverses categories or metrics (X-axis). Audio announcements include the index ("Entry 1 of 12").
- **Visual Echo:** During free-form text entry, the hidden `inputTrap.value` must be mirrored to `displayText` via `setTimeout(..., 10)` so sighted users see what they type.
- **Developer Console:** Accessed via the "Stay Out" option in the main Hub. Renders only when active callsign is exactly `"BRIAN"` or contains `"bot"` (case-insensitive). Selecting it announces a verbal warning before opening the overlay. The Tilde (`~`) and Backtick (`` ` ``) keys are reserved for Punctuation & Brackets quadrant gameplay and MUST NOT be used as dev hotkeys.
- **No Hub Quick-Starts:** `Enter` at the Hub root strictly opens the primary Game Menu. Never auto-launch missions from the Hub — creates a "double-bounce" race where users trigger missions immediately after `Enter`-to-login.
- **OS Auto-Repeat Filter:** Every mission `handleInput` MUST begin with `if (e.repeat) return;`. **Sentinel S4** — the audit confirmed this is currently MISSING from every mission. Add it on the next touch.
- **Type-Along (Shadow Typing):** Expert users must be permitted to type ahead of an active dictation. Input evaluation stays active during `DICTATING`; correct keys advance `currentIndex` and a wrong key bumps the token (§4.4) to abort residual audio.

## 7. AI ASSISTANT EXECUTION RULES

- **No Truncation:** Never emit `...` or `// remaining code unchanged`. Always output the full modified function or object so it can be safely copy-pasted.
- **Destructive DOM Manipulation:** Avoid deleting/recreating DOM elements where CSS visibility (`display: none / block`) suffices.
- **Variable Safety:** Always use safe fallbacks for state variables (e.g., `const totalKeys = KC.state.stats.totalKeys || 0;`).
- **Version Comments:** First line of every JS file is `/* filename.js - vX.Y.Z */`. Bump the patch version on any code change.
- **Inline `// vX.Y.Z` Tags:** When fixing a non-trivial bug, leave a one-line `// vX.Y.Z-fix:` comment at the change site explaining what was wrong. Future agents read these to avoid regressing the fix.
- **Whitelist > Blacklist:** Per §4.1. If you find yourself writing a chain of `||` against state names, stop and invert.

## 8. AUDIO ARCHITECTURE & BGM LIFECYCLE

- **Contextual BGM & Playlists:** Background music uses a playlist-based crossfading architecture in `kc_bgm.js`. Mission Setup screens dynamically trigger mission-specific ambient grab bags (`data`, `keyboard`, `systems`, `launch`) via `KC.bgm.switchToStyle('styleName')`.
- **Smart Audio Pathing:** The BGM engine MUST use a dynamic path resolver (`"audio/music/" + track_id + ".mp3"`) as a fallback when a track isn't explicitly in `GAME_DATA.audio_bank`. Prevents silent crashes when assets are dropped into the directory.
- **Seamless State Persistence:** If a requested BGM style is already playing, the engine ignores the command (no track restart).
- **Menu Previews & Hard Cuts:** When previewing music styles in menus (Sound & Sight settings), execute an immediate *hard cut* to a freshly shuffled track — never volume-duck or overlapping crossfade.
- **State Restoration:** Exiting a mission to the Hub invokes `KC.bgm.restoreStyle()` to crossfade back to the user's preferred Hub style.
- **Audio Lifecycle Killswitches (Sentinel S6):** Every Hub-transition path MUST execute, in order:
  1. `if (KC.audio && KC.audio.stopIntro) KC.audio.stopIntro();`
  2. `if (KC.audio && KC.audio.stopActiveAudio) KC.audio.stopActiveAudio();`
  3. `KC.input.flush();`
  4. `KC.hub.enterHub();`
  Audit found `kc_input.js`'s `MISSION_START` Escape branch calls `stopIntro()` but skips `stopActiveAudio()` — fix on next touch.
- **Launch Mission Audio Timing:** Maintain a minimum +300ms buffer before the initial code broadcast and an additional +100ms intra-character delay above baseline for 6+ digit sequences, to prevent encroaching on native screen reader TTS and to prevent phonetic bleed.

## 9. WORD GENERATION & DIFFICULTY ARCHITECTURE

- **Decoupled Difficulty:** The `difficulty` parameter (1–5) strictly controls AI opponent (Commander Keyboard) speed, NOT word length.
- **Expert Quadrants:** Word length and complexity are controlled by the `isExpert` flag on the keyboard quadrant definition. Standard quadrants (`isExpert: false`) generate words ≤ 5 characters; Expert quadrants (`isExpert: true`) generate words > 5 characters.
- **Player Agency:** Players can race a fast AI on easy words or a slow AI on complex words. Never bind word length to AI difficulty.

## 10. DOM CONTRACT (Appendix)

JS depends on these element IDs being present in `index.html`. Renaming any of these is a breaking change and must be done atomically across all files.

| ID | Role | Used By |
|---|---|---|
| `game-terminal` | `role="application"` main container | `kc_core.js init()` |
| `boot-screen` | Initial overlay (hidden post-boot) | `kc_core.js bootSystem()` |
| `display-text` | Central text/HTML output | All missions |
| `display-area` | Wrapper, `aria-hidden="true"` | `kc_core.js` |
| `status-bar` | Wallet + game-state line | `kc_core.js updateStatusBar()` |
| `live-region` | ARIA live region (polite/assertive) | `kc_core.js announce()` |
| `input-trap` | `<input>` keyboard trap | `kc_core.js` + every `handleInput` |
| `btn-init` | Boot button | `kc_core.js init()` |
| `game-header` | `role="banner"` | `kc_core.js` |
| `game-footer` | `role="contentinfo"` | `kc_core.js` |

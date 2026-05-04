# Keyboard Commander: Watchdog Hub v1.0

**Current Status:** Hub initialized. Data Dump (v3.45.2) and Launch Codes (v3.43.2) stabilized. 5-Tier Economy is officially backburnered. Currently focusing on Audio script drafting and beta polish.

## 1. Agent Directives
| Directive | Rule |
| :--- | :--- |
| **No Boilerplate** | Ban prefatory text. Output strict diffs or raw facts. |
| **Zero Footprint** | Do not invent mechanics or assume context outside this document. |
| **Token Economy** | Use tables and dense bullets. Maximize information density. |
| **Diff-Only** | Code updates must be surgical blocks; no full-file rewrites. |

## 2. Pinned Context
* **Vision:** Audio-first Typing RPG / Rhythm game.
* **Audience:** Blind / low-vision users utilizing screen readers (NVDA, JAWS).
* **Goal:** Build muscle memory for screen reader navigation via <20ms latency audio feedback.
* **Curriculum:** 9-Quadrant progression (Alpha 1-4, Data 5-8, Control 9). System-modifier keys permanently banned as targets.

## 3. Tech Stack
| Layer | Technology / Constraint |
| :--- | :--- |
| **Core** | HTML5, CSS3, Vanilla JS (Zero-dependency architecture). |
| **Audio (Hybrid)** | Native `AudioContext` (synth/instant), HTML5 `<audio>` (ambient/VO). |
| **Persistence** | `localStorage` only (`kbc_roster`, `kbc_profile_[Name]`). |
| **State** | Global `KC.*` namespace. Single `#input-trap` element. |

## 4. Invariants (Tier 1: Do Not Break)
* **S1: Whitelists Only:** State transitions use strict equality checks, no blacklists or `||` catch-alls.
* **S3: Lifecycle Resets:** Thorough teardown of timers/intervals on exit (`stop()`).
* **S4: Ghost-Key Filter:** `if (e.repeat) return;` must be the absolute first gate in `handleInput`.
* **S6: Killswitch Order:** Hub transitions must fire: `stopIntro()` -> `stopActiveAudio()` -> `KC.input.flush()` -> `KC.hub.enterHub()`.
* **S7: No Modals:** `alert`, `confirm`, `prompt` are strictly forbidden. ARIA live-regions only.
* **S8: Anti-Truncation:** Code updates must be full, functional blocks. No placeholder comments.
* **UX/UI Routing:** Keyboard navigation only. No mouse paths. Up/Down (select), Left/Right (adjust/tab), Enter (confirm), Esc (exit).

## 5. Decisions (Tier 2: Require Explicit Override)
* **Economy Backburnered:** The 5-Tier resource system (`data_blocks`, `logic_shards`, `glitch`, etc.) is temporarily paused.
* **Async Token Pacing:** `mission_launch.js` uses a strict `dictationId` token pattern.
* **Phase Structure:** `mission_stream.js` operates on a 3-round phase system with 4000ms breaks.

## 6. Active Roadmap
1.  **Draft Audio Scripts:** Finalize and record ElevenLabs VO for Launch Codes (Shadow vs. Recall modes).
2.  **S4 Audit:** Propagate `e.repeat` filter across all remaining legacy missions.
3.  **Beta Polish:** Refine tutorial path (`kc_tutorial.js`) and Dev Console gating.

## 7. Session Log
* **[2026-05-04]** Hub v1.0 Initialized based on deep-scan probe. Data Dump updated to v3.45.2.
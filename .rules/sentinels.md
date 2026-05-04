# Watchdog Spoke: Drift Sentinels (S1-S8)

## S1: Whitelists Only
* **Rule:** All state transitions and input validations must use strict equality checks (`===`).
* **Banned:** Blacklists, broad `||` catch-alls, and truthy/falsy coercion.
* **Why:** Prevents rogue keypresses from triggering unintended game logic.

## S2: Async Cancellation Tokens
* **Rule:** Any async operation must use a unique cancellation token (like `dictationId`) to prevent overlapping audio loops.
* **Execution:** Refer to `.rules/async_state.md` for the strict implementation pattern.

## S3: Lifecycle Resets
* **Rule:** Every mission/module must possess a comprehensive `stop()` method.
* **Execution:** `stop()` must clear *every* `setTimeout`, `setInterval`, audio node, and array buffer.
* **Trigger:** Must be called at the very beginning of `start()` and immediately upon mission exit/failure.

## S4: Ghost-Key Filter
* **Rule:** The absolute first logical gate in any `handleInput(e)` function must reject held keys.
* **Code:** `if (e.repeat) return;`
* **Constraint:** This gate must precede ALL branches, including diagnostic overlays (like PageUp).
* **Why:** Screen reader users frequently hold keys down; without this, the buffer overflows instantly.

## S5: Wallet/Reward Consistency
* **Rule:** All mission completions must update the 5-Tier Wallet.
* **Schema:** `data_blocks`, `logic_shards`, `sync_sparks`, `consecutive_coins`, `glitch`.
* **Constraint:** Do not mutate `KC.state.profile.wallet` directly. Delegate to canonical paths or replicate the full 5-tier calculation. Use `KC.core.saveProgress()` to atomicize the commit.

## S6: Killswitch Order
* **Rule:** Exiting a mission to the Hub requires a strict sequence to prevent audio bleeding and state ghosting.
* **Execution Order:** 1. `stopIntro()`
    2. `stopActiveAudio()`
    3. `KC.input.flush()`
    4. `KC.hub.enterHub()`

## S7: No Modals
* **Rule:** Native browser modals are strictly forbidden as they hijack screen reader focus aggressively.
* **Banned:** `alert()`, `confirm()`, `prompt()`.
* **Execution:** Use `KC.core.announce(string)` (ARIA live-regions) for all critical system alerts.

## S8: Anti-Truncation
* **Rule:** AI code updates must never use placeholder comments (e.g., `// ... existing code ...`). 
* **Execution:** When updating a function, output the FULL, paste-ready function block to prevent destructive overwrites.
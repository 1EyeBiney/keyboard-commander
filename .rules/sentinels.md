\# Watchdog Spoke: Drift Sentinels (S1-S8)



\## S1: Whitelists Only

\* \*\*Rule:\*\* All state transitions and input validations must use strict equality checks (`===`).

\* \*\*Banned:\*\* Blacklists, broad `||` catch-alls, and truthy/falsy coercion.

\* \*\*Why:\*\* Prevents rogue keypresses from triggering unintended game logic.



\## S3: Lifecycle Resets

\* \*\*Rule:\*\* Every mission/module must possess a comprehensive `stop()` method.

\* \*\*Execution:\*\* `stop()` must clear \*every\* `setTimeout`, `setInterval`, audio node, and array buffer.

\* \*\*Trigger:\*\* Must be called at the very beginning of `start()` and immediately upon mission exit/failure.



\## S4: Ghost-Key Filter

\* \*\*Rule:\*\* The absolute first logical gate in any `handleInput(e)` function must reject held keys.

\* \*\*Code:\*\* `if (e.repeat) return;`

\* \*\*Why:\*\* Screen reader users frequently hold keys down; without this, the buffer overflows instantly.



\## S6: Killswitch Order

\* \*\*Rule:\*\* Exiting a mission to the Hub requires a strict sequence to prevent audio bleeding and state ghosting.

\* \*\*Execution Order:\*\* 1. `stopIntro()`

&#x20;   2. `stopActiveAudio()`

&#x20;   3. `KC.input.flush()`

&#x20;   4. `KC.hub.enterHub()`



\## S7: No Modals

\* \*\*Rule:\*\* Native browser modals are strictly forbidden as they hijack screen reader focus aggressively.

\* \*\*Banned:\*\* `alert()`, `confirm()`, `prompt()`.

\* \*\*Execution:\*\* Use `KC.core.announce(string)` (ARIA live-regions) for all critical system alerts.



\## S8: Anti-Truncation

\* \*\*Rule:\*\* AI code updates must never use placeholder comments (e.g., `// ... existing code ...`). 

\* \*\*Execution:\*\* When updating a function, output the FULL, paste-ready function block to prevent destructive overwrites.


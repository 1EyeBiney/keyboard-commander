\# Watchdog Spoke: Async State \& Tokens



\## The `dictationId` Pattern (Sentinel S2)

\* \*\*Rule:\*\* Any async operation (like dictating a sequence of characters) must use a unique cancellation token to prevent overlapping audio loops.

\* \*\*Execution Template:\*\*

&#x20; 1. Generate a new token at the start of the function: `const currentDictation = Date.now();`

&#x20; 2. Save it to state: `this.dictationId = currentDictation;`

&#x20; 3. Before every async step (e.g., inside a `setTimeout`), verify the token: `if (this.dictationId !== currentDictation) return;`

&#x20; 4. Ensure `stop()` clears the token: `this.dictationId = null;`



\## Timer Management

\* \*\*Rule:\*\* Arrays holding timeout IDs must be systematically cleared.

\* \*\*Execution:\*\* Do not just set `this.timeouts = \[]`. You must iterate and clear: 

&#x20; `this.timeouts.forEach(clearTimeout); this.timeouts = \[];`


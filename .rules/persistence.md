\# Watchdog Spoke: Persistence Contract



\## Storage Schema

\* \*\*Rule:\*\* Data is persisted in `localStorage` strictly under canonical keys.

\* \*\*Keys:\*\*

&#x20;   \* `kbc\_roster`: Master Roster array of user callsigns.

&#x20;   \* `kbc\_profile\_\[Name]`: Isolated profile data for a specific user.



\## Canonical Profile Shape

\* \*\*Rule:\*\* `createProfile()`, `resetProgress()`, and `loadProfile()` must remain shape-equivalent to prevent schema drift.

\* \*\*Required Top-Level Objects:\*\*

&#x20;   \* `wallet`: The 5-Tier economy (`data\_blocks`, `logic\_shards`, `sync\_sparks`, `consecutive\_coins`, `glitch`).

&#x20;   \* `career`: `history\_buffer` and `zone\_stats`.

&#x20;   \* `inventory`: Includes `patches`.

&#x20;   \* `mission\_records`: Historical metrics.

&#x20;   \* `settings`: User preferences.

\* \*\*Constraint:\*\* Do not patch missing keys at runtime during load. The initialization functions must construct the complete schema.


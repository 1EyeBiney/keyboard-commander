\# Watchdog Spoke: Namespacing \& Attachment



\## Dual-Attachment Strategy

\* \*\*Rule:\*\* The game uses two implicit attachment points for mission logic: `KC.handlers` and `KC.mission`.

\* \*\*Convention:\*\*

&#x20;   \* `KC.handlers.\[name]` is for input/event orchestration.

&#x20;   \* `KC.mission.\[name]` is for core game-loop logic.

\* \*\*Constraint:\*\* Do not consolidate these. They are distinct namespaces. `KC.handlers` is an implicit, lazily-created namespace. When adding a new mission, you MUST create attachments in both locations.


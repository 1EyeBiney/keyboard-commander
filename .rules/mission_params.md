\# Watchdog Spoke: Mission Params Contract



\## `KC.state.missionParams` Schema

\* \*\*Rule:\*\* The `missionParams` object is a strict contract. An AI rewrite of the setup screen must never silently drop a field.

\* \*\*Live Fields:\*\*

&#x20;   \* `voice`: Voiceover selection (e.g., "Belle", "Amelia").

&#x20;   \* `mode` / `launchMode`: Operation mode (e.g., Shadow vs Recall).

&#x20;   \* `codeLength`: Sequence length.

&#x20;   \* `difficulty`: AI speed/scaling (1-5).

&#x20;   \* `lengthMode`: Duration multiplier.

&#x20;   \* `regionMode`: Keyboard region tier.

&#x20;   \* `reflexMode`: Hand/Reflex configuration.

&#x20;   \* `region`: Specific target keyboard region object.

\* \*\*Constraint:\*\* Do not mutate this object schema without an explicit, cross-mission architectural review.


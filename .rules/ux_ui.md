\# Watchdog Spoke: UX/UI Invariants



\## Core Routing

\* \*\*Rule:\*\* The interface must be 100% navigable by keyboard.

\* \*\*Banned:\*\* Mouse event listeners (`click`, `mouseover`, `mousedown`). Do not attach them to DOM elements.



\## Universal Control Scheme

\* \*\*`ArrowUp` / `ArrowDown`:\*\* Navigate vertical menus or select setting rows.

\* \*\*`ArrowLeft` / `ArrowRight`:\*\* Adjust the value of the currently selected row (e.g., changing Difficulty).

\* \*\*`Enter`:\*\* Confirm selection or initialize mission.

\* \*\*`Escape`:\*\* Abort mission, close menu, or return to Hub.



\## Target Key Restrictions

\* \*\*Rule:\*\* System modifier keys can never be used as active targets in typing missions.

\* \*\*Banned Targets:\*\* `Control`, `Alt`, `Shift`, `Meta`, `Tab`, `CapsLock`.


\# KEYBOARD COMMANDER: MASTER WATCHDOG DIRECTIVE



\## 1. THE PRIME DIRECTIVE \& ARCHITECTURE

\- \*\*Core Concept:\*\* An audio-first Typing RPG / Rhythm Game. The system prioritizes instant audio feedback (latency < 20ms) and creates muscle memory for real-world screen reader navigation.

\- \*\*Architecture:\*\* Headless HTML5, CSS3, Vanilla JavaScript. NO frameworks. Strict adherence to a clean, modular file structure (/js, /assets, /css).

\- \*\*No Browser Modals:\*\* NEVER use alert(), prompt(), or native confirm(). All UI interaction must be handled via DOM manipulation, state-based listeners, and custom menus.

\- \*\*The Initialization Protocol:\*\* The application must boot with a splash screen containing a focusable button. This container MUST carry role="application" so that screen readers (NVDA, JAWS) automatically latch into Focus/Forms mode on page load. Clicking this button captures the first user interaction (satisfying browser autoplay policies) and transfers focus to the primary input trap.



\## 2. SCREEN READER \& ACCESSIBILITY ENGINEERING

\- \*\*The Input Trap:\*\* Core interaction relies on an always-focused `<input type="text">` element. This element must be aggressively cleared to prevent "ghost buffer" issues during rapid typing.

\- \*\*ARIA Output:\*\* Use dedicated ARIA live regions (aria-live="polite" for standard feedback, assertive for critical errors). \*\*Crucial:\*\* Always clear textContent (e.g., element.textContent = '') before assigning new text to force the screen reader to re-announce consecutive identical strings.

\- \*\*Audio Engine Hybridization:\*\* Use the native AudioContext synthesizer (playTone, playSequence) for instantaneous system feedback (menu clicks, hit markers). Use HTML5 Audio objects for ambient tracks and voiceovers to prevent screen reader TTS ducking/clipping issues.

\- \*\*Context-Aware Verbosity:\*\* Sequential menu navigation must minimize verbosity. Only announce necessary context. Filter and "humanize" internal string names before sending them to the ARIA announcer so they sound natural.



\## 3. GAME ECONOMY \& PERSISTENCE

\- \*\*Storage:\*\* Data is persisted in localStorage. 

\- \*\*The 5-Tier Unified Wallet:\*\* All mission rewards and expenditures must interact with these exact five currencies:

&#x20; 1. `data\_blocks`: Standard currency, earned by keystroke volume.

&#x20; 2. `logic\_shards`: Premium currency, earned via high accuracy (>90%).

&#x20; 3. `sync\_sparks`: Velocity currency, earned by maintaining high Transmission Rates (TRS).

&#x20; 4. `consecutive\_coins`: Focus currency, earned by maintaining perfect typing streaks.

&#x20; 5. `glitch`: Negative liability, accumulated by errors. Must be purged.

\- Every mission summary and transaction receipt MUST display all five categories to maintain a consistent UI state.



\## 4. INPUT \& NAVIGATION STANDARDS

\- \*\*Typing Mode:\*\* Standard character entry for typing drills.

\- \*\*Menu Navigation (2D System):\*\* Menus utilize directional navigation. Up/Down Arrows select vertical items. Left/Right Arrows switch categories or tabs.

\- \*\*Global Commands:\*\* - Enter: Advance / Confirm / Boot System.

&#x20; - Escape: Abort Mission / Exit Menu / Step Back.

\- \*\*Menu Clarity:\*\* All Hub/Facility menu objects must include a plain-English `desc` property to reduce cognitive load. Keep facility labels strictly as nouns (e.g., "Archive", not "Access Archive").

\- \*\*First-Letter Navigation:\*\* Menus with variable lists (like rosters or inventories) must support pressing letter keys to dynamically jump to the next item starting with that letter.

\- \*\*Visual State Indicators:\*\* Use high-contrast text/border color shifts (e.g., toggling a CSS class like `.theme-login` on the `body`) to indicate major UI state changes without altering the base background color.



\## 5. GEMINI CODE ASSIST (GCA) EXECUTION RULES

\- \*\*No Truncation:\*\* Never truncate code using `...` or `// remaining code`. Always output the full, modified function or object so it can be safely copy/pasted.

\- \*\*Destructive DOM Manipulation:\*\* Avoid deleting/recreating DOM elements where CSS visibility swapping (display: none / display: block) will suffice.

\- \*\*Variable Safety:\*\* Always use safe fallbacks for state variables (e.g., `const totalKeys = KC.state.stats.totalKeys || 0;`).


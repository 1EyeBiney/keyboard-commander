\# KEYBOARD COMMANDER: MASTER WATCHDOG DIRECTIVE



\## 1. THE PRIME DIRECTIVE \& ARCHITECTURE

\- \*\*Core Concept:\*\* An audio-first Typing RPG / Rhythm Game. The system prioritizes instant audio feedback (latency < 20ms) and creates muscle memory for real-world screen reader navigation.

\- \*\*Architecture:\*\* Headless HTML5, CSS3, Vanilla JavaScript. NO frameworks. Strict adherence to a clean, modular file structure (/js, /assets, /css).

\- \*\*No Browser Modals:\*\* NEVER use alert(), prompt(), or native confirm(). All UI interaction must be handled via DOM manipulation, state-based listeners, and custom menus.

\- \*\*The Initialization Protocol:\*\* The application must boot with a splash screen containing a focusable button. This container MUST carry role="application" so that screen readers (NVDA, JAWS) automatically latch into Focus/Forms mode on page load. Clicking this button captures the first user interaction (satisfying browser autoplay policies) and transfers focus to the primary input trap.



\## 2. CURRICULUM ARCHITECTURE

\### The 10-Quadrant Progression
\- The 10 standard keyboard quadrants are organized into three groups:
\- \*\*Alpha Quadrants (1–4):\*\* Home Row, Top \& Home, Bottom \& Home, All Alpha.
\- \*\*Data Quadrants (5–8):\*\* Number Row, Shift Symbols, Punctuation \& Brackets, Numpad.
\- \*\*Control Quadrants (9–10):\*\* Function Keys, Modifiers \& Navigation.


\## 3. SCREEN READER \& ACCESSIBILITY ENGINEERING

\- \*\*The Input Trap:\*\* Core interaction relies on an always-focused `<input type="text">` element. This element must be aggressively cleared to prevent "ghost buffer" issues during rapid typing.

\- \*\*ARIA Output:\*\* Use dedicated ARIA live regions (aria-live="polite" for standard feedback, assertive for critical errors). \*\*Crucial:\*\* Always clear textContent (e.g., element.textContent = '') before assigning new text to force the screen reader to re-announce consecutive identical strings.

\- \*\*Audio Engine Hybridization:\*\* Use the native AudioContext synthesizer (playTone, playSequence) for instantaneous system feedback (menu clicks, hit markers). Use HTML5 Audio objects for ambient tracks and voiceovers to prevent screen reader TTS ducking/clipping issues.

\- \*\*Context-Aware Verbosity:\*\* Sequential menu navigation must minimize verbosity. Only announce necessary context. Filter and "humanize" internal string names before sending them to the ARIA announcer so they sound natural.

\- \*\*Background Music (BGM) Engine:\*\* Ambient music must use a dual-element HTML5 `<audio>` crossfader to ensure seamless transitions between tracks without interrupting the `AudioContext` synth. User preferences (volume, music style) must be persisted in their profile `settings`. Global audio controls (e.g., Shift+V for volume, Shift+M for style) must remain globally accessible via `handleGlobalKeys`.



\## 4. GAME ECONOMY \& PERSISTENCE

\- \*\*Storage:\*\* Data is persisted in localStorage. 

\- \*\*The 5-Tier Unified Wallet:\*\* All mission rewards and expenditures must interact with these exact five currencies:

&#x20; 1. `data\_blocks`: Standard currency, earned by keystroke volume.

&#x20; 2. `logic\_shards`: Premium currency, earned via high accuracy (>90%).

&#x20; 3. `sync\_sparks`: Velocity currency, earned by maintaining high Transmission Rates (TRS).

&#x20; 4. `consecutive\_coins`: Focus currency, earned by maintaining perfect typing streaks.

&#x20; 5. `glitch`: Negative liability, accumulated by errors. Must be purged.

\- Every mission summary and transaction receipt MUST display all five categories to maintain a consistent UI state.

\- \*\*Multi-User Architecture:\*\* Data is managed via a Master Roster (`kbc_roster`) which stores an array of user callsigns. Each user's data is saved in an isolated key (`kbc_profile_[Name]`). Never revert to single-key saving.

\- \*\*The Data Engine:\*\* The `career` object must maintain a `history_buffer` (an array capped at the user's last 50 missions) and a `zone_stats` object that tracks lifetime cumulative performance (Missions, WPM, Accuracy) split by specific keyboard quadrants (e.g., "Home Row").



\## 5. INPUT \& NAVIGATION STANDARDS

\- \*\*Typing Mode:\*\* Standard character entry for typing drills.

- **Menu Navigation (2D System):** Menus utilize directional navigation. Up/Down Arrows select vertical items. Left/Right Arrows switch categories or tabs, and adjust values when navigating Mission Setup rows.

\- \*\*Global Commands:\*\* - Enter: Advance / Confirm / Boot System.

&#x20; - Escape: Abort Mission / Exit Menu / Step Back.

\- \*\*Menu Clarity:\*\* All Hub/Facility menu objects must include a plain-English `desc` property to reduce cognitive load. Keep facility labels strictly as nouns (e.g., "Archive", not "Access Archive").

\- \*\*First-Letter Navigation:\*\* Menus with variable lists (like rosters or inventories) must support pressing letter keys to dynamically jump to the next item starting with that letter.

\- \*\*Visual State Indicators:\*\* Use high-contrast text/border color shifts (e.g., toggling a CSS class like `.theme-login` on the `body`) to indicate major UI state changes without altering the base background color.

\- \*\*System Resets:\*\* When executing a hard reset or returning to the initial boot splash screen (e.g., an "Exit" command), use a native `location.reload()`. This is the required method to safely destroy Web Audio API contexts and prevent memory leaks.

\- \*\*2D Data Tables:\*\* Data-heavy facilities (like the Archive) must use a 2D grid logic. Up/Down traverses entries (Y-axis), while Left/Right traverses categories or metrics (X-axis). Audio announcements must include the index (e.g., "Entry 1 of 12") to maintain user orientation.

\- \*\*Visual Echo:\*\* Whenever the user is prompted to type free-form text (e.g., creating a callsign), the hidden `inputTrap.value` must be actively mirrored to the `displayText` container using a `setTimeout(..., 10)` so sighted users can see what they are typing in real-time.

\- \*\*Developer Console:\*\* All developer and testing operations are accessed via the "Stay Out" option in the main Hub menu. Selecting "Stay Out" announces a verbal warning and then opens the Dev Console overlay. The Tilde (\~) and Backtick (\`) keys are reserved for gameplay input in the Punctuation & Brackets quadrant and must NOT be used as dev/testing hotkeys.



\## 6. GEMINI CODE ASSIST (GCA) EXECUTION RULES

\- \*\*No Truncation:\*\* Never truncate code using `...` or `// remaining code`. Always output the full, modified function or object so it can be safely copy/pasted.

\- \*\*Destructive DOM Manipulation:\*\* Avoid deleting/recreating DOM elements where CSS visibility swapping (display: none / display: block) will suffice.

\- \*\*Variable Safety:\*\* Always use safe fallbacks for state variables (e.g., `const totalKeys = KC.state.stats.totalKeys || 0;`).


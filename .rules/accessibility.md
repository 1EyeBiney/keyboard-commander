\# Watchdog Spoke: Accessibility \& DOM Contract



\## Screen Reader Routing

\* \*\*Rule:\*\* Text updates must be intentionally routed to either the visual display OR the screen reader.

\* \*\*Visual Only:\*\* Use `element.innerHTML` or `element.textContent` for the main display.

\* \*\*Screen Reader Only:\*\* Use `KC.core.announce("text")` to push text to the assertive `#live-region`.



\## The Input Trap

\* \*\*Rule:\*\* Focus must ALWAYS remain on the hidden `<input id="input-trap">`. If focus is lost, the game breaks for blind users.

\* \*\*Execution:\*\* Do not introduce buttons, links, or focusable elements (`tabindex="0"`) into the `#game-terminal`.



\## Hardcoded DOM IDs

The JavaScript depends on these exact IDs in `index.html`. Never rename them.

\* `#game-terminal` (Main container)

\* `#display-text` (Visual output)

\* `#status-bar` (Wallet and game state)

\* `#live-region` (ARIA live region for announcements)

\* `#input-trap` (Hidden input for capturing keystrokes)



\## Forensic Dump

\* \*\*Rule:\*\* Pressing `PageUp` triggers `KC.core.triggerForensicDump()`. This must remain intact so visually impaired users can read the raw history buffer at their own pace.


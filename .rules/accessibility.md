# Watchdog Spoke: Accessibility & DOM Contract

## Screen Reader Routing
* **Rule:** Text updates must be intentionally routed to either the visual display OR the screen reader.
* **Visual Only:** Use `element.innerHTML` or `element.textContent` for the main display.
* **Screen Reader Only:** Use `KC.core.announce("text")` to push text to the assertive `#live-region`.

## The Input Trap
* **Rule:** Focus must ALWAYS remain on the hidden `<input id="input-trap">`. If focus is lost, the game breaks for blind users.
* **Execution:** Do not introduce buttons, links, or focusable elements (`tabindex="0"`) into the `#game-terminal`.

## Hardcoded DOM IDs
The JavaScript depends on these exact IDs. Do not rename or remove them:
`#game-terminal`, `#boot-screen`, `#display-text`, `#display-area`, `#status-bar`, `#live-region`, `#input-trap`, `#btn-init`, `#game-header`, `#game-footer`.

## Diagnostic Overlay (PageUp)
* **Rule:** Pressing `PageUp` triggers diagnostic overlays (like `dumpDiag()`).
* **Constraint:** This shifts focus to a `textarea` and sets `isActive = false`. 
* **Recovery:** Do not auto-restore focus. This overlay requires a full browser reload to dismiss. Do not "fix" this behavior.
/* mission_echoc.js - v1.71.2 */

KC.echoc = {
    // --- Assets ---
    briefing_text: "System Probe Initialized. The Echo Chamber is a sterile environment designed for input diagnostics. In this mode, the neural link is bypassed, allowing you to hear the raw signature of every keystroke. Use this space to test your hardware or familiarize yourself with the console layout. No combat data will be recorded.",

    // --- Key Definitions ---
    key_map: {
        " ": "Spacebar",
        "Enter": "Enter",
        "Escape": "Escape",
        "Backspace": "Backspace",
        "Tab": "Tab",
        "Shift": "Shift",
        "Control": "Control",
        "Alt": "Alt",
        "CapsLock": "Caps Lock",
        "ArrowUp": "Arrow Up",
        "ArrowDown": "Arrow Down",
        "ArrowLeft": "Arrow Left",
        "ArrowRight": "Arrow Right",
        "Meta": "Windows Key"
    },

    /**
     * INIT: Called by kc_input.js when the user selects "Echo Chamber"
     */
    init: function() {
        console.log("Echo Chamber: Initializing...");
        
        // 1. Set Global State
        KC.state.status = "ECHOC_START";
        
        // 2. Render the Landing Screen
        this.renderStartScreen();
    },

    /**
     * RENDER: The Briefing Screen
     */
    renderStartScreen: function() {
        KC.els.displayText.textContent = "";

        let content = ">> SYSTEM PROBE: ECHO CHAMBER <<\n\n";
        content += this.briefing_text + "\n\n";
        content += "[ STATUS: STANDBY ]\n";
        content += "Press [ENTER] to Activate Diagnostics.\n";
        content += "Press [ESCAPE] to Abort and return to Hub.";

        KC.els.displayText.textContent = content;
        KC.core.announce("Echo Chamber selected. " + this.briefing_text + " Press Enter to activate diagnostics, or Escape to return.");
    },

    /**
     * ACTIVATE: Switches to live reporting mode
     */
    startDiagnostics: function() {
        KC.state.status = "ECHOC_ACTIVE";
        
        KC.els.displayText.textContent = ">> DIAGNOSTICS ACTIVE <<\n\n[Listening for Input...]\n\nPress any key to hear its signature.\nPress [ESCAPE] to return to Briefing.";
        
        KC.audio.playSound('click');
        KC.core.announce("Diagnostics Active. Press any key. Press Escape to stop.");
    },

    /**
     * INPUT HANDLER: Process raw keystrokes
     */
    handleInput: function(e) {
        // 1. Check for Exit
        if (e.key === "Escape") {
            KC.audio.playSound('click');
            this.init(); // Go back to Start Screen
            return;
        }

        // 2. Identify the Key
        let keyName = this.key_map[e.key] || e.key;
        let audioKey = "char_" + e.key.toLowerCase();
        
        // Handle side-specific modifiers
        if (e.code === "ControlLeft") keyName = "Left Control";
        if (e.code === "ControlRight") keyName = "Right Control";
        if (e.code === "ShiftLeft") keyName = "Left Shift";
        if (e.code === "ShiftRight") keyName = "Right Shift";
        if (e.code === "AltLeft") keyName = "Left Alt";
        if (e.code === "AltRight") keyName = "Right Alt";

        // 3. Announce or Play Audio
        // v1.71.2: Check for Recorded Asset
        if (GAME_DATA.audio_bank[audioKey]) {
            // Found audio asset - Fire and Forget
            KC.audio.playSFX(audioKey);
            // Update visual only, do not use TTS
            KC.els.displayText.textContent = ">> DIAGNOSTICS ACTIVE <<\n\nLast Input: " + keyName + " [AUDIO]";
        } else {
            // No asset found - Use TTS System Prompt
            KC.core.announce(keyName, true);
            KC.els.displayText.textContent = ">> DIAGNOSTICS ACTIVE <<\n\nLast Input: " + keyName;
        }
    },

    /**
     * EXIT: Return to the Main Menu
     */
    exit: function() {
        console.log("Echo Chamber: Aborting...");
        KC.hub.enterHub();
    }
};
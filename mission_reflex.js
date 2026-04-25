/* mission_reflex.js - v3.42.4 */

KC.handlers.reflex = {
    // State
    sequence: [],
    audioCues: [],
    customCues: [],
    currentIndex: 0,
    isActive: false,
    
    // v1.73.5: Hint Timer
    hintTimer: null,
    
    // Logic
    currentTarget: "",
    
    start: function(lesson) {
        this.isActive = false; 
        this.currentIndex = 0;
        this.clearHint();
        
        KC.state.currentStreak = 0;
        KC.state.missionMaxStreak = 0;
        
        const params = KC.state.missionParams || { reflexMode: 0, lengthMode: 0 };
        
        // 1. Determine Length
        let len = 12;
        if (params.lengthMode === 1) len = 24;
        if (params.lengthMode === 2) len = 36;

        // 2. Generate Sequence if needed
        if (lesson.generator === "reflex") {
            const generated = this.generateReflexSequence(len); 
            this.sequence = generated.sequence;
            this.audioCues = generated.audio_cues;
            this.customCues = generated.custom_cues;
        } else {
            // Static sequence (Tutorials)
            this.sequence = lesson.sequence.split('');
            this.audioCues = lesson.audio_cues || [];
            this.customCues = lesson.custom_cues || [];
        }

        // 3. Setup Display (v2.87.1: Fix undefined announcements)
        const briefingText = lesson.briefing || "System Override Initialized.";
        let prompt = lesson.briefing_prompt || "Execute Sequence.";
        KC.els.displayText.textContent = `${briefingText}\n\n[${prompt}]`;

        // 4. Initialize Hazards
        KC.state.instability = { tier: 0, recoveryStreak: 0, active: true };
        if (KC.audio.startHazardLoop) KC.audio.startHazardLoop("sfx_spark_loop");
        if (KC.audio.setHazardIntensity) KC.audio.setHazardIntensity(0);

        // 5. Instantly Begin Typing 
        // (kc_mission_core.js already handled the 3-2-1 countdown)
        this.beginTyping();
    },

    beginTyping: function() {
        this.isActive = true;
        KC.state.status = "ACTIVE_TYPING";
        KC.state.stats = { startTime: Date.now(), totalKeys: 0, errors: 0 };
        this.currentIndex = 0;
        this.nextEvent();
    },

    nextEvent: function() {
        if (!this.isActive) return;
        this.clearHint();

        // Check Victory
        if (this.currentIndex >= this.sequence.length) {
            this.endMission();
            return;
        }

        // Setup Target
        this.currentTarget = this.sequence[this.currentIndex];
        
        // Visual Update
        KC.els.displayText.textContent = `>> SYSTEM OVERRIDE ACTIVE <<\nTarget: ${this.currentTarget.toUpperCase()}\nRemaining: ${this.sequence.length - this.currentIndex}`;

        // Audio Cue
        if (this.customCues && this.customCues[this.currentIndex]) {
            KC.core.announce(this.customCues[this.currentIndex]);
        }
        
        if (this.audioCues && this.audioCues[this.currentIndex]) {
            KC.audio.playSFX(this.audioCues[this.currentIndex]); 
        } else {
            if (!this.customCues[this.currentIndex]) {
                KC.core.announce(this.currentTarget.toUpperCase());
            }
        }
        
        // Hint Timer
        this.hintTimer = setTimeout(() => {
            if (this.isActive) {
                KC.core.announce(`Type ${this.currentTarget.toUpperCase()}.`);
            }
        }, 2500);
    },

    handleInput: function(e) {
        // v3.42.4: S4 Ghost-Key Filter. Must be the absolute first gate.
        if (e.repeat) return;

        if (!this.isActive) return;
        
        if (["Shift", "Control", "Alt", "CapsLock", "Tab"].includes(e.key)) return;

        const inputChar = e.key;
        KC.state.stats.totalKeys++;

        if (inputChar.toLowerCase() === this.currentTarget.toLowerCase()) {
            // SUCCESS
            this.clearHint();
            
            // v1.74.0: Streak Tracking
            KC.state.currentStreak++;
            if (KC.state.currentStreak > KC.state.missionMaxStreak) {
                KC.state.missionMaxStreak = KC.state.currentStreak;
            }
            
            KC.audio.playSound('click');
            KC.mission.updateInstability(false); // Heal hazard
            this.currentIndex++;
            
            setTimeout(() => this.nextEvent(), 50); 
        } else {
            // FAILURE
            // v1.74.0: Streak Reset
            KC.state.currentStreak = 0;
            
            KC.audio.playSound('error');
            KC.state.stats.errors++;
            
            const exploded = KC.mission.updateInstability(true); // Worsen hazard
            
            if (exploded) {
                this.isActive = false;
                this.clearHint();
                return;
            }
            
            this.clearHint();
            const target = this.currentTarget.toUpperCase();
            setTimeout(() => {
                if (this.isActive) KC.core.announce(`Type ${target}.`);
            }, 300);
        }
    },
    
    clearHint: function() {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }
    },

    endMission: function() {
        this.isActive = false;
        this.clearHint();
        KC.mission.completeLesson();
    },

    generateReflexSequence: function(length) {
        // v2.66: Dynamically grab the active keys based on current Region and Hand settings
        const activeKeysRaw = KC.mission.getActiveKeys();
        const keys = Array.isArray(activeKeysRaw) ? activeKeysRaw : activeKeysRaw.split('');

        let seq = [];
        let audio = [];
        let custom = [];

        // v2.75: No-Repeat Pools
        const wordPools = {};

        for (let i = 0; i < length; i++) {
            const rawKey = keys[Math.floor(Math.random() * keys.length)];
            const keyLower = rawKey.toLowerCase();
            seq.push(rawKey);

            // Check if we have sci-fi system words for this key
            if (GAME_DATA.system_words && GAME_DATA.system_words[keyLower]) {
                // v2.75: Pool Logic
                if (!wordPools[keyLower] || wordPools[keyLower].length === 0) {
                    wordPools[keyLower] = [...GAME_DATA.system_words[keyLower]];
                }
                
                const poolIndex = Math.floor(Math.random() * wordPools[keyLower].length);
                const chosenWord = wordPools[keyLower].splice(poolIndex, 1)[0];
                
                audio.push("word_" + chosenWord);
                
                // Capitalize and format for TTS (e.g. "x_ray" -> "X ray.")
                let ttsCue = chosenWord.charAt(0).toUpperCase() + chosenWord.slice(1).replace(/_/g, ' ');
                custom.push(ttsCue + ".");
            } else {
                // Fallback for symbols or modifiers (e.g. Navigation keys)
                audio.push("char_" + keyLower);
                
                // Basic formatting for TTS fallback
                let ttsFallback = rawKey;
                if (rawKey === " ") ttsFallback = "Spacebar";
                if (rawKey.length > 1) { 
                    // Add spaces to camel case like "ArrowUp" -> "Arrow Up"
                    ttsFallback = rawKey.replace(/([A-Z])/g, ' $1').trim();
                }
                custom.push(ttsFallback.toUpperCase() + ".");
            }
        }

        return {
            sequence: seq,
            audio_cues: audio,
            custom_cues: custom
        };
    }
};
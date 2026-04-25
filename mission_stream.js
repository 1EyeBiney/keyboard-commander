/* mission_stream.js - v3.42.2 */

KC.handlers.stream = {
    // State
    isActive: false,
    buffer: [],      
    dropTimer: null, 
    startTime: 0,    
    
    // Config
    maxSize: 6,     
    currentSpeed: 1600, 
    initialSpeed: 1600,
    phaseDuration: 10000, 
    winTime: 30000,  
    activeKeys: "",  
    
    // Stats & Dynamic Pacing
    phase: 1,
    score: 0,
    reactionTimes: [], 
    
    stop: function() {
        this.isActive = false;
        if (this.dropTimer) clearTimeout(this.dropTimer);
        this.dropTimer = null;
        this.buffer = [];
    },

    start: function(lesson) {
        this.stop(); 
        this.isActive = false; 
        this.phase = 1;
        this.score = 0;
        this.reactionTimes = [];
        
        // Reset Global Stats
        KC.state.status = "ACTIVE_TYPING";
        KC.state.stats = { startTime: Date.now(), totalKeys: 0, errors: 0 };
        KC.state.currentStreak = 0;
        KC.state.missionMaxStreak = 0;

        // 1. Difficulty -> Base Speed
        const diff = KC.state.missionParams.difficulty || 1;
        const diffMap = [1600, 1400, 1200, 1000, 800];
        this.currentSpeed = diffMap[diff - 1] || 1600;
        this.initialSpeed = this.currentSpeed;
        
        // 2. Length -> Phase Duration
        const mode = KC.state.missionParams.lengthMode || 0;
        if (mode === 0) this.phaseDuration = 10000;       
        else if (mode === 1) this.phaseDuration = 20000;  
        else this.phaseDuration = 30000;                 
        
        this.winTime = this.phaseDuration * 3;

        // 3. Centralized Keyboard Mapping (v2.91: Decoupled Menu Fix)
        this.activeKeys = KC.mission.getActiveKeys();
        
        const modeParams = KC.state.missionParams || {};
        const currentRegions = KC.mission.getRegions(lesson);
        const rMode = modeParams.regionMode || 0;
        const region = currentRegions[rMode] || currentRegions[0];
        const regionName = region.name;
        
        let targetZoneStr = regionName;
        if (!region.forceBoth) {
            const handName = ["Left Hand", "Right Hand", "Both Hands"];
            targetZoneStr += ` - ${handName[modeParams.reflexMode || 0]}`;
        }
        
        this.render();
        KC.core.announce(`Data Dump Initialized. Target Zone: ${targetZoneStr}. Drops calibrated to ${this.currentSpeed} milliseconds.`);

        KC.mission.runCountdown(() => {
            this.beginStream();
        });
    },

    beginStream: function() {
        this.isActive = true;
        this.startTime = Date.now();
        this.triggerDrop();
    },

    // Custom Web Audio Drops based on Severity
    playDropSound: function(severity) {
        if (!KC.audio.ctx) return;
        if (KC.audio.ctx.state === 'suspended') KC.audio.ctx.resume();
        
        const osc = KC.audio.ctx.createOscillator();
        const gain = KC.audio.ctx.createGain();
        osc.connect(gain);
        gain.connect(KC.audio.ctx.destination);
        const now = KC.audio.ctx.currentTime;
        
        if (severity <= 3) {
            // "Bloop"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (severity === 4) {
            // "Warning Thunk"
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (severity >= 5) {
            // "Critical Buzz"
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    },

    triggerDrop: function() {
        if (!this.isActive) return;

        const charIndex = Math.floor(Math.random() * this.activeKeys.length);
        const char = this.activeKeys[charIndex];
        
        this.buffer.push({ char: char, activeTime: null });
        const size = this.buffer.length;

        // Custom Escalating Audio
        this.playDropSound(size);

        // TTS Warning Triggers
        if (size === 4) KC.core.announce("Warning.");
        if (size === 5) KC.core.announce("Critical.");

        if (size === 1) {
            this.buffer[0].activeTime = Date.now();
            this.speakTarget(char);
        }

        this.render();

        if (size >= this.maxSize) {
            this.triggerOverflow();
            return;
        }

        if (this.dropTimer) clearTimeout(this.dropTimer);
        this.dropTimer = setTimeout(() => this.triggerDrop(), this.currentSpeed);
    },

    handleInput: function(e) {
        // v3.42.2: S4 Ghost-Key Filter. Must be the absolute first gate.
        if (e.repeat) return;

        if (!this.isActive) return;
        const inputChar = e.key.toLowerCase();
        
        if (inputChar === "escape") return;
        if (["shift", "control", "alt", "capslock", "tab", "meta"].includes(e.key.toLowerCase())) return;

        if (inputChar === " ") {
            if (this.buffer.length > 0) {
                KC.core.announce(`Queue at ${this.buffer.length}. Target is ${this.buffer[0].char.toUpperCase()}`);
            } else {
                KC.core.announce("Buffer empty.");
            }
            return;
        }

        if (this.buffer.length > 0) {
            const target = this.buffer[0];
            
            if (inputChar === target.char) {
                // Correct
                KC.state.stats.totalKeys++;
                KC.state.currentStreak++;
                if (KC.state.currentStreak > KC.state.missionMaxStreak) {
                    KC.state.missionMaxStreak = KC.state.currentStreak;
                }
                
                const rt = Date.now() - target.activeTime;
                this.reactionTimes.push(rt);
                this.awardScore(rt);
                
                KC.audio.playSound('success');
                this.buffer.shift(); 
                
                if (this.buffer.length > 0) {
                    this.buffer[0].activeTime = Date.now();
                    this.speakTarget(this.buffer[0].char);
                }
                
                this.checkGameState();
                
            } else {
                // Incorrect
                KC.state.stats.errors++;
                KC.state.currentStreak = 0;
                this.score -= 50; 
                
                KC.audio.playSound('error');
                this.speakTarget(target.char);
            }
        } else {
            KC.audio.playSound('error');
        }
        
        this.render();
    },

    checkGameState: function() {
        const elapsed = Date.now() - this.startTime;
        
        if (elapsed >= this.winTime && this.buffer.length === 0) {
            this.endMission(true);
            return;
        }
        
        this.updatePhase(elapsed);
    },

    updatePhase: function(elapsed) {
        let expectedPhase = 1;
        if (elapsed >= this.phaseDuration * 2) expectedPhase = 3;
        else if (elapsed >= this.phaseDuration) expectedPhase = 2;

        if (expectedPhase > this.phase) {
            this.phase = expectedPhase;
            this.calculateDynamicSpeed();
            KC.core.announce(`Phase ${this.phase} beginning. Calibrated to ${this.currentSpeed} milliseconds.`);
        }
    },

    calculateDynamicSpeed: function() {
        if (this.reactionTimes.length === 0) return;

        const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
        const avgRt = sum / this.reactionTimes.length;
        
        this.reactionTimes = [];

        let newSpeed = avgRt * 1.2; 

        const floor = this.initialSpeed * 0.5;
        const ceiling = this.initialSpeed * 1.2;

        this.currentSpeed = Math.round(Math.max(floor, Math.min(ceiling, newSpeed)));
    },

    awardScore: function(rt) {
        if (rt < 500) {
            this.score += 100; 
        } else if (rt < 1000) {
            this.score += 50;  
        } else {
            this.score += 20;  
        }
    },

    speakTarget: function(char) {
        const isBelle = (KC.state.missionParams && KC.state.missionParams.voice === "Belle");
        let audioKey = "";

        if (isBelle) {
            if (/[0-9]/.test(char)) {
                audioKey = `num_${char}_snu`;
            } else if (/[a-zA-Z]/.test(char)) {
                audioKey = `char_${char.toLowerCase()}_snu`;
            } else {
                const symMapSnu = {
                    "!": "sym_exclamation_point", "@": "sym_at_symbol", "#": "sym_hash",
                    "$": "sym_dollar_sign", "%": "sym_percent", "^": "sym_carat",
                    "&": "sym_ampersand", "*": "sym_asterisk", "(": "sym_open_parenthesis",
                    ")": "sym_closed_parenthesis", "-": "sym_dash", "=": "sym_equals",
                    "/": "sym_forward_slash", "?": "sym_question_mark", "+": "sym_plus"
                };
                if (symMapSnu[char]) {
                    audioKey = `${symMapSnu[char]}_snu`;
                }
            }
        } else {
            audioKey = "char_" + char.toLowerCase();
        }

        if (audioKey && GAME_DATA.audio_bank && GAME_DATA.audio_bank[audioKey]) {
            KC.audio.playSFX(audioKey);
        } else {
            KC.core.announce(char.toUpperCase());
        }
    },

    triggerOverflow: function() {
        this.stop(); 
        
        KC.core.announce("BUFFER OVERFLOW. SYSTEM CRASH.");
        const randSad = Math.floor(Math.random() * 6) + 1;
        KC.audio.playSFX(`8bit_sadness${randSad}`);
        
        setTimeout(() => {
            KC.mission.triggerMissionFail();
        }, 1500);
    },

    endMission: function(success) {
        this.stop(); 
        
        if (success) {
            let performanceKey = (this.score > 2000) ? "triumph" : "neutral";
            const randNum = Math.floor(Math.random() * 6) + 1;
            KC.audio.playSFX(`8bit_${performanceKey}${randNum}`);

            const rewardBlocks = Math.floor(this.score / 100);
            if (rewardBlocks > 0) {
                 KC.state.profile.wallet.data_blocks += rewardBlocks;
                 KC.core.saveProgress();
            }
            
            setTimeout(() => {
                KC.mission.completeLesson();
            }, 4000);
        }
    },

    render: function() {
        const displayBuffer = this.buffer.map(item => item.char).join(" ").toUpperCase();
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const remaining = Math.floor((this.winTime - (Date.now() - this.startTime)) / 1000);
        const safeRem = remaining > 0 ? remaining : (this.winTime/1000);

        let content = `>> DATA DUMP: PHASE ${this.phase} <<\n`;
        content += `TIME REMAINING: ${safeRem}s\n`;
        content += `SCORE: ${this.score}\n`;
        content += `BUFFER LOAD: ${this.buffer.length} / ${this.maxSize}\n\n`;
        content += `[ ${displayBuffer} ]`;
        
        KC.els.displayText.textContent = content;
    }
};

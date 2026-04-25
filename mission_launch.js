/* mission_launch.js - v3.39.5 */
window.KC = window.KC || {};

KC.mission_launch = {
    id: "D00-MISSION-LAUNCH",
    targetCode: "",
    currentIndex: 0,
    timeRemaining: 0,
    score: 0,
    totalKeys: 0,
    errors: 0,
    codesCleared: 0,
    isActive: false,
    state: "WAITING", 
    codeLength: 4,
    zone: "Numbers (Numpad)",
    timerInterval: null,
    
    pools: {
        "Numbers (Numpad)": "0123456789".split(''),
        "Numbers (Number Row)": "0123456789".split(''),
        "Numbers and Alpha": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
        "Numbers and Symbols": "0123456789!@#$%^&*()".split(''),
        "Numbers, Letters and Symbols": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()".split(''),
        "Alpha and Symbols": "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()".split('')
    },

    getCharAudio: function(char) {
        let path = "";
        char = char.toUpperCase();
        const isBelle = (KC.state.missionParams && KC.state.missionParams.voice === "Belle");

        if (isBelle) {
            let snuKey = "";
            if (/[0-9]/.test(char)) snuKey = `num_${char}_snu`;
            else if (/[A-Z]/.test(char)) snuKey = `char_${char.toLowerCase()}_snu`;
            else {
                const symMapSnu = {
                    "!": "sym_exclamation_point", "@": "sym_at_symbol", "#": "sym_hash",
                    "$": "sym_dollar_sign", "%": "sym_percent", "^": "sym_carat",
                    "&": "sym_ampersand", "*": "sym_asterisk", "(": "sym_open_parenthesis",
                    ")": "sym_closed_parenthesis", "-": "sym_dash", "=": "sym_equals",
                    "/": "sym_forward_slash", "?": "sym_question_mark", "+": "sym_plus"
                };
                if(symMapSnu[char]) snuKey = `${symMapSnu[char]}_snu`;
            }

            if (snuKey && typeof GAME_DATA !== 'undefined' && GAME_DATA.audio_bank && GAME_DATA.audio_bank[snuKey]) {
                return GAME_DATA.audio_bank[snuKey];
            }
        }

        if (typeof AUDIO_MAP !== 'undefined') {
            if (AUDIO_MAP[char]) path = AUDIO_MAP[char];
            else if (AUDIO_MAP[char.toLowerCase()]) path = AUDIO_MAP[char.toLowerCase()];
        }

        if (!path) {
            if (/[0-9]/.test(char)) path = `audio/numbers/num_${char}_am`;
            else if (/[A-Z]/.test(char)) path = `audio/alpha/char_${char.toLowerCase()}_ame`;
            else {
                const symMap = {
                    "!": "sym_exclamation_point_am", "@": "sym_at_symbol_am", "#": "sym_hash_am",
                    "$": "sym_dollar_sign_am", "%": "sym_percent_am", "^": "sym_carat_am",
                    "&": "sym_ampersand_am", "*": "sym_asterisk_am", "(": "sym_open_parenthesis_am",
                    ")": "sym_close_parenthesis_am"
                };
                if(symMap[char]) path = `audio/symbols/${symMap[char]}`;
            }
        }
        return path;
    },

    init: function(config) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        this.isActive = true;
        this.score = 0;
        this.totalKeys = 0;
        this.errors = 0;
        this.codesCleared = 0;
        this.timeRemaining = config.time || 120;
        this.codeLength = config.codeLength || 4;
        this.zone = config.zone || "Numbers (Numpad)";
        this.currentIndex = 0;
        this.state = "WAITING";
        
        // v3.39.4: Diagnostic and ARIA Tracking
        this.lastDiagKey = "";
        this.lastDiagTime = 0;
        this.ariaToggle = false; 
        
        KC.core.updateStatusBar(`LAUNCH CODES | SCORE: 0 | TIME: ${this.timeRemaining}`);
        KC.els.displayText.innerHTML = `MISSION: LAUNCH CODES<br>Press SPACE to dictate the first code.<br>Press DOWN ARROW to repeat code (-10s penalty).`;
        
        KC.core.announce("Launch Codes mission initialized. Press Space to dictate the first code.");
    },

    start: function() {
        this.state = "STARTING";
        if (KC.audio && KC.audio.playSound) KC.audio.playSound('powerup');
        KC.core.announce("Intercepting launch codes. Stand by.");
        this.startTimer();
        setTimeout(() => this.generateCode(), 1500);
    },

    startTimer: function() {
        this.timerInterval = setInterval(() => {
            if(!this.isActive) return;
            this.timeRemaining--;
            if(this.timeRemaining <= 0) {
                this.endMission();
            } else {
                KC.core.updateStatusBar(`LAUNCH CODES | SCORE: ${this.score} | TIME: ${this.timeRemaining}`);
                
                // v3.39.5: Alert Double-Beep countdown sequence
                const t = this.timeRemaining;
                if (t === 15 || t === 10 || (t <= 5 && t > 0)) {
                    if (KC.audio && KC.audio.playSynth) KC.audio.playSynth(16);
                }
            }
        }, 1000);
    },

    generateCode: function() {
        const pool = this.pools[this.zone] || this.pools["Numbers (Numpad)"];
        this.targetCode = "";
        for(let i = 0; i < this.codeLength; i++) {
            this.targetCode += pool[Math.floor(Math.random() * pool.length)];
        }
        this.currentIndex = 0;
        this.state = "DICTATING";
        this.updateDisplay();
        this.dictateCode();
    },

    dictateCode: function() {
        if(!this.isActive) return;
        
        let str = this.targetCode;
        let chunks = [];
        let i = 0;
        while(i < str.length) {
            let chunkSize = (str.length - i === 4) ? 2 : 3;
            if(str.length === 4) chunkSize = 2;
            chunks.push(str.slice(i, i + chunkSize));
            i += chunkSize;
        }

        let sequence = [];
        
        // v3.33.0: Initial 1200ms delay before dictation begins (+200ms additional SR buffer)
        sequence.push({ type: 'pause', val: 1200 });
        
        chunks.forEach((chunk, cIndex) => {
            for(let char of chunk) {
                sequence.push({ type: 'char', val: char });
            }
            if(cIndex < chunks.length - 1) {
                sequence.push({ type: 'pause', val: 200 });
            }
        });

        this.playAudioSequence(sequence, 0);
    },

    playAudioSequence: function(seq, index) {
        // v3.26.2: Strict abort if mission ends mid-dictation
        if(!this.isActive) return; 
        
        if(index >= seq.length) {
            this.state = "TYPING";
            return;
        }
        let item = seq[index];
        if(item.type === 'pause') {
            setTimeout(() => this.playAudioSequence(seq, index + 1), item.val);
        } else {
            let audioPath = this.getCharAudio(item.val);
            if (audioPath) {
                if(!audioPath.endsWith(".mp3")) audioPath += ".mp3";
                let snd = new Audio(audioPath);
                snd.volume = 1.0;
                snd.play().catch(e => {
                    console.warn("Audio playback failed, using fallback TTS.");
                    KC.core.announce(item.val);
                });
            } else {
                KC.core.announce(item.val); 
            }
            
            let charDelay = 500;
            if (!/[a-zA-Z0-9]/.test(item.val)) {
                charDelay = 1000;
            }
            setTimeout(() => this.playAudioSequence(seq, index + 1), charDelay);
        }
    },

    handleInput: function(e) {
        if(!this.isActive) return;

        // v3.39.4: Diagnostic Trap (Does NOT block input)
        const now = Date.now();
        const delta = now - this.lastDiagTime;
        if (e.key === this.lastDiagKey && delta < 60) {
            KC.core.announce(`Duplicate detected. Gap was ${delta} milliseconds.`);
        }
        this.lastDiagKey = e.key;
        this.lastDiagTime = now;

        if (e.key === " ") {
            if(!this.timerInterval && this.state === "WAITING") {
                this.start();
                return;
            }
            if(this.state === "DONE" || this.state === "FAILED") {
                this.generateCode();
            }
            return;
        }

        if(this.state === "DICTATING" || this.state === "DONE" || this.state === "FAILED" || this.state === "WAITING") return;

        if (e.key === "ArrowDown") {
            this.timeRemaining -= 10;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.endMission();
                return;
            }
            
            KC.core.announce("Time penalty. Repeating code.");
            KC.core.updateStatusBar(`LAUNCH CODES | SCORE: ${this.score} | TIME: ${this.timeRemaining}`);
            this.state = "DICTATING";
            this.dictateCode();
            return;
        }

        if (e.key.length === 1) {
            if(this.zone === "Numbers (Numpad)" && !e.code.startsWith("Numpad")) {
                if(KC.audio && KC.audio.playSound) KC.audio.playSound('error');
                return;
            }
            if(this.zone === "Numbers (Number Row)" && !e.code.startsWith("Digit")) {
                if(KC.audio && KC.audio.playSound) KC.audio.playSound('error');
                return;
            }
            
            this.totalKeys++;
            let typedChar = e.key.toUpperCase();
            let targetChar = this.targetCode[this.currentIndex].toUpperCase();
            
            if (typedChar === targetChar) {
                this.currentIndex++;
                if (this.currentIndex === this.targetCode.length) {
                    this.state = "DONE";
                    this.codesCleared++;
                    
                    // v3.39.4: ARIA Mutation Toggle
                    this.ariaToggle = !this.ariaToggle;
                    const successMsg = this.ariaToggle ? "Code accepted. Press Space for next code." : "Code verified. Press Space for next code.";
                    KC.core.announce(successMsg);
                    
                    if(KC.audio && KC.audio.playSound) KC.audio.playSound('powerup');
                    this.score += (this.targetCode.length * 10);
                } else {
                    if(KC.audio && KC.audio.playSound) KC.audio.playSound('click');
                }
            } else {
                this.state = "FAILED";
                this.errors++;
                // v3.39.5: Verbose error reporting
                KC.core.announce(`Code rejected. Expected ${targetChar}, but received ${typedChar}. Press Space for next code.`);
                if(KC.audio && KC.audio.playSound) KC.audio.playSound('error');
            }
            this.updateDisplay();
        }
    },

    updateDisplay: function() {
        let displayHTML = `MISSION: LAUNCH CODES<br><br>`;
        displayHTML += `TARGET: [ENCRYPTED]<br>`;
        
        let typedPart = this.targetCode.substring(0, this.currentIndex);
        
        if (this.state === "FAILED") {
            displayHTML += `INPUT: ${typedPart}[X] - REJECTED<br><br>Press SPACE for next code.`;
        } else if (this.state === "DONE") {
            displayHTML += `INPUT: ${typedPart} - ACCEPTED<br><br>Press SPACE for next code.`;
        } else {
            displayHTML += `INPUT: ${typedPart}_`;
        }
        
        KC.els.displayText.innerHTML = displayHTML;
    },

    endMission: function() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        if (KC.mission) KC.mission.activeHandler = null;

        // Triple-Staggered Spatial Explosion Sequence
        const availableExplosions = [1, 2, 3, 4, 5, 6, 7];
        const picks = [];
        while(picks.length < 3) {
            const idx = Math.floor(Math.random() * availableExplosions.length);
            picks.push(availableExplosions.splice(idx, 1)[0]);
        }

        // Shot 1: Center (0) at 0ms
        KC.audio.playPannedSFX(`explode_${picks[0]}`, 0);

        // Shot 2: 60% Left (-0.6) after 300ms (150ms + 150ms injection)
        setTimeout(() => {
            KC.audio.playPannedSFX(`explode_${picks[1]}`, -0.6);
        }, 300);

        // Shot 3: 75% Right (0.75) after 700ms (300ms + 250ms + 150ms injection)
        setTimeout(() => {
            KC.audio.playPannedSFX(`explode_${picks[2]}`, 0.75);
        }, 700);

        let acc = 0;
        if (this.totalKeys > 0) {
            acc = ((this.totalKeys - this.errors) / this.totalKeys) * 100;
        }
        
        let blocksEarned = Math.floor(this.score / 10);
        if (KC.state.profile) {
            KC.state.profile.data_blocks = (KC.state.profile.data_blocks || 0) + blocksEarned;
            KC.core.saveProgress();
        }
        
        KC.state.status = "REPORT";
        KC.state.reportLines = [
            ">> LAUNCH CODES: AFTER ACTION REPORT <<",
            "STATUS: TIME EXPIRED",
            `CODES CLEARED: ${this.codesCleared}`,
            `KEYSTROKES: ${this.totalKeys}`,
            `ERRORS: ${this.errors}`,
            `ACCURACY: ${acc.toFixed(1)}%`,
            `FINAL SCORE: ${this.score}`,
            `REWARD: ${blocksEarned} Data Blocks`,
            `>> NEW BALANCE: ${KC.state.profile ? KC.state.profile.data_blocks : 0} Data Blocks <<`
        ];
        KC.state.reportIndex = 0;
        
        let reportHTML = KC.state.reportLines.join("<br>") + "<br><br>[Up/Down: Review Report | Space: Return to Hub]";
        KC.els.displayText.innerHTML = reportHTML;
        
        setTimeout(() => {
            KC.core.announce(`Time expired. Mission Complete. Final Score: ${this.score}. Earned ${blocksEarned} Data Blocks. Press Space to return to Hub, or Down Arrow to review report.`);
        }, 4000);
    }
};

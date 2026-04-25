/* mission_launch.js - v3.43.2 */
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
    mode: "shadow", // v3.43: 'shadow' (type-along) | 'recall' (wait-for-tone)
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
        // v3.43: Gameplay mode. Defaults to legacy Shadow behavior.
        this.mode = (config.mode === "recall") ? "recall" : "shadow";
        this.currentIndex = 0;
        this.state = "WAITING";
        
        // v3.39.4: Diagnostic and ARIA Tracking
        this.lastDiagKey = "";
        this.lastDiagTime = 0;
        this.ariaToggle = false;

        // v3.39.5-fix: Dictation token. Every call to generateCode/dictateCode bumps this.
        // playAudioSequence aborts if its captured token no longer matches, preventing
        // stale chains from writing state="TYPING" mid-dictation of a newer code.
        this.dictationId = 0;

        // v3.39.6-diag: Forensic ring buffer. Captures every dictation emission and
        // every keystroke comparison. Press F2 during the mission to dump to console.
        this._diag = [];
        this._diagMax = 300;
        
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

    // v3.39.6-diag: Append a structured event to the forensic ring buffer.
    diag: function(type, data) {
        if (!this._diag) this._diag = [];
        const entry = Object.assign({
            t: new Date().toISOString().slice(11, 23),
            type: type,
            state: this.state,
            dictId: this.dictationId,
            idx: this.currentIndex,
            target: this.targetCode
        }, data || {});
        this._diag.push(entry);
        if (this._diag.length > (this._diagMax || 300)) this._diag.shift();
        // Live mirror so nothing is lost if the page crashes before dump.
        try { console.log('[LAUNCH-DIAG]', entry); } catch(_) {}
    },

    dumpDiag: function() {
        const log = this._diag || [];
        const logStr = JSON.stringify(log, null, 2);

        let ta = document.getElementById('diag-dump-area');
        if (!ta) {
            ta = document.createElement('textarea');
            ta.id = 'diag-dump-area';
            ta.style.position = 'absolute';
            ta.style.top = '10%';
            ta.style.left = '10%';
            ta.style.width = '80%';
            ta.style.height = '80%';
            ta.style.zIndex = '9999';
            ta.style.color = '#00ff00';
            ta.style.backgroundColor = '#000';
            ta.setAttribute('aria-label', 'Diagnostic Log output. The text is automatically selected. Press Control C to copy.');
            document.body.appendChild(ta);
        }
        ta.value = logStr;
        ta.style.display = 'block';
        ta.focus();
        ta.select();

        this.isActive = false; 
        KC.core.announce("Diagnostic log ready. The text is selected. Press Control C to copy, then paste it to the AI. Refresh the browser to clear.");
    },

    generateCode: function() {
        // v3.39.5-fix: Invalidate any in-flight dictation chain BEFORE building the new code.
        this.dictationId = (this.dictationId || 0) + 1;
        const pool = this.pools[this.zone] || this.pools["Numbers (Numpad)"];
        this.targetCode = "";
        for(let i = 0; i < this.codeLength; i++) {
            this.targetCode += pool[Math.floor(Math.random() * pool.length)];
        }
        this.currentIndex = 0;
        this.state = "DICTATING";
        this.diag('GENERATE', { note: 'New code built', target: this.targetCode });
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

        // v3.39.5-fix: Capture the current dictation token so the chain can
        // detect if it has been superseded by a newer dictation.
        this.playAudioSequence(sequence, 0, this.dictationId);
    },

    playAudioSequence: function(seq, index, myId) {
        // v3.26.2: Strict abort if mission ends mid-dictation
        if(!this.isActive) return; 

        // v3.39.5-fix: Stale-chain abort. If a newer dictation has started
        // (generateCode or ArrowDown bumped dictationId), this chain is dead.
        if(myId !== this.dictationId) return;
        
        if(index >= seq.length) {
            // v3.39.5-fix: Only promote to TYPING if we're still the active dictation
            // AND the state hasn't been moved elsewhere (e.g. FAILED, DONE, ended).
            if(this.state === "DICTATING") {
                this.state = "TYPING";
                // v3.43: Recall Mode end-of-dictation "Go" cue. Shadow mode plays nothing.
                // v3.43.2: Triple-fire for phase-aligned waveform summing (amplitude boost).
                if (this.mode === "recall" && KC.audio && KC.audio.playSynth) {
                    KC.audio.playSynth(23);
                    KC.audio.playSynth(23);
                    KC.audio.playSynth(23);
                }
            }
            return;
        }
        let item = seq[index];
        if(item.type === 'pause') {
            setTimeout(() => this.playAudioSequence(seq, index + 1, myId), item.val);
        } else {
            let audioPath = this.getCharAudio(item.val);
            // v3.39.6-diag: Log every dictation emission. char = the character the engine
            // BELIEVES it is announcing. path = the audio file actually played. If these
            // disagree with what the user hears, the audio_bank is mismapped.
            this.diag('DICTATE_EMIT', {
                char: item.val,
                path: audioPath || '(TTS fallback)',
                seqIdx: index
            });
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
            setTimeout(() => this.playAudioSequence(seq, index + 1, myId), charDelay);
        }
    },

    handleInput: function(e) {
        // v3.42.1: S4 Ghost-Key Filter. Must be the absolute first gate.
        if (e.repeat) return;

        if(!this.isActive) return;

        // v3.40.3: PageUp accessible dump
        if (e.key === "PageUp") {
            e.preventDefault();
            this.dumpDiag();
            return;
        }

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

        // v3.43.1: S1 Whitelist Guard. Only the two live-input states pass through.
        // STARTING/DICTATING (before tone) are gated by recall mode below; DONE/FAILED/
        // WAITING/STARTING are all correctly rejected here.
        const allow = (this.state === "TYPING" || this.state === "DICTATING");
        if (!allow) return;

        if (e.key === "ArrowDown") {
            this.timeRemaining -= 10;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.endMission();
                return;
            }
            
            KC.core.announce("Time penalty. Repeating code.");
            KC.core.updateStatusBar(`LAUNCH CODES | SCORE: ${this.score} | TIME: ${this.timeRemaining}`);

            // v3.39.5-fix: PRIMARY DESYNC FIX. Re-dictating the same code without
            // resetting currentIndex caused targetCode[N] to be compared against
            // the FIRST char the user heard. Reset position pointer + invalidate
            // any in-flight chain before kicking off the new dictation.
            this.currentIndex = 0;
            this.dictationId = (this.dictationId || 0) + 1;
            this.state = "DICTATING";
            this.updateDisplay();
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

            // v3.43: RECALL MODE — Early Launch Penalty.
            // In recall mode, any zone-valid keystroke fired during DICTATING is an
            // early launch: -10s, wipe input buffer (currentIndex = 0), buzz, and
            // announce. The audio dictation is NOT aborted; the user must wait for
            // the synth_23 "Go" cue and re-type the code from the start.
            // Sentinel S2: dictationId is intentionally NOT bumped — we want the
            // current chain to keep running so the cue still fires at the end.
            // Sentinel S3: currentIndex reset to 0 to keep evaluation aligned.
            if (this.mode === "recall" && this.state === "DICTATING") {
                this.timeRemaining -= 10;
                if (this.timeRemaining <= 0) {
                    this.timeRemaining = 0;
                    this.endMission();
                    return;
                }
                this.currentIndex = 0;
                this.diag('EARLY_LAUNCH', { rawKey: e.key, rawCode: e.code });
                KC.core.updateStatusBar(`LAUNCH CODES | SCORE: ${this.score} | TIME: ${this.timeRemaining}`);
                if (KC.audio && KC.audio.playSound) KC.audio.playSound('error');
                KC.core.announce("Early launch! 10 second penalty.");
                this.updateDisplay();
                return;
            }

            this.totalKeys++;
            let typedChar = e.key.toUpperCase();
            let targetChar = this.targetCode[this.currentIndex].toUpperCase();

            // v3.39.6-diag: Log every comparison. This is the smoking gun row.
            this.diag('KEY_COMPARE', {
                typed: typedChar,
                expected: targetChar,
                rawKey: e.key,
                rawCode: e.code,
                match: (typedChar === targetChar)
            });
            
            if (typedChar === targetChar) {
                this.currentIndex++;
                if (this.currentIndex === this.targetCode.length) {
                    this.state = "DONE";
                    this.codesCleared++;

                    // v3.40.4: If the user out-typed the dictation, kill the
                    // remaining audio chain so it doesn't bleed over the
                    // success announcement.
                    this.dictationId = (this.dictationId || 0) + 1;
                    
                    // v3.39.4: ARIA Mutation Toggle
                    this.ariaToggle = !this.ariaToggle;
                    const successMsg = this.ariaToggle ? "Code accepted. Press Space for next code." : "Code verified. Press Space for next code.";
                    KC.core.announce(successMsg);
                    
                    if(KC.audio && KC.audio.playSound) KC.audio.playSound('powerup');
                    this.score += (this.targetCode.length * 10);
                } else {
                    // v3.40.4: Suppress per-keystroke click while audio is still
                    // dictating, so type-along doesn't crowd the announcement channel.
                    if(this.state !== "DICTATING" && KC.audio && KC.audio.playSound) {
                        KC.audio.playSound('click');
                    }
                }
            } else {
                this.state = "FAILED";
                this.errors++;

                // v3.40.4: Kill any in-flight dictation chain so remaining digits
                // don't keep announcing over the rejection message.
                this.dictationId = (this.dictationId || 0) + 1;

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

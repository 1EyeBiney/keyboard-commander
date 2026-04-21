/* mission_race.js - v2.91 */

KC.handlers.race = {
    // State
    // sequence: [], // v2.77: Replaced with getNextWord
    currentIndex: 0,
    playerScore: 0,
    ckScore: 0,
    inputBuffer: "",
    currentWord: "", // v2.77
    
    // Stats Tracking
    startTime: 0,
    totalKeys: 0,
    errors: 0,
    
    // AI State
    ckTimer: null,
    ckProgress: 0,
    ckSpeed: 600, // ms per keystroke
    
    // Settings
    isActive: false,

    start: function(lesson) {
        this.isActive = true;
        this.playerScore = 0;
        this.ckScore = 0;
        this.currentIndex = 0;
        this.inputBuffer = "";
        this.startTime = Date.now();
        this.totalKeys = 0;
        this.errors = 0;
        
        KC.state.currentStreak = 0;
        KC.state.missionMaxStreak = 0;
        
        const diff = KC.state.missionParams.difficulty || 1;
        this.ckSpeed = 2400 - (diff * 400); 
        
        const modeParams = KC.state.missionParams || {};
        const rMode = modeParams.regionMode || 0;
        
        // v2.85: Smart Voice Routing & Strict Universal Junie Enforcement
        const allAudioKeys = Object.keys(GAME_DATA.audio_bank).filter(k => k.startsWith('word_'));
        
        let pool = [];
        this.audioMap = {}; 

        for (let k of allAudioKeys) {
            // Extract the raw text word
            let rawWord = k.replace('word_ju_', '').replace('word_', '').replace('_ju', '');
            let isJunie = k.includes('_ju');
            
            // Universal Enforcement: ALL words in this mission MUST be a Junie recording
            if (!isJunie) continue;
            
            // --- v3.21.2 FIX: Correctly pass the "race" string to target the proper array ---
            if (KC.mission.isWordInZone(rawWord, rMode, "race")) {
                if (!pool.includes(rawWord)) {
                    pool.push(rawWord);
                }
                // Save the exact audio key so the engine knows which mp3 to play
                this.audioMap[rawWord] = k; 
            }
        }
        
        if (pool.length === 0) pool = ["error", "empty", "pool"];

        // v2.84: No-Repeat Shuffle Bag Logic & Dynamic Length
        this.sequence = [];
        let shuffleBag = [];
        const targetLength = lesson.drill_length || 20;

        for (let i = 0; i < targetLength; i++) {
            // Refill the bag if it is empty
            if (shuffleBag.length === 0) {
                shuffleBag = [...pool];
            }
            
            // Pull a random word from the bag and remove it
            const randIdx = Math.floor(Math.random() * shuffleBag.length);
            const selectedWord = shuffleBag.splice(randIdx, 1)[0];
            
            this.sequence.push(selectedWord);
        }

        // Sync sessionPool for getNextWord compatibility
        this.sessionPool = [...this.sequence];
        this.currentWords = pool; 

        this.render();
        this.startRound();
    },

    getNextWord: function() {
        if (!this.sessionPool || this.sessionPool.length === 0) {
            this.sessionPool = [...this.currentWords]; 
        }
        if (this.sessionPool.length === 0) return "error";
        const randomIndex = Math.floor(Math.random() * this.sessionPool.length);
        return this.sessionPool.splice(randomIndex, 1)[0];
    },

    startRound: function() {
        if (!this.isActive) return;
        
        KC.state.status = "ACTIVE_TYPING"; 
        
        if (this.currentIndex >= (KC.state.activeLesson.drill_length || 14)) {
            this.endRace();
            return;
        }

        const word = this.getNextWord();
        if (!word || word === "error") {
            this.endRace(); // End if no words are available
            return;
        }
        this.currentWord = word;
        this.inputBuffer = "";
        this.ckProgress = 0;
        
        // v2.85: Use the audioMap to play the correct voice actor
        let audioKey = "word_" + this.currentWord;
        if (this.audioMap && this.audioMap[this.currentWord]) {
            audioKey = this.audioMap[this.currentWord];
        }

        KC.audio.playAudio(audioKey, this.currentWord.toUpperCase(), () => {
            this.render();
            this.runCKBehavior(this.currentWord);
            this.spellWord(this.currentWord, this.currentIndex);
        });
    },

    spellWord: function(word, roundIndex) {
        let delay = 0;
        this.spellTimers = this.spellTimers || [];
        for (let i = 0; i < word.length; i++) {
            const timer = setTimeout(() => {
                if (this.isActive && this.currentIndex === roundIndex && KC.state.status === "ACTIVE_TYPING") {
                    KC.audio.playSFX("char_" + word[i]);
                }
            }, delay);
            this.spellTimers.push(timer);
            delay += 400; // 400ms delay between letters
        }
    },

    runCKBehavior: function(word) {
        if (this.ckTimer) clearTimeout(this.ckTimer);
        
        const tick = () => {
            if (!this.isActive || KC.state.status !== "ACTIVE_TYPING") return;
            
            // v1.72.6: Hesitation Logic
            if (Math.random() < 0.3) {
                 const mutterKeys = [
                     "ck_mut_ack1", "ck_mut_ack2", "ck_mut_ah1", "ck_mut_ah2",
                     "ck_mut_foo1", "ck_mut_hmm1", "ck_mut_hmm2", "ck_mut_ick1",
                     "ck_mut_oh1", "ck_mut_oh2", "ck_mut_oh3",
                     "ck_mut_umm1", "ck_mut_umm2", "ck_mut_umm3", "ck_mut_umm4",
                     "ck_mut_woah1", "ck_mut_woah2"
                 ];
                 const randKey = mutterKeys[Math.floor(Math.random() * mutterKeys.length)];
                 KC.audio.playSFX(randKey);
                 
                 this.ckTimer = setTimeout(tick, this.ckSpeed * 0.6);
                 return; 
            }
            
            this.ckProgress++;
            const charIndex = this.ckProgress - 1;
            if (charIndex < word.length) {
                const char = word[charIndex];
                if (GAME_DATA.audio_bank["ck_char_" + char]) {
                     KC.audio.playSFX("ck_char_" + char);
                }
                
                // v2.69: Increased delay slightly to 120ms so the key click is clearly audible AFTER CK speaks the letter
                setTimeout(() => {
                    if (!this.isActive || KC.state.status !== "ACTIVE_TYPING") return;
                    const keyNum = Math.floor(Math.random() * 7) + 1;
                    KC.audio.playSFX("sfx_key_" + keyNum);
                }, 120);
            }

            this.render();

            if (this.ckProgress >= word.length) {
                this.resolveRound("CK");
            } else {
                this.ckTimer = setTimeout(tick, this.ckSpeed);
            }
        };

        this.ckTimer = setTimeout(tick, this.ckSpeed);
    },

    handleInput: function(e) {
        if (!this.isActive) return;

        if (e.key === " " || e.key === "Enter") {
            const target = this.currentWord;
            if (this.inputBuffer.toLowerCase().trim() === target.toLowerCase()) {
                this.resolveRound("PLAYER");
            } else {
                KC.audio.playSound('error');
                this.errors++;
                this.inputBuffer = "";
                this.render();
            }
            return;
        }

        if (e.key === "Backspace") {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
            KC.audio.playSound('click');
            this.render();
            return;
        }

        if (e.key.length === 1) {
            this.inputBuffer += e.key;
            this.totalKeys++;
            KC.audio.playSound('click');
            this.render();
        }
    },

    resolveRound: function(winner) {
        if (this.ckTimer) clearTimeout(this.ckTimer);
        
        if (winner === "PLAYER") {
            this.playerScore++;
            
            // v1.74.0: Streak Tracking (Words Won)
            KC.state.currentStreak++;
            if (KC.state.currentStreak > KC.state.missionMaxStreak) {
                KC.state.missionMaxStreak = KC.state.currentStreak;
            }
            
            KC.audio.playSound('success');
        } else {
            this.ckScore++;
            
            // v1.74.0: Streak Reset
            KC.state.currentStreak = 0;
            
            KC.audio.playSound('failure'); 
            KC.core.announce("Point to Commander.");
        }

        this.currentIndex++;
        setTimeout(() => this.startRound(), 500);
    },

    endRace: function(aborted = false) {
        this.isActive = false;
        
        // Clear all ghost audio timers
        if (this.ckTimer) clearTimeout(this.ckTimer);
        if (this.spellTimers) {
            this.spellTimers.forEach(t => clearTimeout(t));
            this.spellTimers = [];
        }
        
        // Stats Calculation
        const durationMs = Date.now() - this.startTime;
        const durationMin = durationMs / 60000;
        const wpm = durationMin > 0 ? Math.round((this.totalKeys / 5) / durationMin) : 0;
        const acc = this.totalKeys > 0 ? Math.round(((this.totalKeys - this.errors) / this.totalKeys) * 100) : 0;
        
        // Time String
        const totalSec = Math.floor(durationMs / 1000);
        const mm = Math.floor(totalSec / 60);
        const ss = totalSec % 60;
        const timeStr = `${mm}m ${ss}s`;
        
        // Grade Calculation
        const grade = KC.mission.calculateGrade(acc, wpm);
        
        KC.state.stats.errors = this.errors; 
        KC.state.stats.totalKeys = this.totalKeys;

        let result = "DRAW";
        let audioCue = "ck_begrudge"; 
        let rewardLog = [];
        
        const scoreString = `(${this.playerScore}-${this.ckScore})`;
        
        if (aborted) {
            result = "ABORTED";
            audioCue = "ck_taunt"; // CK mocks you for fleeing
            rewardLog.push("Mission Aborted. Partial data saved.");
        } else if (this.playerScore > this.ckScore) {
            // WIN
            result = "VICTORY";
            audioCue = "ck_begrudge";
            KC.state.profile.wallet.data_blocks += 50;
            KC.state.profile.wallet.logic_shards += 1;
            rewardLog.push("+50 Data Blocks");
            rewardLog.push("+1 Logic Shard (Superior Win)");
        } else {
            // LOSS / DRAW
            result = "DEFEAT";
            audioCue = "ck_taunt";
            KC.state.profile.wallet.data_blocks += 10;
            KC.state.profile.wallet.glitch += 1; 
            rewardLog.push("+10 Data Blocks (Consolation)");
            rewardLog.push("+1 Glitch Mass (System Corruption)");
        }
        
        KC.core.saveProgress();

        KC.audio.playAudio(audioCue, `${result}. Final Score: You ${this.playerScore}, Commander ${this.ckScore}.`, () => {
             KC.mission.showReportCard(acc, wpm, KC.state.missionMaxStreak, grade, timeStr, "MISSION COMPLETE", rewardLog);
        });
    },

    render: function() {
        if (!this.isActive) return;
        
        const word = this.currentWord || "---";
        
        let html = `<div class="mission-header">>> RACE IN PROGRESS <<</div>`;
        html += `<div class="race-score">YOU: ${this.playerScore} | CK: ${this.ckScore}</div>`;
        html += `<div class="race-arena">`;
        html += `<div class="target-word">${word.toUpperCase()}</div>`;
        html += `<div class="player-lane">YOU: <span class="input-text">${this.inputBuffer}</span></div>`;
        
        const ckText = word.substring(0, this.ckProgress);
        html += `<div class="ck-lane">CK:  <span class="ck-text">${ckText}</span></div>`;
        html += `</div>`;
        html += `<div class="mission-footer">Word ${this.currentIndex + 1} of ${KC.state.activeLesson.drill_length || 14}</div>`;

        KC.els.displayText.innerHTML = html;
    }
};
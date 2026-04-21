/* mission_launch.js - v3.25.0 */
window.KC = window.KC || {};

KC.mission_launch = {
    id: "D00-MISSION-LAUNCH",
    targetCode: "",
    typedCode: "",
    timeRemaining: 0,
    score: 0,
    isActive: false,
    isDictating: false,
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

    init: function(config) {
        this.isActive = true;
        this.score = 0;
        this.timeRemaining = config.time || 120;
        this.codeLength = config.codeLength || 4;
        this.zone = config.zone || "Numbers (Numpad)";
        this.typedCode = "";
        
        KC.core.updateStatusBar(`LAUNCH CODES | SCORE: 0 | TIME: ${this.timeRemaining}`);
        KC.els.displayText.innerHTML = `MISSION: LAUNCH CODES<br>Press SPACE to start decryption sequence.<br>Press DOWN ARROW to repeat code (-10s penalty).`;
        
        KC.core.announce("Launch Codes mission initialized. Press Space to begin decryption.");
    },

    start: function() {
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
            }
        }, 1000);
    },

    generateCode: function() {
        const pool = this.pools[this.zone] || this.pools["Numbers (Numpad)"];
        this.targetCode = "";
        for(let i = 0; i < this.codeLength; i++) {
            this.targetCode += pool[Math.floor(Math.random() * pool.length)];
        }
        this.typedCode = "";
        this.updateDisplay();
        this.dictateCode();
    },

    dictateCode: function() {
        if(!this.isActive) return;
        this.isDictating = true;
        
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
        chunks.forEach((chunk, cIndex) => {
            for(let char of chunk) {
                sequence.push({ type: 'char', val: char });
            }
            if(cIndex < chunks.length - 1) {
                sequence.push({ type: 'pause', val: 400 });
            }
        });

        this.playAudioSequence(sequence, 0);
    },

    playAudioSequence: function(seq, index) {
        if(index >= seq.length || !this.isActive) {
            this.isDictating = false;
            return;
        }
        let item = seq[index];
        if(item.type === 'pause') {
            setTimeout(() => this.playAudioSequence(seq, index + 1), item.val);
        } else {
            KC.core.announce(item.val); 
            setTimeout(() => this.playAudioSequence(seq, index + 1), 700);
        }
    },

    handleInput: function(e) {
        if(!this.isActive) return;

        if(!this.timerInterval && e.key === " ") {
            this.start();
            return;
        }

        if(this.isDictating) return;

        if (e.key === "ArrowDown") {
            this.timeRemaining = Math.max(0, this.timeRemaining - 10);
            KC.core.announce("Time penalty. Repeating code.");
            KC.core.updateStatusBar(`LAUNCH CODES | SCORE: ${this.score} | TIME: ${this.timeRemaining}`);
            this.dictateCode();
            return;
        }

        if (e.key === "Backspace") {
            if(this.typedCode.length > 0) {
                this.typedCode = this.typedCode.slice(0, -1);
                KC.core.playSFX('ui_back');
                this.updateDisplay();
            }
            return;
        }

        if (e.key === " ") {
            if(this.typedCode.length > 0) this.submitCode();
            return;
        }

        if (e.key.length === 1) {
            // Strict Zone Enforcement
            if(this.zone === "Numbers (Numpad)" && !e.code.startsWith("Numpad")) {
                KC.core.playSFX('error');
                return;
            }
            if(this.zone === "Numbers (Number Row)" && !e.code.startsWith("Digit")) {
                KC.core.playSFX('error');
                return;
            }
            this.typedCode += e.key.toUpperCase();
            this.updateDisplay();
        }
    },

    submitCode: function() {
        let correct = 0;
        let target = this.targetCode;
        let typed = this.typedCode;
        let checkLen = Math.max(target.length, typed.length);

        for(let i = 0; i < checkLen; i++) {
            if(target[i] && typed[i] && target[i] === typed[i]) {
                correct++;
            }
        }

        if(correct === target.length && typed.length === target.length) {
            KC.core.announce("Code accepted.");
            KC.core.playSFX('powerup');
            this.score += (target.length * 10);
        } else {
            let errors = target.length - correct;
            if(typed.length > target.length) errors += (typed.length - target.length);
            KC.core.announce(`Code rejected. ${errors} character${errors > 1 ? 's' : ''} incorrect.`);
            KC.core.playSFX('error');
            this.score += (correct * 10);
        }
        
        this.updateDisplay();
        setTimeout(() => this.generateCode(), 1500);
    },

    updateDisplay: function() {
        let displayHTML = `MISSION: LAUNCH CODES<br><br>`;
        displayHTML += `TARGET: [ENCRYPTED]<br>`;
        displayHTML += `INPUT: ${this.typedCode}_`;
        KC.els.displayText.innerHTML = displayHTML;
    },

    endMission: function() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        KC.core.announce(`Mission Complete. Final Score: ${this.score}.`);
        setTimeout(() => KC.hub.renderMenu(), 3000);
    }
};

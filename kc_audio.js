/* kc_audio.js - v3.39.2 */

KC.audio = {
    ctx: null,
    activeAudio: null,
    audioCallback: null,
    
    // Hazard Channel
    hazardNode: null,
    hazardInterval: null,
    
    // Lab Nodes
    testOsc: null,
    testGain: null,
    testPanner: null,
    labTimer: null,

    // Intro Audio
    introNode: null,
    introCallback: null,

    playIntro: function(src, onComplete) {
        this.stopIntro(false);
        if(!src) {
            if(onComplete) onComplete();
            return;
        }
        this.introNode = new Audio(src);
        this.introCallback = onComplete;

        this.introNode.onended = () => {
            if (this.introCallback) {
                let cb = this.introCallback;
                this.introCallback = null;
                cb();
            }
        };

        this.introNode.play().catch(e => {
            console.warn('Intro playback blocked:', e);
            if (this.introCallback) {
                let cb = this.introCallback;
                this.introCallback = null;
                cb();
            }
        });
    },

    clearIntroCallback: function() {
        this.introCallback = null;
    },

    stopIntro: function(executeCallback = false, prefixText = "") {
        let cb = this.introCallback;
        if (this.introNode) {
            this.introNode.pause();
            this.introNode.currentTime = 0;
            this.introNode = null;
        }
        this.introCallback = null;
        if (executeCallback && cb) {
            cb(prefixText);
        }
    },

    init: function() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },

    playSound: function(type) {
        if (!this.ctx) return;
        this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        switch (type) {
            case 'click':
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now+0.05);
                gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.05);
                osc.start(now); osc.stop(now+0.05); break;
            case 'error':
                // Standard Buzz
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now+0.3);
                gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now+0.3);
                osc.start(now); osc.stop(now+0.3); break;
            case 'success':
                // Ascending Major Triad (Victory)
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(440, now);       // A4
                osc.frequency.setValueAtTime(554, now+0.1);   // C#5
                osc.frequency.setValueAtTime(659, now+0.2);   // E5
                gain.gain.setValueAtTime(0.1, now); 
                gain.gain.linearRampToValueAtTime(0, now+0.6);
                osc.start(now); osc.stop(now+0.6); break;
            case 'failure':
                // v1.71.9: Descending Dissonant Tri-Tone (Defeat)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(415, now);       // G#4
                osc.frequency.setValueAtTime(311, now+0.15);  // D#4
                osc.frequency.setValueAtTime(293, now+0.3);   // D4 (Clash)
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0, now+0.7);
                osc.start(now); osc.stop(now+0.7); break;
        }
    },

    playSynth: function(id) {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const ctx = this.ctx;
        
        const playTone = (type, f1, f2, dur, vol) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = type; const now = ctx.currentTime;
            osc.frequency.setValueAtTime(f1, now);
            if (f2) { try { osc.frequency.exponentialRampToValueAtTime(f2, now + dur); } catch(e) { osc.frequency.setValueAtTime(f2, now+dur); } }
            gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now); osc.stop(now + dur);
        };

        const playEcho = (type, f1, f2, dur, vol, del) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            const delay = ctx.createDelay(); const feedback = ctx.createGain();
            osc.type = type; const now = ctx.currentTime;
            osc.frequency.setValueAtTime(f1, now);
            if (f2) { try { osc.frequency.exponentialRampToValueAtTime(f2, now + dur); } catch(e) { osc.frequency.setValueAtTime(f2, now+dur); } }
            gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
            delay.delayTime.value = del; feedback.gain.value = 0.4;
            osc.connect(gain); gain.connect(ctx.destination);
            gain.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(ctx.destination);
            osc.start(now); osc.stop(now + dur);
        };

        const playSequence = (types, freqs, dur, vol) => {
            freqs.forEach((f, i) => {
                setTimeout(() => playTone(types[i]||'sine', f, null, dur, vol), i * (dur * 1000));
            });
        };

        switch(id) {
            case 3: playTone('triangle', 300, 600, 0.15, 0.25); break; // Floor Up
            case 4: playTone('triangle', 600, 300, 0.15, 0.25); break; // Floor Down
            case 17: playTone('sine', 200, 800, 0.4, 0.3); break;      // Power Up
            case 18: playTone('sine', 800, 200, 0.4, 0.3); break;      // Power Down
            case 23: playSequence(['square','square'], [200, 300], 0.1, 0.05); break; // Menu Select
            case 24: playEcho('sine', 800, null, 0.1, 0.4, 0.3); break; // Echo / Lifeboat
            case 30: playEcho('sawtooth', 50, 300, 0.4, 0.1, 0.2); break; // Machine Rev (Cache/Archive)
            case 34: playSequence(['sine','sine','sine'], [600, 600, 600], 0.1, 0.3); break; // Comm Link (Up/Down Region)
            case 57: playEcho('sine', 5000, 100, 0.1, 0.2, 0.1); break; // Spark (Difficulty)
            case 62: playEcho('triangle', 400, 800, 0.1, 0.2, 0.05); break; // Springy Boing (Left/Right Quadrant)
        }
    },

    playSFX: function(key) {
        let path = GAME_DATA.audio_bank[key];
        if (!path) return;
        const sfx = new Audio(path);
        sfx.volume = 1.0; 
        sfx.play().catch(e => console.warn("SFX Fail:", e));
    },

    playPannedSFX: function(key, panValue = 0) {
        let path = GAME_DATA.audio_bank[key];
        if (!path || !this.ctx) return;
        
        try {
            const audio = new Audio(path);
            const source = this.ctx.createMediaElementSource(audio);
            const panner = this.ctx.createStereoPanner();
            
            panner.pan.value = panValue;
            source.connect(panner).connect(this.ctx.destination);
            
            audio.play().catch(e => console.warn("Panned SFX Fail:", e));
        } catch (err) {
            // Fallback for browser node-limit contention
            this.playSFX(key);
        }
    },

    playAudio: function(keyOrPath, fallbackText, callback) {
        let path = keyOrPath;
        if (GAME_DATA.audio_bank[keyOrPath]) path = GAME_DATA.audio_bank[keyOrPath];
        if (!path) {
            KC.core.announce(fallbackText);
            setTimeout(() => { if (callback) callback(); }, 1500);
            return;
        }

        this.stopActiveAudio();
        const audio = new Audio(path);
        audio.volume = 1.0; 
        this.activeAudio = audio;
        this.audioCallback = callback;

        audio.onended = () => {
            this.activeAudio = null;
            if (this.audioCallback) {
                const cb = this.audioCallback;
                this.audioCallback = null;
                cb();
            }
        };

        audio.play().catch(e => {
            console.warn("Audio Play Error:", e);
            KC.core.announce(fallbackText);
            if (this.audioCallback) this.audioCallback();
        });
        
        if (KC.els.statusBar) KC.els.statusBar.textContent = "Audio Active...";
    },

    stopActiveAudio: function() {
        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio.currentTime = 0; 
            this.activeAudio = null;
            this.audioCallback = null; 
        }
        this.stopTestNodes();
    },

    // --- Hazard Loop Logic ---

    startHazardLoop: function(assetId) {
        let path = GAME_DATA.audio_bank[assetId];
        if (!path) return;
        if (this.hazardNode) this.stopHazardLoop(0);

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0; 
        audio.play().catch(e => console.warn("Hazard Loop Fail:", e));
        this.hazardNode = audio;
    },

    setHazardIntensity: function(intensity) {
        if (!this.hazardNode) return;
        if (this.hazardInterval) clearInterval(this.hazardInterval);
        
        const start = this.hazardNode.volume;
        const end = Math.max(0, Math.min(1, intensity));
        const duration = 500;
        const stepTime = 50;
        const steps = duration / stepTime;
        const change = (end - start) / steps;
        let currentStep = 0;
        
        this.hazardInterval = setInterval(() => {
            currentStep++;
            let newVol = start + (change * currentStep);
            newVol = Math.max(0, Math.min(1, newVol));
            if (this.hazardNode) this.hazardNode.volume = newVol;
            if (currentStep >= steps) { clearInterval(this.hazardInterval); this.hazardInterval = null; }
        }, stepTime);
    },

    stopHazardLoop: function(fadeDuration = 2) {
        if (!this.hazardNode) return;
        if (this.hazardInterval) clearInterval(this.hazardInterval);

        if (fadeDuration <= 0) {
            this.hazardNode.pause();
            this.hazardNode = null;
            return;
        }

        const start = this.hazardNode.volume;
        const steps = (fadeDuration * 1000) / 50;
        const change = start / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            let newVol = start - (change * currentStep);
            if (newVol < 0) newVol = 0;
            if (this.hazardNode) this.hazardNode.volume = newVol;
            if (currentStep >= steps || newVol <= 0) {
                clearInterval(fadeInterval);
                if (this.hazardNode) { this.hazardNode.pause(); this.hazardNode = null; }
            }
        }, 50);
    },

    // --- UTILITY ---
    
    playSequence: function(list, delay) {
        let index = 0;
        const next = () => {
            if (index >= list.length) return;
            this.playAudio(list[index], "Seq " + index, () => {
                setTimeout(next, delay);
            });
            index++;
        };
        next();
    },

    playClip: function(key, cb) {
        this.playAudio(key, key, cb);
    },

    speakTTS: function(text) {
        KC.core.announce(text);
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utter);
        }
    },

    stopTestNodes: function() {
        if (this.testOsc) {
            try { this.testOsc.stop(); } catch(e){}
            this.testOsc = null;
        }
        if (this.labTimer) { clearTimeout(this.labTimer); this.labTimer = null; }
    },

    // --- PHASE 1 TESTS ---

    // Test 1: Concatenation
    runConcatenationTest: function() {
        this.stopActiveAudio();
        KC.core.announce("Concatenation Test.");
        this.playSequence(["word_alpha", "word_hotel", "word_golf"], 150);
    },

    // Test 2: Latency
    runLatencyTest: function() {
        this.stopActiveAudio();
        KC.core.announce("Latency Test.");
        setTimeout(() => {
             this.playClip("word_semicolon");
        }, 500);
    },

    // Test 3: TTS
    runTTSTest: function() {
        this.stopActiveAudio();
        KC.core.announce("Speech Synthesis Test.");
        setTimeout(() => {
            this.speakTTS("Ship Computer Online. Systems Nominal.");
        }, 1000);
    },

    // --- PHASE 2 TESTS ---

    runStereoTest: function() {
        if (!this.ctx) return;
        this.stopTestNodes();
        KC.core.announce("Testing Left Channel.");

        const playPan = (panVal, time, callback) => {
            this.labTimer = setTimeout(() => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const panner = this.ctx.createStereoPanner();
                
                osc.type = 'sine';
                osc.frequency.value = 440; // A4
                panner.pan.value = panVal;
                gain.gain.value = 0.2;
                
                osc.connect(gain).connect(panner).connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.5);
                
                if (callback) callback();
            }, time);
        };

        playPan(-1, 500, () => {
            KC.core.announce("Testing Right Channel.");
            playPan(1, 1500, () => {
                KC.core.announce("Center Channel.");
                playPan(0, 1500, null);
            });
        });
    },

    runFrequencyTest: function() {
        if (!this.ctx) return;
        this.stopTestNodes();
        
        const playFreq = (freq, name, time, callback) => {
            this.labTimer = setTimeout(() => {
                KC.core.announce(name);
                setTimeout(() => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.value = 0.1;
                    osc.connect(gain).connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.5);
                    if (callback) callback();
                }, 800);
            }, time);
        };

        playFreq(100, "Low Frequency 100 Hertz", 0, () => {
            playFreq(500, "Mid Frequency 500 Hertz", 1500, () => {
                playFreq(1000, "High Frequency 1000 Hertz", 1500, null);
            });
        });
    },

    runDynamicTest: function() {
        if (!this.ctx) return;
        this.stopTestNodes();

        const playVol = (vol, name, time, callback) => {
            this.labTimer = setTimeout(() => {
                KC.core.announce(name);
                setTimeout(() => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 300;
                    gain.gain.value = vol;
                    osc.connect(gain).connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.5);
                    if (callback) callback();
                }, 1000);
            }, time);
        };

        playVol(0.01, "Minimum Volume 1 percent", 0, () => {
            playVol(0.1, "Moderate Volume 10 percent", 2000, () => {
                playVol(0.5, "Maximum Test Volume 50 percent", 2000, null);
            });
        });
    }
};
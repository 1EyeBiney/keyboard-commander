/* kc_core.js - V1.70.0 */

window.KC = {
    state: {
        status: "BOOT", 
        profile: null,
        nagTimer: null,
        menuSelection: 0,
        fabCategoryIndex: 0,
        fabItemIndex: 0,
        engCategoryIndex: 0,
        engItemIndex: 0,
        reportLines: [],
        reportIndex: 0,
        arcade: { tab: 0, index: 0 },
        cache: { tab: 0, index: 0 },
        activeLesson: null,
        pointer: 0,
        currentPrompt: "",
        stats: { startTime: 0, totalKeys: 0, errors: 0 },
        currentStreak: 0,
        missionMaxStreak: 0,
        missionState: { autoCorrectUsed: false, streamBuffer: [], lastStreamTime: 0 }
    },
    
    els: {},
    audio: {},
    hub: {},
    mission: {},
    input: {},
    tutorial: {} 
};

KC.core = {
    // v1.70.0: Incremented storage key for Echo Chamber update
    STORAGE_KEY: 'kbc_save_v1_70',

    init: function() {
        KC.els.header = document.getElementById('game-header');
        KC.els.footer = document.getElementById('game-footer');
        KC.els.bootScreen = document.getElementById('boot-screen');
        KC.els.gameTerminal = document.getElementById('game-terminal');
        KC.els.displayText = document.getElementById('display-text');
        KC.els.statusBar = document.getElementById('status-bar');
        KC.els.liveRegion = document.getElementById('live-region');
        KC.els.inputTrap = document.getElementById('input-trap');
        KC.els.btnInit = document.getElementById('btn-init');

        if (KC.els.btnInit) {
            KC.els.btnInit.addEventListener('click', () => {
                this.bootSystem();
            });
        }

        KC.audio.init();
        KC.input.init();
        this.loadProgress();
    },

    bootSystem: function() {
        if (KC.audio.ctx && KC.audio.ctx.state === 'suspended') {
            KC.audio.ctx.resume();
        }
        
        KC.els.bootScreen.hidden = true;
        KC.els.gameTerminal.hidden = false;
        KC.els.header.hidden = false;
        KC.els.footer.hidden = false;
        
        KC.els.inputTrap.focus();
        
        if (KC.state.profile.currentLessonIndex === 0) {
            KC.mission.loadLesson(0);
        } else {
            KC.hub.renderMenu();
        }
    },

    loadProgress: function() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                KC.state.profile = JSON.parse(saved);
            } catch (e) {
                console.error("Save Corrupt:", e);
                this.resetProgress();
            }
        } else {
            this.resetProgress();
        }
        this.updateStatusBar();
    },

    saveProgress: function() {
        if (KC.state.profile) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(KC.state.profile));
            this.updateStatusBar();
        }
    },

    resetProgress: function() {
        KC.state.profile = {
            rank: "Cadet",
            currentDeck: 0,
            currentLessonIndex: 0,
            wallet: { data_blocks: 0, logic_shards: 0, sync_sparks: 0, glitch: 0 },
            inventory: { patches: 0 },
            mission_records: {},
            career: { total_keys: 0, total_errors: 0, missions_completed: 0, playtime_seconds: 0, highest_streak: 0 }
        };
        this.saveProgress();
        KC.core.announce("System Reset. Profile Cleared.");
        setTimeout(() => {
            location.reload();
        }, 1000);
    },

    updateStatusBar: function() {
        if (KC.els.statusBar && KC.state.profile) {
            const w = KC.state.profile.wallet;
            KC.els.statusBar.textContent = `Deck: ${KC.state.profile.currentDeck} | Data: ${w.data_blocks} | Logic: ${w.logic_shards} | Glitch: ${w.glitch}`;
        }
    },

    announce: function(text, isAssertive = false) {
        if (KC.els.liveRegion) {
            const mode = isAssertive ? 'assertive' : 'polite';
            if (KC.els.liveRegion.getAttribute('aria-live') !== mode) {
                KC.els.liveRegion.setAttribute('aria-live', mode);
            }
            KC.els.liveRegion.innerText = text;
        }
    },

    startNagTimer: function(message) {
        this.stopNagTimer();
        let delay = (KC.state.status === "ACTIVE_TYPING") ? 6000 : 12000;
        
        KC.state.nagTimer = setTimeout(() => {
            const isHubMessage = message && (message.includes("Press G") || message.includes("access the Deck menu"));
            
            if (isHubMessage && KC.state.status !== "HUB") {
                return; 
            }

            if (message) this.announce(message);
            else this.announce("Waiting for input.");
        }, delay); 
    },

    stopNagTimer: function() {
        if (KC.state.nagTimer) { clearTimeout(KC.state.nagTimer); KC.state.nagTimer = null; }
    },

    hasUpgrade: function(id) {
        return false;
    }
};

window.onload = function() {
    KC.core.init();
};
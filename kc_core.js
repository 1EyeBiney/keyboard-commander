/* kc_core.js - V1.70.0 */

window.KC = {
    state: {
        status: "BOOT", 
        profile: null,
        roster: [],
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
    ROSTER_KEY: 'kbc_roster',
    SAVE_PREFIX: 'kbc_profile_',

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
        KC.hub.renderMenu();
    },

    loadProgress: function() {
        this.loadRoster();
        this.updateStatusBar();
    },

    saveProgress: function() {
        if (!KC.state.profile || !KC.state.profile.name) return;
        localStorage.setItem(this.SAVE_PREFIX + KC.state.profile.name, JSON.stringify(KC.state.profile));
    },

    loadRoster: function() {
        const saved = localStorage.getItem(this.ROSTER_KEY);
        KC.state.roster = saved ? JSON.parse(saved) : [];
    },

    createProfile: function(name) {
        const newProfile = {
            name: name,
            rank: "Cadet",
            currentLessonID: "D00-01",
            currentDeck: 0,
            settings: { theme: "matrix", font_size: "100", bgm_style: "default", bgm_volume: 10 },
            wallet: { data_blocks: 0, logic_shards: 0, sync_sparks: 0, consecutive_coins: 0, glitch: 0 },
            career: { startTime: Date.now(), totalKeys: 0, errors: 0, missions_completed: 0, history_buffer: [], zone_stats: {} }
        };
        KC.state.profile = newProfile;
        if (!KC.state.roster.includes(name)) {
            KC.state.roster.push(name);
            localStorage.setItem(this.ROSTER_KEY, JSON.stringify(KC.state.roster));
        }
        this.saveProgress();
    },

    loadProfile: function(name) {
        const saved = localStorage.getItem(this.SAVE_PREFIX + name);
        if (saved) {
            KC.state.profile = JSON.parse(saved);
            if (!KC.state.profile.career.history_buffer) KC.state.profile.career.history_buffer = [];
            if (!KC.state.profile.career.zone_stats) KC.state.profile.career.zone_stats = {};
            if (!KC.state.profile.settings) KC.state.profile.settings = { theme: "matrix", font_size: "100", bgm_style: "default", bgm_volume: 10 };
            if (!KC.state.profile.settings.theme) KC.state.profile.settings.theme = "matrix";
            if (!KC.state.profile.settings.font_size) KC.state.profile.settings.font_size = "100";
            
            // --- Migration Patch for v3.9.1 ---
            if (typeof KC.state.profile.currentLessonIndex !== 'undefined') {
                KC.state.profile.currentLessonID = "D00-01"; // Reset to start of Deck 0
                delete KC.state.profile.currentLessonIndex;
            }
        } else {
            this.createProfile(name);
        }
    },

    deleteProfile: function(name) {
        KC.state.roster = KC.state.roster.filter(p => p !== name);
        localStorage.setItem(this.ROSTER_KEY, JSON.stringify(KC.state.roster));
        localStorage.removeItem(this.SAVE_PREFIX + name);
        this.announce(`Profile ${name} deleted.`);
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

KC.dev = {
    active: false,
    cursor: 0,
    previousStatus: null,
    options: [
        "Close Console",
        "Warp to Deck 0",
        "Unlock All Missions",
        "Add 10000 Credits",
        "Add 10000 EXP",
        "Clear Save Data"
    ],
    toggleConsole: function() {
        this.active = !this.active;
        let el = document.getElementById('dev-console');
        if (this.active) {
            this.previousStatus = KC.state.status;
            KC.state.status = "DEV_CONSOLE";
            this.cursor = 0;
            this.render();
        } else {
            KC.state.status = this.previousStatus;
            KC.core.announce("Console closed.");
            if (el) el.style.display = 'none';
            if (KC.state.status === "HUB" && KC.hub) KC.hub.render();
        }
    },
    moveCursor: function(dir) {
        this.cursor += dir;
        if (this.cursor < 0) this.cursor = this.options.length - 1;
        if (this.cursor >= this.options.length) this.cursor = 0;
        this.render();
    },
    executeAction: function() {
        switch(this.cursor) {
            case 0: // Close
                this.toggleConsole();
                break;
            case 1: // Warp
                this.toggleConsole();
                KC.core.announce("Warping to Deck 0.");
                if (KC.hub) KC.hub.enterHub();
                break;
            case 2: // Unlock
                if (KC.state.profile) KC.state.profile.currentDeck = 99; 
                KC.core.announce("All missions unlocked.");
                break;
            case 3: // Currencies
                if (KC.state.profile) {
                    if (!KC.state.profile.wallet) {
                        KC.state.profile.wallet = { credits: 0, dataBlocks: 0, components: 0 };
                    }
                    KC.state.profile.wallet.credits += 10000;
                    KC.state.profile.wallet.dataBlocks += 10000;
                    KC.state.profile.wallet.components += 10000;
                }
                KC.core.announce("Ten thousand units added to all wallet currencies.");
                break;
            case 4: // EXP
                KC.core.announce("EXP Booster applied. Placeholder active.");
                break;
            case 5: // Nuke Save
                KC.core.announce("Save data cleared. Refreshing system.");
                localStorage.removeItem('kc_profile');
                setTimeout(() => location.reload(), 1500);
                break;
        }
    },
    render: function() {
        // 1. VISUAL DOM OVERLAY
        let el = document.getElementById('dev-console');
        if (!el) {
            el = document.createElement('div');
            el.id = 'dev-console';
            el.style.position = 'fixed';
            el.style.top = '10%';
            el.style.left = '10%';
            el.style.width = '80%';
            el.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            el.style.color = '#00FF00';
            el.style.fontFamily = 'monospace';
            el.style.padding = '20px';
            el.style.border = '2px solid #00FF00';
            el.style.zIndex = '9999';
            document.body.appendChild(el);
        }
        el.style.display = 'block';
        
        let visualHtml = '<h2>// SYS.ADMIN: DEV CONSOLE //</h2><ul style="list-style-type:none; padding:0;">';
        this.options.forEach((opt, idx) => {
            const marker = (idx === this.cursor) ? '> ' : '&nbsp;&nbsp;';
            visualHtml += `<li style="font-size: 1.2em; margin: 10px 0;">${marker}${opt}</li>`;
        });
        visualHtml += '</ul>';
        el.innerHTML = visualHtml;

        // 2. TEXT FALLBACK FOR HUD
        let textHtml = "DEV CONSOLE\n\n";
        this.options.forEach((opt, idx) => {
            textHtml += (idx === this.cursor ? "> " : "  ") + opt + "\n";
        });
        if (KC.els && KC.els.displayText) KC.els.displayText.textContent = textHtml;
        
        // 3. HEADLESS AUDIO ANNOUNCEMENT
        KC.core.announce("Dev Console Option: " + this.options[this.cursor]);
    }
};

window.onload = function() {
    KC.core.init();
};
/* kc_input.js - v2.73.1 */

KC.input = {
    init: function() {
        window.addEventListener('keydown', (e) => this.handleGlobalKeys(e));
        if (KC.els.inputTrap) {
            KC.els.inputTrap.addEventListener('blur', (e) => this.handleFocusLoss(e));
        }
    },

    flush: function() {
        if (KC.els.inputTrap) {
            KC.els.inputTrap.value = "";
        }
    },

    handleGlobalKeys: function(e) {
        // --- DEV CONSOLE INTERCEPT ---
        if (e.ctrlKey && e.shiftKey && e.key === 'F2') {
            e.preventDefault();
            KC.dev.toggleConsole();
            return;
        }

        if (KC.state.status === "DEV_CONSOLE") {
            e.preventDefault();
            if (["ArrowUp", "Up"].includes(e.key)) KC.dev.moveCursor(-1);
            if (["ArrowDown", "Down"].includes(e.key)) KC.dev.moveCursor(1);
            if (["Enter"].includes(e.key)) KC.dev.executeAction();
            return;
        }

        // --- SILENT MODIFIERS ---
        if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
            return;
        }

        // --- BROWSER DEFAULTS WHITELIST ---
        if (["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].includes(e.key) || 
            (e.ctrlKey && e.key.toLowerCase() === "r")) {
            return;
        }

        // --- EMERGENCY OVERRIDES ---
        if (e.ctrlKey && e.shiftKey && (e.key === "Backspace" || e.key === "Delete")) {
            e.preventDefault();
            KC.core.announce("Hard Reset Initiated...");
            setTimeout(() => KC.core.resetProgress(), 500);
            return;
        }

        // --- GLOBAL AUDIO CONTROLS ---
        if (e.shiftKey && e.key.toLowerCase() === "v") {
            e.preventDefault();
            if (KC.bgm) KC.bgm.cycleVolume();
            return;
        }
        if (e.shiftKey && e.key.toLowerCase() === "m") {
            e.preventDefault();
            if (KC.bgm) KC.bgm.cycleStyle();
            return;
        }

        // --- LOGIN NAVIGATION ---
        if (KC.state.status === "LOGIN") {
            e.preventDefault();
            const options = ["Create New Cadet", ...KC.state.roster, "Exit"];

            if (e.key === "ArrowDown") { KC.audio.playSound('click'); KC.hub.navigateLogin(1); }
            else if (e.key === "ArrowUp") { KC.audio.playSound('click'); KC.hub.navigateLogin(-1); }
            else if (e.key === "Enter") { KC.audio.playSound('click'); KC.hub.selectLogin(); }
            else if (e.key === "Delete") { 
                const selection = options[KC.state.menuSelection];
                if (selection !== "Create New Cadet" && selection !== "Exit") {
                    KC.audio.playSound('click');
                    KC.state.status = "LOGIN_DELETE";
                    KC.els.displayText.textContent = `>> DELETE PROFILE <<\n\nAre you sure you want to permanently delete ${selection}?\n\n[Press Enter to Confirm, Escape to Cancel]`;
                    KC.core.announce(`Delete profile ${selection}? Press Enter to confirm, Escape to cancel.`);
                } else {
                    KC.audio.playSound('error');
                }
            }
            else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                const char = e.key.toLowerCase();
                let nextIndex = -1;
                for (let i = 1; i <= options.length; i++) {
                    let checkIndex = (KC.state.menuSelection + i) % options.length;
                    if (options[checkIndex].toLowerCase().startsWith(char)) {
                        nextIndex = checkIndex;
                        break;
                    }
                }
                if (nextIndex !== -1) {
                    KC.audio.playSound('click');
                    KC.state.menuSelection = nextIndex;
                    KC.hub.renderLogin(false);
                }
            }
            return;
        }

        // --- LOGIN INPUT CAPTURE ---
        if (KC.state.status === "LOGIN_INPUT") {
            if (e.key === "Enter") {
                e.preventDefault();
                const name = KC.els.inputTrap.value.trim();
                if (name.length > 0) {
                    KC.audio.playSound('click');
                    KC.core.createProfile(name);
                    if(KC.input && KC.input.flush) KC.input.flush();
                    KC.hub.routeProfileBoot();
                } else {
                    KC.core.announce("Error. Callsign cannot be empty.");
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                KC.audio.playSound('click');
                KC.hub.renderLogin(false);
            } else if (e.key.length === 1 || e.key === "Backspace") {
                // Visual Echo
                setTimeout(() => {
                    if (KC.els.inputTrap && KC.els.displayText) {
                        const currentName = KC.els.inputTrap.value;
                        KC.els.displayText.textContent = `>> NEW CADET REGISTRATION <<\n\nEnter your Callsign (Name):\n\n> ${currentName}_\n\n[Type name and press Enter, Escape to Cancel]`;
                    }
                }, 10);
            }
            return;
        }

        // --- LOGIN DELETE CONFIRMATION ---
        if (KC.state.status === "LOGIN_DELETE") {
            e.preventDefault();
            if (e.key === "Enter") {
                KC.audio.playSound('click');
                const options = ["Create New Cadet", ...KC.state.roster, "Exit"];
                const selection = options[KC.state.menuSelection];
                KC.core.deleteProfile(selection);
                KC.state.menuSelection = 0;
                KC.hub.renderLogin(true);
            } else if (e.key === "Escape") {
                KC.audio.playSound('click');
                KC.hub.renderLogin(true);
            }
            return;
        }

        // --- ECHO CHAMBER: ACTIVE MODE ---
        if (KC.state.status === "ECHOC_ACTIVE") {
            e.preventDefault(); 
            KC.echoc.handleInput(e);
            return;
        }

        if (e.key === "Escape") {
            if (KC.state.status === "ACTIVE_TYPING" || KC.state.status === "BRIEFING") {
                if (KC.mission && KC.mission.abortActiveMission) {
                    KC.mission.abortActiveMission();
                } else {
                    if (KC.audio.playSynth) KC.audio.playSynth(18);
                    KC.hub.enterHub();
                }
            } else {
                if (KC.audio.playSynth) KC.audio.playSynth(18);
                KC.hub.enterHub();
            }
            return;
        }

        // --- ACTIVE TYPING ROUTER ---
        if (KC.state.status === "ACTIVE_TYPING") {
            if (e.key === "Escape") {
                e.preventDefault();
                KC.audio.stopActiveAudio();
                KC.core.stopNagTimer();
                this.flush();
                KC.hub.enterHub();
            } else {
                KC.mission.handleInput(e);
            }
            return;
        }

        // --- BOOT SCREEN ---
        if (KC.state.status === "BOOT") {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                KC.core.bootSystem(); 
            }
            return;
        }

        // --- ECHO CHAMBER: START SCREEN ---
        if (KC.state.status === "ECHOC_START") {
            e.preventDefault(); 
            if (e.key === "Escape") {
                this.flush();
                KC.echoc.exit();
            } else if (e.key === "Enter") {
                this.flush();
                if (KC.audio.playSynth) KC.audio.playSynth(24);
                KC.echoc.startDiagnostics();
            }
            return; 
        }

        // --- TUTORIAL ---
        if (KC.state.status === "TUTORIAL") {
            KC.tutorial.handleGlobalKeys(e);
            return;
        }

        // --- MISSION START / BRIEFING ---
        if (KC.state.status === "MISSION_START" || KC.state.status === "BRIEFING") {
            e.preventDefault();

            if (e.key.toLowerCase() === 'x') {
                const lesson = KC.state.activeLesson;
                const mID = lesson.id;
                KC.state.profile.disabled_intros = KC.state.profile.disabled_intros || {};

                const introMap = {
                    "D00-MISSION-REFLEX": "audio/intros/systems.mp3",
                    "D00-MISSION-RACE": "audio/intros/keyboard.mp3",
                    "ARC-STREAM-01": "audio/intros/data.mp3",
                    "D00-MISSION-LAUNCH": "audio/intros/launch.mp3"
                };
                if (!lesson.audio_briefing && introMap[mID]) lesson.audio_briefing = introMap[mID];

                if (KC.state.profile.disabled_intros[mID]) {
                    KC.state.profile.disabled_intros[mID] = false;
                    KC.core.announce("Intro Audio Enabled");
                    if (lesson.audio_briefing && KC.audio.playIntro) KC.audio.playIntro(lesson.audio_briefing);
                } else {
                    KC.state.profile.disabled_intros[mID] = true;
                    KC.core.announce("Intro Audio Disabled");
                    if (KC.audio.stopIntro) KC.audio.stopIntro();
                }
                KC.core.saveProgress();
                return;
            }

            const maxCursor = KC.mission._getMaxCursor();
            const startRow  = KC.mission._getStartRow();
            const exitRow   = KC.mission._getExitRow();

            if (e.key === "ArrowUp") {
                KC.audio.playSound('click');
                KC.mission.setupCursor--;
                if (KC.mission.setupCursor < 0) KC.mission.setupCursor = maxCursor;
                KC.mission.renderMissionStart(KC.state.activeLesson, false, true);
            }
            else if (e.key === "ArrowDown") {
                KC.audio.playSound('click');
                KC.mission.setupCursor++;
                if (KC.mission.setupCursor > maxCursor) KC.mission.setupCursor = 0;
                KC.mission.renderMissionStart(KC.state.activeLesson, false, true);
            }
            else if (e.key === "ArrowLeft") {
                KC.mission.adjustCurrentRow(-1);
            }
            else if (e.key === "ArrowRight") {
                KC.mission.adjustCurrentRow(1);
            }
            else if (e.key === "Enter") {
                this.flush();
                if(KC.audio.stopIntro) KC.audio.stopIntro();
                if (KC.mission.setupCursor === exitRow) {
                    KC.hub.enterHub();
                } else {
                    KC.mission.executeMission();
                }
            }
            else if (e.key === "Escape") {
                this.flush();
                if(KC.audio.stopIntro) KC.audio.stopIntro();
                KC.hub.enterHub();
            }
            return;
        }

        // --- MISSION REPORT ---
        if (KC.state.status === "REPORT") {
            e.preventDefault(); 
            if (e.key === "Enter") {
                this.flush();
                KC.mission.advanceFromReport();
            } else if (e.key === "ArrowUp") {
                KC.mission.navigateReport(-1);
            } else if (e.key === "ArrowDown") {
                KC.mission.navigateReport(1);
            }
            return;
        }

        // --- HUB NAVIGATION ---
        if (KC.state.status === "HUB" || KC.state.status === "MENU") {
            e.preventDefault(); 
            if (["Enter", "g", "G"].includes(e.key)) {
                this.flush(); 
                KC.hub.openGameMenu();
            }
            return;
        }

        // --- MENU NAVIGATION ---
        if (KC.state.status === "MENU_NAV") {
            e.preventDefault(); 
            const deckID = KC.state.profile.currentDeck || 0;
            const menuItems = KC.hub.getHubMenu(deckID);
            const menuMax = menuItems.length;

            if (e.key === "ArrowDown") {
                KC.audio.playSound('click'); 
                KC.state.menuSelection = (KC.state.menuSelection + 1) % menuMax;
                KC.hub.renderGameMenu(false);
            } else if (e.key === "ArrowUp") {
                KC.audio.playSound('click'); 
                KC.state.menuSelection = (KC.state.menuSelection - 1 + menuMax) % menuMax;
                KC.hub.renderGameMenu(false);
            } else if (e.key === "Enter" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
                this.flush();
                const selected = menuItems[KC.state.menuSelection];
                
                // v2.73.1: Dynamic Menu Audio Routing
                if (selected.type === "echoc") {
                    if (KC.audio.playSynth) KC.audio.playSynth(24);
                } else if (selected.type === "cache" || selected.type === "archive") {
                    if (KC.audio.playSynth) KC.audio.playSynth(30);
                } else {
                    if (KC.audio.playSynth) KC.audio.playSynth(23);
                }
                
                if (selected.type === "mission") KC.mission.loadLesson(selected.target_id);
                else if (selected.type === "arcade") KC.hub.enterArcade();
                else if (selected.type === "fabricator") KC.hub.enterFabricator();
                else if (selected.type === "engineering") KC.hub.enterEngineering();
                else if (selected.type === "cache") KC.hub.enterDataCache();
                else if (selected.type === "archive") KC.hub.enterArchive();
                else if (selected.type === "echoc") KC.echoc.init(); 
                else if (selected.type === "settings") KC.hub.openSettingsMenu();
                else if (selected.type === "stay_out") {
                    KC.core.announce("Abandon all hope, yee who enter.");
                    setTimeout(() => {
                        KC.dev.toggleConsole();
                    }, 1500); // Give the TTS time to read the warning before popping the console
                }
                else if (selected.type === "save_exit") { KC.core.saveProgress(); location.reload(); }
            } else if (e.key === "Escape") {
                this.flush();
                KC.hub.enterHub();
            }
            return;
        }
        
        // --- ENGINEERING ---
        if (KC.state.status === "ENGINEERING") {
            e.preventDefault(); 
            const categories = GAME_DATA.engineering;
            if (!categories || categories.length === 0) { KC.hub.enterHub(); return; }

            if (e.key === "ArrowRight") { 
                KC.audio.playSound('click');
                KC.state.engCategoryIndex = (KC.state.engCategoryIndex + 1) % categories.length; 
                KC.state.engItemIndex = 0; 
                KC.hub.renderEngineering(true); 
            }
            else if (e.key === "ArrowLeft") { 
                KC.audio.playSound('click');
                KC.state.engCategoryIndex = (KC.state.engCategoryIndex - 1 + categories.length) % categories.length; 
                KC.state.engItemIndex = 0; 
                KC.hub.renderEngineering(true); 
            }
            else if (e.key === "ArrowDown") { 
                KC.audio.playSound('click');
                const cat = categories[KC.state.engCategoryIndex];
                KC.state.engItemIndex = (KC.state.engItemIndex + 1) % cat.items.length; 
                KC.hub.renderEngineering(false); 
            }
            else if (e.key === "ArrowUp") { 
                KC.audio.playSound('click');
                const cat = categories[KC.state.engCategoryIndex];
                KC.state.engItemIndex = (KC.state.engItemIndex - 1 + cat.items.length) % cat.items.length; 
                KC.hub.renderEngineering(false); 
            }
            else if (e.key === "Enter") { this.flush(); KC.hub.processEngineeringTransaction(); }
            else if (e.key === "Escape") { this.flush(); KC.hub.enterHub(); }
            return;
        }

        // --- FABRICATOR ---
        if (KC.state.status === "FABRICATOR") {
            e.preventDefault(); 
            const categories = GAME_DATA.fabricator_recipes;
            if (!categories || categories.length === 0) { KC.hub.enterHub(); return; }

            if (e.key === "ArrowRight") { KC.audio.playSound('click'); KC.state.fabCategoryIndex++; KC.state.fabItemIndex=0; KC.hub.renderFabricator(true); }
            else if (e.key === "ArrowLeft") { KC.audio.playSound('click'); KC.state.fabCategoryIndex--; KC.state.fabItemIndex=0; KC.hub.renderFabricator(true); }
            else if (e.key === "ArrowDown") { KC.audio.playSound('click'); KC.state.fabItemIndex++; KC.hub.renderFabricator(false); }
            else if (e.key === "ArrowUp") { KC.audio.playSound('click'); KC.state.fabItemIndex--; KC.hub.renderFabricator(false); }
            else if (e.key === "Enter") { this.flush(); KC.hub.processTransaction(); }
            else if (e.key === "Escape") { this.flush(); KC.hub.enterHub(); }
            return;
        }

        // --- ARCADE ---
        if (KC.state.status === "ARCADE") {
            e.preventDefault(); 
            const depts = GAME_DATA.arcade;
            if (!depts || depts.length === 0) { KC.hub.enterHub(); return; }

            if (e.key === "ArrowRight") { KC.audio.playSound('click'); KC.state.arcade.tab++; KC.state.arcade.index=0; KC.hub.renderArcade(true); }
            else if (e.key === "ArrowLeft") { KC.audio.playSound('click'); KC.state.arcade.tab--; KC.state.arcade.index=0; KC.hub.renderArcade(true); }
            else if (e.key === "ArrowDown") { KC.audio.playSound('click'); KC.state.arcade.index++; KC.hub.renderArcade(false); }
            else if (e.key === "ArrowUp") { KC.audio.playSound('click'); KC.state.arcade.index--; KC.hub.renderArcade(false); }
            else if (e.key === "Enter") { this.flush(); KC.hub.processArcadeSelection(); }
            else if (e.key === "Escape") { this.flush(); KC.hub.enterHub(); }
            return;
        }

        // --- CACHE ---
        if (KC.state.status === "CACHE") {
            e.preventDefault(); 
            if (e.key === "ArrowRight") { KC.audio.playSound('click'); KC.state.cache.tab++; KC.state.cache.index=0; KC.hub.renderDataCache(); }
            else if (e.key === "ArrowLeft") { KC.audio.playSound('click'); KC.state.cache.tab--; KC.state.cache.index=0; KC.hub.renderDataCache(); }
            else if (e.key === "ArrowDown") { KC.audio.playSound('click'); KC.hub.navigateCacheContent(1); }
            else if (e.key === "ArrowUp") { KC.audio.playSound('click'); KC.hub.navigateCacheContent(-1); }
            else if (e.key === "Escape") { this.flush(); KC.hub.enterHub(); }
            return;
        }

        // --- ARCHIVE ---
        if (KC.state.status === "ARCHIVE") {
            e.preventDefault(); 
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") { 
                KC.audio.playSound('click'); 
                KC.state.archive.tab = (KC.state.archive.tab === 0) ? 1 : 0;
                KC.state.archive.index = 0; 
                KC.hub.renderArchive(); 
            }
            else if (e.key === "ArrowDown") { KC.audio.playSound('click'); KC.hub.navigateArchiveContent(1); }
            else if (e.key === "ArrowUp") { KC.audio.playSound('click'); KC.hub.navigateArchiveContent(-1); }
            else if (e.key === "Escape") { this.flush(); KC.hub.enterHub(); }
            return;
        }

        // --- SETTINGS ---
        if (KC.state.status === "SETTINGS") {
            e.preventDefault();
            const sm = KC.hub.settingsMenu;

            if (e.key === "ArrowUp") {
                KC.audio.playSound('click');
                sm.row = (sm.row - 1 + 4) % 4;
                KC.hub.renderSettingsMenu(false);
            } else if (e.key === "ArrowDown") {
                KC.audio.playSound('click');
                sm.row = (sm.row + 1) % 4;
                KC.hub.renderSettingsMenu(false);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                KC.audio.playSound('click');
                const dir = (e.key === "ArrowRight") ? 1 : -1;
                const settings = KC.state.profile.settings;

                if (sm.row === 0) {
                    // Theme
                    sm.themeIndex = (sm.themeIndex + dir + sm.themes.length) % sm.themes.length;
                    settings.theme = sm.themes[sm.themeIndex];
                    KC.hub.applyTheme(settings.theme);
                    KC.core.saveProgress();
                } else if (sm.row === 1) {
                    // Font Size
                    sm.fontIndex = (sm.fontIndex + dir + sm.fontSizes.length) % sm.fontSizes.length;
                    settings.font_size = sm.fontSizes[sm.fontIndex];
                    KC.hub.applyFontSize(settings.font_size);
                    KC.core.saveProgress();
                } else if (sm.row === 2) {
                    // Music Style
                    sm.styleIndex = (sm.styleIndex + dir + sm.musicStyles.length) % sm.musicStyles.length;
                    settings.bgm_style = sm.musicStyles[sm.styleIndex];
                    KC.core.saveProgress();
                    KC.bgm.playPreview(settings.bgm_style);
                } else if (sm.row === 3) {
                    // Volume
                    sm.volumeIndex = (sm.volumeIndex + dir + sm.volumeStages.length) % sm.volumeStages.length;
                    KC.bgm.setVolume(sm.volumeStages[sm.volumeIndex]);
                }

                KC.hub.renderSettingsMenu(false);
            } else if (e.key === "Escape") {
                this.flush();
                KC.hub.enterHub();
            }
            return;
        }
    },

    handleFocusLoss: function() {
        if (KC.state.status === "ACTIVE_TYPING") {
            KC.audio.stopActiveAudio();
            KC.state.status = "PAUSED";
            KC.core.announce("Focus lost. Game paused.", true);
        }
    }
};
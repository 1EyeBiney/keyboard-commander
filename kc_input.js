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

        if (e.key === "!" || (e.key === "1" && e.ctrlKey && e.shiftKey)) {
             e.preventDefault();
             KC.core.announce("Dev Skip: Warping to Hub.");
             KC.audio.stopActiveAudio();
             KC.state.profile.currentLessonIndex = 26; 
             KC.core.saveProgress();
             this.flush(); 
             KC.hub.enterHub();
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
                    const existingProfile = KC.state.roster.find(r => r.toLowerCase() === name.toLowerCase());

                    if (existingProfile) {
                        KC.audio.playSound('error');
                        KC.core.announce(`Error. Callsign ${existingProfile} is already registered. Please select it from the roster.`);
                        this.flush();
                        KC.hub.renderLogin(true);
                    } else {
                        KC.audio.playSound('click');
                        KC.core.createProfile(name);
                        this.flush();
                        KC.hub.routeProfileBoot();
                    }
                } else {
                    KC.core.announce("Error. Callsign cannot be empty.");
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                KC.audio.playSound('click');
                this.flush();
                KC.hub.renderLogin(true);
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

            if (e.key === "Enter") {
                this.flush();
                KC.mission.executeMission(); 
                return;
            }
            if (["1","2","3","4","5"].includes(e.key)) KC.mission.changeDifficulty(parseInt(e.key));
            if (e.key === "ArrowLeft") KC.mission.changeMissionSetting(-1);
            if (e.key === "ArrowRight") KC.mission.changeMissionSetting(1);
            if (e.key === "ArrowUp") KC.mission.changeMissionRegion(-1);
            if (e.key === "ArrowDown") KC.mission.changeMissionRegion(1);
            if (e.key === "PageUp") KC.mission.changeMissionLength(1);
            if (e.key === "PageDown") KC.mission.changeMissionLength(-1);
            if (e.key === "Escape") {
                this.flush();
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
                if (KC.state.status === "MENU" && e.key === "Enter") {
                    KC.mission.loadLesson(KC.state.profile.currentLessonIndex);
                } else {
                    KC.hub.openGameMenu();
                }
            }
            return;
        }

        // --- MENU NAVIGATION ---
        if (KC.state.status === "MENU_NAV") {
            e.preventDefault(); 
            const deckID = KC.state.profile.currentDeck || 0;
            const menuItems = GAME_DATA.hubs[deckID].menu;
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
    },

    handleFocusLoss: function() {
        if (KC.state.status === "ACTIVE_TYPING") {
            KC.audio.stopActiveAudio();
            KC.state.status = "PAUSED";
            KC.core.announce("Focus lost. Game paused.", true);
        }
    }
};
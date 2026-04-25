/* kc_mission_core.js - v3.37.0 */

KC.handlers = KC.handlers || {}; 

KC.mission = {
    activeHandler: null,
    setupCursor: 0,

    // v3.21.4: Vowel Injection Patch — vowels natively embedded in left/right/both strings
    regionsRace: [
        { name: "Home Row (+Vowels)",                 left: "asdfgaeiouy",           right: "hjklaeiouy",        both: "asdfghjklaeiouy",                 isExpert: false },
        { name: "Top & Home Row (+Vowels)",           left: "qwertasdfgaeiouy",      right: "yuiophjklaeiouy",   both: "qwertyuiopasdfghjklaeiouy",       isExpert: false },
        { name: "Top & Home (Expert, +Vowels)",       left: "qwertasdfgaeiouy",      right: "yuiophjklaeiouy",   both: "qwertyuiopasdfghjklaeiouy",       isExpert: true },
        { name: "Home & Bottom Row (+Vowels)",        left: "asdfgzxcvbaeiouy",      right: "hjklnmaeiouy",      both: "asdfghjklzxcvbnmaeiouy",          isExpert: false },
        { name: "Home & Bottom (Expert, +Vowels)",    left: "asdfgzxcvbaeiouy",      right: "hjklnmaeiouy",      both: "asdfghjklzxcvbnmaeiouy",          isExpert: true },
        { name: "All Alpha",                          left: "qwertasdfgzxcvb",       right: "yuiophjklnm",       both: "qwertyuiopasdfghjklzxcvbnm",      isExpert: false },
        { name: "All Alpha (Expert)",                 left: "qwertasdfgzxcvb",       right: "yuiophjklnm",       both: "qwertyuiopasdfghjklzxcvbnm",      isExpert: true }
    ],

    regionsComprehensive: [
        // Alpha Quadrants (1-4)
        { name: "Home Row",          left: "asdfg",           right: "hjkl",        both: ["a","s","d","f","g","h","j","k","l"],                                                                                                                                    isExpert: false },
        { name: "Top & Home Row",    left: "qwertasdfg",      right: "yuiophjkl",   both: ["q","w","e","r","t","y","u","i","o","p","a","s","d","f","g","h","j","k","l"],                                                                                            isExpert: false },
        { name: "Home & Bottom Row", left: "asdfgzxcvb",      right: "hjklnm",      both: ["a","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"],                                                                                                        isExpert: false },
        { name: "All Alpha",         left: "qwertasdfgzxcvb", right: "yuiophjklnm", both: ["q","w","e","r","t","y","u","i","o","p","a","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"],                                                                isExpert: false },
        // Data Quadrants (5-8)
        { name: "Number Row",             left: "12345", right: "67890", both: ["1","2","3","4","5","6","7","8","9","0"],                                                                                                                                            isExpert: false },
        { name: "Shift Symbols",          left: "!@#$%", right: "^&*()", both: ["!","@","#","$","%","^","&","*","(",")"],                                                                                                                                            isExpert: false },
        { name: "Punctuation & Brackets", left: "~`-_=+[{", right: "]}\\|;:'\",.<>/?", both: "~`-_=+[{]}\\|;:'\",.<>/?" },
        { name: "Numpad",                 left: "",      right: "",      both: ["0","1","2","3","4","5","6","7","8","9","/","*","-","+",".","Enter"],                                                                                                                isExpert: false },
        // Control Quadrants (9-10)
        { name: "Function Keys",          left: "",      right: "",      both: ["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"],                                                                                                                     isExpert: false },
        { name: "Navigation & Editing",     left: "",      right: "",      both: ["Insert","Delete","Home","End","PageUp","PageDown","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"],                                                                                          isExpert: false }
    ],

    regionsLaunch: [
        { name: "Numbers (Numpad)",                 forceBoth: true },
        { name: "Numbers (Number Row)",             forceBoth: true },
        { name: "Numbers and Alpha",                forceBoth: true },
        { name: "Numbers and Symbols",              forceBoth: true },
        { name: "Numbers, Letters and Symbols",     forceBoth: true },
        { name: "Alpha and Symbols",                forceBoth: true }
    ],

    getRegions: function(lesson) {
        if (lesson && lesson.generator === "race") {
            return this.regionsRace;
        }
        if (lesson && (lesson.generator === "launch" || lesson.id === "D00-MISSION-LAUNCH")) {
            return this.regionsLaunch;
        }
        if (lesson && (lesson.generator === "reflex" || lesson.generator === "stream")) {
            return this.regionsComprehensive;
        }
        return this.regionsRace;
    },

    getActiveKeys: function() {
        const params = KC.state.missionParams || {};
        const lesson = KC.state.activeLesson;
        const currentRegions = this.getRegions(lesson);
        
        // Safety Catch: The "State Carryover" Trap
        let rMode = params.regionMode || 0;
        if (rMode >= currentRegions.length) rMode = 0; 
        
        const region = currentRegions[rMode] || currentRegions[0];
        if (params.reflexMode === 0) return region.left;
        if (params.reflexMode === 1) return region.right;
        return region.both;
    },

    isWordInZone: function(word, regionMode, generatorType) {
        let regions = generatorType === "race" ? this.regionsRace : this.regionsComprehensive;
        let targetRegion = regions[regionMode];
        if (!targetRegion) return false;

        let lowerWord = word.toLowerCase();

        // --- v3.21.0: EXPERT QUADRANT LOGIC ---
        if (!targetRegion.isExpert && lowerWord.length > 5) return false;
        if (targetRegion.isExpert && lowerWord.length <= 5) return false;

        // --- v3.21.3: STRICT HAND MODE ENFORCEMENT ---
        // 0: Left, 1: Right, 2: Both
        let params = KC.state.missionParams || {};
        let handMode = params.reflexMode !== undefined ? params.reflexMode : 2;
        
        let validChars = targetRegion.both;
        if (handMode === 0) validChars = targetRegion.left;
        else if (handMode === 1) validChars = targetRegion.right;

        // --- CHARACTER CHECK ---
        for (let i = 0; i < lowerWord.length; i++) {
            let char = lowerWord[i];
            
            // Allow hyphens globally for compound words
            if (char === '-') continue;

            if (Array.isArray(validChars)) {
                 if (!validChars.includes(char)) return false;
            } else {
                 if (validChars.indexOf(char) === -1) return false;
            }
        }
        return true;
    },

    loadLesson: function(target_id) {
        const lesson = GAME_DATA.lessons[target_id];
        if (!lesson) {
            KC.core.announce("Error: Mission data corrupted. Returning to Hub.");
            setTimeout(() => KC.hub.enterHub(), 1000);
            return;
        }

        KC.state.activeLesson = lesson;
        
        let defaultVoice = KC.state.profile.settings.preferred_voice || "Belle";
        if (defaultVoice === "Per-Mission") {
            defaultVoice = KC.state.profile.settings.mission_voices[target_id] || "Belle";
        }
        
        KC.state.missionParams = {
            regionMode: lesson.params?.regionMode || 0,
            reflexMode: lesson.params?.reflexMode || 2,
            difficulty: lesson.params?.difficulty || 3,
            lengthMode: 1,
            codeLength: lesson.params?.codeLength || 4,
            launchMode: lesson.params?.launchMode || "shadow",
            voice: defaultVoice
        };

        this.setupCursor = 0;

        // --- v3.20.0 Contextual BGM Routing ---
        if (KC.bgm && typeof KC.bgm.switchToStyle === 'function') {
            if (lesson.generator === "reflex") {
                KC.bgm.switchToStyle("systems");
            } else if (lesson.generator === "stream") {
                KC.bgm.switchToStyle("data");
            } else if (lesson.generator === "race" || lesson.id === "D00-MISSION-RACE") {
                KC.bgm.switchToStyle("keyboard");
            }
        }

        if (lesson.type === "tutorial") {
             KC.state.profile.currentLessonIndex = GAME_DATA.lessonOrder.indexOf(target_id);
             KC.core.saveProgress();
             KC.tutorial.startLesson(lesson);
        } else if (lesson.type === "deck_end") {
             this.completeDeck(KC.state.profile.currentLessonIndex + 1);
        } else {
             this.renderMissionStart(KC.state.activeLesson);
        }
    },

    renderMissionStart: function(lesson, silent = false, navOnly = false) {
        KC.core.stopNagTimer();
        KC.state.status = "MISSION_START";
        KC.state.activeLesson = lesson;

        if (!KC.state.missionParams) {
            KC.state.missionParams = { reflexMode: 0, regionMode: 0, lengthMode: 0, difficulty: 1 };
        }

        const params = KC.state.missionParams;
        const isRace = (lesson.generator === "race") || (lesson.id === "D00-MISSION-RACE");
        const isReflex = (lesson.generator === "reflex");
        const isStream = (lesson.generator === "stream");
        const isLaunch = (lesson.generator === "launch") || (lesson.id === "D00-MISSION-LAUNCH");
        const hasSpecialRow = isRace || isReflex || isLaunch;

        // Apply theme class to body
        document.body.classList.remove('theme-race', 'theme-reflex', 'theme-stream');
        if (isRace)        document.body.classList.add('theme-race');
        else if (isReflex) document.body.classList.add('theme-reflex');
        else if (isStream) document.body.classList.add('theme-stream');

        // Safety Catch: The "State Carryover" Trap
        const currentRegions = this.getRegions(lesson);
        let rMode = params.regionMode || 0;
        if (rMode >= currentRegions.length) { rMode = 0; params.regionMode = 0; }
        const region = currentRegions[rMode] || currentRegions[0];

        // Hand Mode label
        const hands = ["Left Hand", "Right Hand", "Both Hands"];
        const handLabel = (isLaunch || (region && region.forceBoth)) ? "Both Hands (Fixed)" : hands[params.reflexMode || 0];

        // Tactical Voice
        const tacticalVoices = ["Amelia", "Belle"];
        const voiceLabel = params.voice || "Amelia";

        // Length Logic
        let lenLabel = "";
        if (isRace) {
            if (params.lengthMode === 0) { lesson.drill_length = 8;  lenLabel = "SHORT (8)"; }
            else if (params.lengthMode === 1) { lesson.drill_length = 14; lenLabel = "MEDIUM (14)"; }
            else                              { lesson.drill_length = 20; lenLabel = "LONG (20)"; }
        } else if (isStream) {
            if (params.lengthMode === 0) lenLabel = "SHORT (3x10s)";
            else if (params.lengthMode === 1) lenLabel = "MEDIUM (3x20s)";
            else                              lenLabel = "LONG (3x30s)";
        } else if (isLaunch) {
            if (params.lengthMode === 0) { lesson.drill_length = 30;  lenLabel = "SHORT (30s)"; }
            else if (params.lengthMode === 1) { lesson.drill_length = 60; lenLabel = "MEDIUM (60s)"; }
            else                              { lesson.drill_length = 120; lenLabel = "LONG (120s)"; }
        } else {
            if (params.lengthMode === 0) { lesson.drill_length = 12; lenLabel = "SHORT (12)"; }
            else if (params.lengthMode === 1) { lesson.drill_length = 24; lenLabel = "MEDIUM (24)"; }
            else                              { lesson.drill_length = 36; lenLabel = "LONG (36)"; }
        }

        // Difficulty Logic
        let diffName = "";
        let diffFloor = 0;
        if (isRace) {
            const raceSpeed = 2400 - (params.difficulty * 400);
            const speedSec = (raceSpeed / 1000).toFixed(1);
            const raceTitles = { 1: "CADET", 2: "ENSIGN", 3: "VETERAN", 4: "ELITE", 5: "COMMANDER" };
            diffName = `${raceTitles[params.difficulty]} (${speedSec}s)`;
            diffFloor = raceSpeed;
        } else {
            const diffMap = {
                1: { name: "NOVICE (1600ms)",    floor: 3000 },
                2: { name: "STANDARD (1400ms)",  floor: 2500 },
                3: { name: "HARD (1200ms)",       floor: 2000 },
                4: { name: "ELITE (1000ms)",      floor: 1500 },
                5: { name: "COMMANDER (800ms)",   floor: 1200 }
            };
            const d = diffMap[params.difficulty] || diffMap[1];
            diffName = d.name;
            diffFloor = d.floor;
        }
        lesson.time_floor = diffFloor;

        // Special row label (Row 5: Speed for Race, Window for Reflex, Code Length for Launch)
        let specialLabel = "";
        if (isRace) {
            const speedSec = ((2400 - params.difficulty * 400) / 1000).toFixed(1);
            specialLabel = `Speed:       ${speedSec}s per tile`;
        } else if (isReflex) {
            const wMap = { 1: "1600ms", 2: "1400ms", 3: "1200ms", 4: "1000ms", 5: "800ms" };
            specialLabel = `Window:      ${wMap[params.difficulty] || "1200ms"} reaction`;
        } else if (isLaunch) {
            specialLabel = `Code Length: ${params.codeLength || 4}`;
        }

        // Cursor bounds
        // rows 0..3 always, row 4 = Tactical Voice, row 5 if special, row 6 = Launch Mode (Launch only)
        const settingRowCount = isLaunch ? 7 : (hasSpecialRow ? 6 : 5);
        const startRow = settingRowCount;      // START MISSION row index
        const exitRow  = settingRowCount + 1;  // EXIT TO DECK row index
        const maxCursor = exitRow;

        if (this.setupCursor > maxCursor) this.setupCursor = 0;
        if (this.setupCursor < 0)         this.setupCursor = maxCursor;
        const c = this.setupCursor;

        const R = (rowIdx, label) => `${c === rowIdx ? '>' : ' '} ${label}`;

        let content = `MISSION BRIEFING: ${lesson.name.toUpperCase()}\n`;
        content += `${lesson.briefing || "No intel available."}\n\n`;
        content += `[ MISSION CONFIGURATION ]\n`;
        content += R(0, `Quadrant:    ${region ? region.name : "N/A"}`) + '\n';
        content += R(1, `Hand Mode:   ${handLabel}`)                      + '\n';
        content += R(2, `Difficulty:  ${diffName}`)                       + '\n';
        content += R(3, `Length:      ${lenLabel}`)                       + '\n';
        content += R(4, `Tact. Voice: ${voiceLabel}`)                     + '\n';
        if (hasSpecialRow) {
            content += R(5, specialLabel) + '\n';
        }
        // v3.43: Launch Mode row (Shadow vs Recall)
        let launchModeLabel = "";
        if (isLaunch) {
            launchModeLabel = (params.launchMode === "recall") ? "Recall" : "Shadow";
            content += R(6, `Mode:        ${launchModeLabel}`) + '\n';
        }
        content += R(startRow, `[ START MISSION ]`) + '\n';
        content += R(exitRow,  `[ EXIT TO DECK  ]`) + '\n';
        // v3.27.1: Build row labels/values
        const rowLabels = ["Quadrant", "Hand Mode", "Difficulty", "Length", "Tactical Voice"];
        const rowValues = [region ? region.name : "N/A", handLabel, diffName, lenLabel, voiceLabel];
        if (hasSpecialRow) {
            const parts = specialLabel.split(':');
            rowLabels.push(parts[0].trim());
            rowValues.push(parts.slice(1).join(':').trim());
        }
        if (isLaunch) {
            rowLabels.push("Mode");
            rowValues.push(launchModeLabel);
        }
        rowLabels.push("Start Mission"); rowValues.push("");
        rowLabels.push("Exit to Deck");  rowValues.push("");

        const introMap = {
            "D00-MISSION-REFLEX": "audio/intros/systems.mp3",
            "D00-MISSION-RACE": "audio/intros/keyboard.mp3",
            "ARC-STREAM-01": "audio/intros/data.mp3",
            "D00-MISSION-LAUNCH": "audio/intros/launch.mp3"
        };
        if (!lesson.audio_briefing && introMap[lesson.id]) lesson.audio_briefing = introMap[lesson.id];

        KC.state.profile.disabled_intros = KC.state.profile.disabled_intros || {};

        // v3.27.2: Restore visual footer instructions
        let displayHTML = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        displayHTML += "<br><br>[Up/Down: Navigate | Left/Right: Adjust | Enter: Start | Esc: Cancel | X: Toggle Intro]";
        KC.els.displayText.innerHTML = displayHTML;

        // cancel any pending intro callbacks if navigating
        if (KC.audio && KC.audio.clearIntroCallback) KC.audio.clearIntroCallback();

        // v3.29.0: Switch to Ambient Mission BGM on entry
        if (!silent && !navOnly) {
            const ambientMap = {
                "D00-MISSION-REFLEX": "systems",
                "D00-MISSION-RACE": "keyboard",
                "ARC-STREAM-01": "data",
                "D00-MISSION-LAUNCH": "launch"
            };
            if (KC.bgm && KC.bgm.switchToStyle) {
                let targetAmbient = ambientMap[lesson.id] || "default";
                KC.bgm.switchToStyle(targetAmbient);
            }
        }

        let announceText = `${rowLabels[this.setupCursor]}: ${rowValues[this.setupCursor]}`;

        if (!silent && !navOnly) {
            let instructions = "Use Arrow keys to adjust. Press Enter to start, or Escape to cancel.";
            announceText = `${lesson.name} Setup. ${instructions} ${announceText}. Press X to toggle intro message.`;

            if (!KC.state.profile.disabled_intros[lesson.id] && lesson.audio_briefing) {
                if (KC.audio && KC.audio.playIntro) {
                    KC.audio.playIntro(lesson.audio_briefing, (prefix) => {
                        let finalAnnounce = prefix ? (prefix + " " + announceText) : announceText;
                        KC.core.announce(finalAnnounce);
                    });
                } else {
                    KC.core.announce(announceText);
                }
            } else {
                KC.core.announce(announceText);
            }
        } else if (!silent) {
            KC.core.announce(announceText);
        }
    },

    changeMissionSetting: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(34); else KC.audio.playSound('click'); 
        
        const lesson = KC.state.activeLesson;
        const currentRegions = this.getRegions(lesson);
        let rMode = KC.state.missionParams.regionMode || 0;
        if (rMode >= currentRegions.length) rMode = 0;
        
        // Lock out hand selection for Launch Codes mission
        const currentMission = KC.state.activeLesson && KC.state.activeLesson.id;
        if (currentMission === "D00-MISSION-LAUNCH") {
            KC.core.announce("Left Hand and Right Hand not available for this mission. Locked to Both Hands.");
            return;
        }

        // Lock out hand selection if the region forces both hands
        if (currentRegions[rMode] && currentRegions[rMode].forceBoth) {
            KC.core.announce(`${currentRegions[rMode].name} utilizes all keys.`);
            return;
        }

        let current = KC.state.missionParams.reflexMode || 0;
        current += dir;

        if (current < 0) current = 2; 
        if (current > 2) current = 0;

        KC.state.missionParams.reflexMode = current;
        this.renderMissionStart(KC.state.activeLesson, true);
        
        const hands = ["Left Hand", "Right Hand", "Both Hands"];
        KC.core.announce(`${hands[current]}`);
    },

    changeMissionRegion: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(34); else KC.audio.playSound('click'); 
        
        const lesson = KC.state.activeLesson;
        const currentRegions = this.getRegions(lesson);
        
        let current = KC.state.missionParams.regionMode || 0;
        current += dir;
        
        // Safe bounded navigation
        if (current < 0) current = currentRegions.length - 1;
        if (current >= currentRegions.length) current = 0;
        
        KC.state.missionParams.regionMode = current;
        
        if (currentRegions[current].forceBoth) {
            KC.state.missionParams.reflexMode = 2; // Internally default to Both Hands
        }

        this.renderMissionStart(KC.state.activeLesson, true);
        
        const regionName = currentRegions[current].name;
        KC.core.announce(`Target Zone: ${regionName}`);
    },

    changeMissionLength: function(dir) {
        if (KC.audio.playSynth) {
            if (dir > 0) KC.audio.playSynth(3);
            else KC.audio.playSynth(4);
        } else {
            KC.audio.playSound('click'); 
        }
        
        let current = KC.state.missionParams.lengthMode;
        current += dir;
        if (current < 0) current = 2;
        if (current > 2) current = 0;
        KC.state.missionParams.lengthMode = current;
        this.renderMissionStart(KC.state.activeLesson, true);
        
        const isRace = (KC.state.activeLesson.id === "D00-MISSION-RACE") || (KC.state.activeLesson.generator === "race");
        const isStream = (KC.state.activeLesson.generator === "stream");
        const isLaunch = (KC.state.activeLesson.generator === "launch") || (KC.state.activeLesson.id === "D00-MISSION-LAUNCH");

        let label = "";
        if (isStream) {
            if (current === 0) label = "SHORT (3x10s)";
            else if (current === 1) label = "MEDIUM (3x20s)";
            else label = "LONG (3x30s)";
        } else if (isLaunch) {
            if (current === 0) label = "SHORT (30 Seconds)";
            else if (current === 1) label = "MEDIUM (60 Seconds)";
            else label = "LONG (120 Seconds)";
        } else if (isRace) {
            if (current === 0) label = "SHORT (8 Words)";
            else if (current === 1) label = "MEDIUM (14 Words)";
            else label = "LONG (20 Words)";
        } else {
            if (current === 0) label = "SHORT (12 Items)";
            else if (current === 1) label = "MEDIUM (24 Items)";
            else label = "LONG (36 Items)";
        }
        KC.core.announce(`Length set to ${label}`);
    },

    changeDifficulty: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(57); else KC.audio.playSound('click');
        let current = KC.state.missionParams.difficulty;
        current += dir;
        if (current < 1) current = 5;
        if (current > 5) current = 1;
        KC.state.missionParams.difficulty = current;
        this.renderMissionStart(KC.state.activeLesson, true);

        const isRace = (KC.state.activeLesson.generator === "race") || (KC.state.activeLesson.id === "D00-MISSION-RACE");
        let desc = "";
        if (isRace) {
            const raceSpeed = 2400 - (current * 400);
            const speedSec = (raceSpeed / 1000).toFixed(1);
            const raceTitles = { 1: "CADET", 2: "ENSIGN", 3: "VETERAN", 4: "ELITE", 5: "COMMANDER" };
            desc = `${raceTitles[current]} (${speedSec}s)`;
        } else {
            const diffMap = { 1: "NOVICE (1600ms)", 2: "STANDARD (1400ms)", 3: "HARD (1200ms)", 4: "ELITE (1000ms)", 5: "COMMANDER (800ms)" };
            desc = diffMap[current];
        }
        KC.core.announce(`Difficulty: ${desc}`);
    },

    _getHasSpecialRow: function() {
        const lesson = KC.state.activeLesson;
        if (!lesson) return false;
        return (lesson.generator === "race") || (lesson.id === "D00-MISSION-RACE") || (lesson.generator === "reflex") || (lesson.generator === "launch") || (lesson.id === "D00-MISSION-LAUNCH");
    },

    _isLaunchMission: function() {
        const lesson = KC.state.activeLesson;
        if (!lesson) return false;
        return (lesson.generator === "launch") || (lesson.id === "D00-MISSION-LAUNCH");
    },

    _getMaxCursor: function() {
        if (this._isLaunchMission()) return 8;
        return this._getHasSpecialRow() ? 7 : 6;
    },

    _getStartRow: function() {
        if (this._isLaunchMission()) return 7;
        return this._getHasSpecialRow() ? 6 : 5;
    },

    _getExitRow: function() {
        if (this._isLaunchMission()) return 8;
        return this._getHasSpecialRow() ? 7 : 6;
    },

    adjustCurrentRow: function(dir) {
        const c = this.setupCursor;
        const startRow = this._getStartRow();
        const exitRow  = this._getExitRow();
        if (c === startRow || c === exitRow) return; // no adjustment on action rows

        if (c === 0) { this.changeMissionRegion(dir); }
        else if (c === 1) { this.changeMissionSetting(dir); }
        else if (c === 2) { this.changeDifficulty(dir); }
        else if (c === 3) { this.changeMissionLength(dir); }
        else if (c === 4) { this.changeVoice(dir); }
        else if (c === 5 && this._getHasSpecialRow()) {
            const lesson = KC.state.activeLesson;
            if (lesson && (lesson.generator === "launch" || lesson.id === "D00-MISSION-LAUNCH")) {
                this.changeCodeLength(dir);
            } else {
                this.changeDifficulty(dir);
            }
        }
        // v3.43: Row 6 — Launch Mode (Shadow / Recall). Launch missions only.
        else if (c === 6 && this._isLaunchMission()) {
            this.changeLaunchMode(dir);
        }
    },

    changeCodeLength: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(34); else KC.audio.playSound('click');
        let current = KC.state.missionParams.codeLength || 4;
        current += dir;
        if (current < 4) current = 12;
        if (current > 12) current = 4;
        KC.state.missionParams.codeLength = current;
        this.renderMissionStart(KC.state.activeLesson, true);
        KC.core.announce(`Code Length: ${current}`);
    },

    // v3.43: Toggle between Shadow Mode (type-along) and Recall Mode (working-memory).
    changeLaunchMode: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(34); else KC.audio.playSound('click');
        const modes = ["shadow", "recall"];
        let current = modes.indexOf(KC.state.missionParams.launchMode || "shadow");
        if (current < 0) current = 0;
        current += dir;
        if (current < 0) current = modes.length - 1;
        if (current >= modes.length) current = 0;
        KC.state.missionParams.launchMode = modes[current];
        this.renderMissionStart(KC.state.activeLesson, true);
        const announceMap = {
            shadow: "Shadow Mode. Type-along permitted during dictation.",
            recall: "Recall Mode. Wait for the launch tone before typing."
        };
        KC.core.announce(announceMap[modes[current]]);
    },

    changeVoice: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(62); else KC.audio.playSound('click');
        const tacticalVoices = ["Amelia", "Belle"];
        let current = tacticalVoices.indexOf(KC.state.missionParams.voice || "Amelia");
        current += dir;
        if (current < 0) current = tacticalVoices.length - 1;
        if (current >= tacticalVoices.length) current = 0;
        KC.state.missionParams.voice = tacticalVoices[current];
        this.renderMissionStart(KC.state.activeLesson, true);
        KC.core.announce(`Tactical Voice: ${tacticalVoices[current]}`);
    },

    executeMission: function() {
        if (KC.state.profile.settings && KC.state.profile.settings.preferred_voice === "Per-Mission") {
            if (!KC.state.profile.settings.mission_voices) KC.state.profile.settings.mission_voices = {};
            KC.state.profile.settings.mission_voices[KC.state.activeLesson.id] = KC.state.missionParams.voice;
            KC.core.saveProgress();
        }
        // v3.31.0: Trigger dynamic BGM transition with ambient map fallback
        const lesson = KC.state.activeLesson;
        if (KC.bgm && KC.bgm.switchToStyle) {
            const ambientMap = {
                "D00-MISSION-REFLEX": "systems",
                "D00-MISSION-RACE": "keyboard",
                "ARC-STREAM-01": "data",
                "D00-MISSION-LAUNCH": "launch"
            };
            let targetStyle = lesson && lesson.bgm_style ? lesson.bgm_style : (ambientMap[lesson.id] || "arcade");
            KC.bgm.switchToStyle(targetStyle);
        }

        if (!lesson) {
            console.error("Launch Failed: No activeLesson in state.");
            KC.hub.enterHub();
            return;
        }

        // Apply mission theme class to body
        document.body.classList.remove('theme-race', 'theme-reflex', 'theme-stream', 'theme-launch');
        if (lesson.generator === "race" || lesson.id === "D00-MISSION-RACE") {
            document.body.classList.add('theme-race');
        } else if (lesson.generator === "reflex") {
            document.body.classList.add('theme-reflex');
        } else if (lesson.generator === "stream") {
            document.body.classList.add('theme-stream');
        } else if (lesson.generator === "launch" || lesson.id === "D00-MISSION-LAUNCH") {
            document.body.classList.add('theme-launch');
        }

        // v3.25.0: Launch Codes uses its own init/handleInput pattern — bypass countdown
        if (lesson.generator === "launch" || lesson.id === "D00-MISSION-LAUNCH") {
            const launchRegions = this.regionsLaunch;
            const rMode = KC.state.missionParams.regionMode || 0;
            const zoneName = (launchRegions[rMode] && launchRegions[rMode].name) ? launchRegions[rMode].name : "Numbers (Numpad)";

            let timeLimit = 30;
            if (KC.state.missionParams.lengthMode === 1) timeLimit = 60;
            if (KC.state.missionParams.lengthMode === 2) timeLimit = 120;

            const config = {
                time: timeLimit,
                codeLength: KC.state.missionParams.codeLength || 4,
                zone: zoneName,
                mode: KC.state.missionParams.launchMode || "shadow"
            };
            KC.state.status = "ACTIVE_TYPING";
            this.activeHandler = KC.mission_launch;
            KC.mission_launch.init(config);
            return;
        }

        // v2.87: Safety check for handler existence before starting countdown
        const handler = (lesson.generator === "race") ? KC.handlers.race :
                        (lesson.generator === "stream") ? KC.handlers.stream :
                        (lesson.generator === "reflex") ? KC.handlers.reflex :
                        (lesson.generator === "echoc") ? KC.handlers.echoc : null;

        if (!handler) {
            KC.core.announce("Error: This mission lacks a valid engine handler. Returning to Deck Menu.");
            console.error("Handler missing for generator:", lesson.generator);
            setTimeout(() => KC.hub.enterHub(), 1500);
            return;
        }

        // v2.87: Clean countdown launch with no redundant announcements
        this.runCountdown(() => {
            KC.state.status = "ACTIVE_TYPING";
            this.activeHandler = handler;
            handler.start(lesson);
        });
    },

    handleInput: function(e) {
        if (this.activeHandler && KC.state.status === "ACTIVE_TYPING") {
            this.activeHandler.handleInput(e);
        }
    },

    updateInstability: function(isError) {
        if (!KC.state.instability || !KC.state.instability.active) return false;
        
        const tiers = [0, 0.15, 0.3, 0.5]; 
        
        if (isError) {
            KC.state.instability.tier++;
            KC.state.instability.recoveryStreak = 0; 
            
            if (KC.state.instability.tier >= 4) {
                this.triggerExplosion();
                return true; 
            }
        } else {
            KC.state.instability.recoveryStreak++;
            if (KC.state.instability.recoveryStreak >= 5) {
                if (KC.state.instability.tier > 0) {
                    KC.state.instability.tier--;
                    KC.state.instability.recoveryStreak = 0;
                }
            }
        }
        
        const vol = tiers[KC.state.instability.tier] !== undefined ? tiers[KC.state.instability.tier] : 0.5;
        KC.audio.setHazardIntensity(vol);
        return false;
    },

    abortActiveMission: function() {
        if (KC.audio.playSynth) KC.audio.playSynth(18); // Power Down Sound
        
        if (this.activeHandler) {
            if (typeof this.activeHandler.endRace === 'function') {
                this.activeHandler.endRace(true); // true = aborted flag
            } else if (typeof this.activeHandler.endMission === 'function') {
                this.activeHandler.endMission();
            } else {
                this.triggerMissionFail();
            }
        } else {
            KC.hub.enterHub();
        }
    },

    triggerExplosion: function() {
        KC.audio.stopHazardLoop(0.1);
        
        const randEx = Math.floor(Math.random() * 7) + 1;
        KC.audio.playSFX(`sfx_explode_${randEx}`);
        
        KC.state.status = "FAIL_STATE";
        KC.state.profile.wallet.glitch += 1;
        KC.core.saveProgress();
        
        KC.els.displayText.textContent = "!!! CRITICAL FAILURE !!!\nSYSTEM OVERLOAD DETECTED\nREACTOR BREACH";
        
        setTimeout(() => {
            this.showReportCard(0, 0, 0, "F (SYSTEM DESTROYED)", "0m 0s", "CRITICAL FAILURE", ["+1 Glitch Mass (Fatal Error)"]);
        }, 2000); 
    },

    triggerMissionFail: function() {
        KC.state.status = "FAIL_STATE"; 
        KC.audio.stopActiveAudio();
        KC.audio.stopHazardLoop(0.5);
        
        const err = KC.state.stats.errors;
        const penalty = err + 5; 
        KC.state.profile.wallet.glitch += penalty;
        KC.core.saveProgress();
        
        const failureLog = [
            "+0 Data Blocks: Mission Failed",
            "+0 Logic Shards: System Offline",
            "+0 Sync Sparks: Signal Lost",
            "+0 Consecutive Coins: Streak Reset",
            `CRITICAL: +${penalty} Glitch (Structural Integrity Lost)`
        ];
        this.showReportCard(0, 0, 0, "F (SYSTEM OFFLINE)", "0m 0s", "MISSION CRITICAL FAILURE", failureLog);
    },

    calculateGrade: function(acc, wpm) {
        if (acc >= 100) return "S (PERFECT)";
        if (acc >= 95) return "A (EXCELLENT)";
        if (acc >= 90) return "B (GREAT)";
        if (acc >= 80) return "C (GOOD)";
        if (acc >= 70) return "D (PASSABLE)";
        return "F (FAILURE)";
    },

    completeLesson: function() {
        if (KC.state.status === "FAIL_STATE") return; 
        KC.audio.stopActiveAudio();
        KC.audio.stopHazardLoop(0.5);
        KC.audio.playSound('success');

        const stats = KC.state.stats;
        const params = KC.state.missionParams || { difficulty: 1 };
        const total = stats.totalKeys;
        const err = stats.errors;
        const accuracyPct = total > 0 ? Math.round(((total - err) / total) * 100) : 0;
        const maxStreak = KC.state.missionMaxStreak || 0;
        
        // Calculate Time & Speed Metrics
        const durationMs = Date.now() - stats.startTime;
        const durationSec = durationMs / 1000;
        const transmissionRate = (durationSec > 0) ? (total / durationSec).toFixed(2) : 0; 
        
        // --- PERFORMANCE REWARDS ---
        const lootData = Math.floor(total * 0.5) + 5; 
        const lootLogic = (accuracyPct >= 90 && total > 5) ? 1 : 0; 
        const lootSync = Math.floor(transmissionRate * params.difficulty); 
        const lootStreak = Math.floor(maxStreak / 15);
        const lootGlitch = err; 

        // Apply to Wallet
        const wallet = KC.state.profile.wallet;
        wallet.data_blocks += lootData;
        wallet.logic_shards += lootLogic;
        if(!wallet.sync_sparks) wallet.sync_sparks = 0;
        wallet.sync_sparks += lootSync;
        if(!wallet.consecutive_coins) wallet.consecutive_coins = 0;
        wallet.consecutive_coins += lootStreak;
        wallet.glitch += lootGlitch;

        // Construct Summary Receipt
        const rewardLog = [
            `+${lootData} Data Blocks: Mission Payout`,
            `+${lootLogic} Logic Shard: Precision Bonus (90%+)`,
            `+${lootSync} Sync Sparks: Velocity Bonus (TRS x${params.difficulty})`,
            `+${lootStreak} Consecutive Coins: Focus Bonus (${maxStreak} Streak)`,
            `WARNING: +${lootGlitch} Glitch Accumulated`
        ];

        KC.core.saveProgress();

        const durationMin = durationMs / 60000;
        const wpm = durationMin > 0 ? Math.round((total / 5) / durationMin) : 0;
        const timeStr = `${Math.floor(durationSec/60)}m ${Math.floor(durationSec%60)}s`;

        const titleText = "MISSION COMPLETE";
        this.showReportCard(accuracyPct, transmissionRate, maxStreak, this.calculateGrade(accuracyPct, wpm), timeStr, titleText, rewardLog);
    },

    showReportCard: function(acc, transmissionRate, maxStreak, grade, time, note, rewardLog) {
        if (KC.input && KC.input.flush) KC.input.flush();

        // --- DATA ENGINE LOGGING ---
        if (KC.state.profile && KC.state.profile.career) {
            const regionName = (KC.state.missionParams && KC.state.missionParams.region) ? KC.state.missionParams.region.name : "General Sector";
            const missionID = KC.state.activeLesson || "Unknown";
            
            // 1. Update 50-Mission Rolling Buffer
            KC.state.profile.career.history_buffer.push({
                date: Date.now(),
                id: missionID,
                wpm: transmissionRate,
                acc: acc,
                grade: grade,
                region: regionName
            });
            if (KC.state.profile.career.history_buffer.length > 50) {
                KC.state.profile.career.history_buffer.shift();
            }
            
            // 2. Update Zone Specific Stats
            if (!KC.state.profile.career.zone_stats[regionName]) {
                KC.state.profile.career.zone_stats[regionName] = { missions: 0, wpmSum: 0, accSum: 0 };
            }
            KC.state.profile.career.zone_stats[regionName].missions += 1;
            KC.state.profile.career.zone_stats[regionName].wpmSum += transmissionRate;
            KC.state.profile.career.zone_stats[regionName].accSum += acc;
            
            // 3. Force save
            KC.core.saveProgress();
        }
        // ------------------------------------

        KC.state.status = "REPORT";
        const totalKeys = KC.state.stats.totalKeys || 0;
        
        let lines = [
            `&gt;&gt; MISSION REPORT &lt;&lt;`,
            note,
            `RATING: ${grade}`,
            `TIME: ${time}`,
            `ACCURACY: ${acc}%`,
            `TRANSMISSION RATE: ${transmissionRate} TRS`,
            `MAX STREAK: ${maxStreak}`,
            `TOTAL KEYS: ${totalKeys}`,
            `ERRORS: ${KC.state.stats.errors || 0}`
        ];
        
        if (rewardLog && rewardLog.length > 0) {
            lines.push("REWARDS:");
            rewardLog.forEach(r => lines.push(r));
        }
        
        lines.push("[Press Enter to Continue]");

        KC.state.reportLines = lines;
        KC.state.reportIndex = 0;
        this.renderReport();
        
        let audioSum = `${note}. Rating ${grade.split(' ')[0]}. Time ${time}. Accuracy ${acc} percent. Transmission Rate ${transmissionRate}. Max Streak ${maxStreak}. `;
        if (rewardLog && rewardLog.length > 0) audioSum += `Rewards: ${rewardLog.join(', ')}. `;
        audioSum += "Press Enter.";
        if (rewardLog && rewardLog.length > 0) {
            audioSum += `Results: ${rewardLog.join('. ')}. `;
        }
        audioSum += "Press Enter to continue.";
        
        KC.core.announce(audioSum);
    },

    navigateReport: function(dir) {
        if (KC.input && KC.input.flush) KC.input.flush();
        
        KC.state.reportIndex += dir;
        if (KC.state.reportIndex < 0) KC.state.reportIndex = 0;
        if (KC.state.reportIndex >= KC.state.reportLines.length) KC.state.reportIndex = KC.state.reportLines.length - 1;
        this.renderReport();
        KC.core.announce(KC.state.reportLines[KC.state.reportIndex]);
    },

    renderReport: function() {
        let display = "";
        KC.state.reportLines.forEach((line, i) => {
            let marker = (i === KC.state.reportIndex) ? "&gt; " : "  ";
            display += marker + line + "\n";
        });
        KC.els.displayText.textContent = display;
    },

    advanceFromReport: function() {
        if (KC.state.activeLesson.type === "tutorial") {
             this.loadLesson(KC.state.profile.currentLessonIndex + 1);
        } else {
             this.renderMissionStart(KC.state.activeLesson);
        }
    },
    
    getMissionRewardEstimate: function(missionID) {
        if (missionID === "D00-MISSION-RACE") return "from 50 Data Blocks";
        if (missionID === "D00-MISSION-REFLEX") return "from 10 Data Blocks";
        if (missionID === "ARC-STREAM-01") return "from 10 Data Blocks";
        return "from 10 Data Blocks"; 
    },
    
    runCountdown: function(cb) {
         KC.els.displayText.textContent = "MISSION STARTING...";
         KC.audio.playAudio("num_sn_3", "Three", () => {
             KC.els.displayText.textContent = "3...";
             setTimeout(() => {
                 KC.audio.playAudio("num_sn_2", "Two", () => {
                     KC.els.displayText.textContent = "2...";
                     setTimeout(() => {
                         KC.audio.playAudio("num_sn_1", "One", () => {
                             KC.els.displayText.textContent = "1...";
                             setTimeout(() => {
                                 KC.audio.playAudio("word_go_sn", "GO!", () => {
                                     KC.els.displayText.textContent = "GO!";
                                     if (cb) cb();
                                 });
                             }, 800);
                         });
                     }, 800);
                 });
             }, 800);
         });
    }
};
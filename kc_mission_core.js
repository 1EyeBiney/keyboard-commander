/* kc_mission_core.js - v2.96.4 */

KC.handlers = KC.handlers || {}; 

KC.mission = {
    activeHandler: null,

    // v2.88: Decoupled Menus - Race (Keyboard Commander) vs Reflex (System Override)
    regionsRace: [
        { name: "Home Row", left: "asdfg", right: "hjkl", both: "asdfghjkl", isExpert: false },
        { name: "Top & Home Row", left: "qwertasdfg", right: "yuiophjkl", both: "qwertyuiopasdfghjkl", isExpert: false },
        { name: "Top & Home Row (Expert)", left: "qwertasdfg", right: "yuiophjkl", both: "qwertyuiopasdfghjkl", isExpert: true },
        { name: "Home & Bottom Row (+ Vowels)", left: "asdfgzxcvb", right: "hjklnm,.", both: "asdfghjklzxcvbnm,.", isExpert: false },
        { name: "Bottom & Home Row with all vowels (Expert)", left: "asdfgzxcvb", right: "hjklnm,.", both: "asdfghjklzxcvbnm,.", isExpert: true }
    ],

    regionsReflex: [
        { name: "Home Row", left: "asdfg", right: "hjkl", both: "asdfghjkl", isExpert: false },
        { name: "Top & Home Row", left: "qwertasdfg", right: "yuiophjkl", both: "qwertyuiopasdfghjkl", isExpert: false },
        { name: "Home & Bottom Row", left: "asdfgzxcvb", right: "hjklnm,.", both: "asdfghjklzxcvbnm,.", isExpert: false }
    ],

    getRegions: function(lesson) {
        // v2.92: Serve standard regions for Reflex and Stream, full regions for Race
        if (lesson && (lesson.generator === "reflex" || lesson.generator === "stream")) {
            return this.regionsReflex;
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

    isWordInZone: function(word, regionMode, handMode, difficulty) {
        const lesson = KC.state.activeLesson;
        const currentRegions = this.getRegions(lesson);
        
        let rMode = regionMode || 0;
        if (rMode >= currentRegions.length) rMode = 0; 

        const region = currentRegions[rMode];
        if (!region) return false;

        // Difficulty / Length check: Standard <= 5, Expert >= 6
        if (difficulty <= 2 && word.length > 5) return false;
        if (difficulty >= 3 && word.length <= 5) return false;

        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            
            // v2.81: Always allow vowels to pass the filter
            const isVowel = "aeiou".includes(char);
            
            if (handMode === 0 && !region.left.includes(char) && !isVowel) return false;
            if (handMode === 1 && !region.right.includes(char) && !isVowel) return false;
            if (handMode === 2 && !region.both.includes(char) && !isVowel) return false;
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
        
        KC.state.missionParams = {
            regionMode: lesson.params?.regionMode || 0,
            reflexMode: lesson.params?.reflexMode || 2,
            difficulty: lesson.params?.difficulty || 3,
            lengthMode: 1
        };

        // v2.82.3: Correctly route to the actual Briefing renderer
        this.renderMissionStart(lesson);
    },

    renderMissionStart: function(lesson, silent = false) {
        KC.core.stopNagTimer();
        KC.state.status = "MISSION_START";
        KC.state.activeLesson = lesson;
        
        if (!KC.state.missionParams) {
            KC.state.missionParams = { reflexMode: 0, regionMode: 0, lengthMode: 0, difficulty: 1 };
        }
        
        const params = KC.state.missionParams;
        const isRace = (lesson.id === "D00-MISSION-RACE");
        const isStream = (lesson.generator === "stream");
        
        // Length Logic
        let lenLabel = "";
        if (isRace) {
            if (params.lengthMode === 0) { lesson.drill_length = 8; lenLabel = "SHORT (8)"; }
            else if (params.lengthMode === 1) { lesson.drill_length = 14; lenLabel = "MEDIUM (14)"; }
            else { lesson.drill_length = 20; lenLabel = "LONG (20)"; }
        } else if (isStream) {
            if (params.lengthMode === 0) { lenLabel = "SHORT (3x10s)"; }
            else if (params.lengthMode === 1) { lenLabel = "MEDIUM (3x20s)"; }
            else { lenLabel = "LONG (3x30s)"; }
        } else {
            if (params.lengthMode === 0) { lesson.drill_length = 12; lenLabel = "SHORT (12)"; }
            else if (params.lengthMode === 1) { lesson.drill_length = 24; lenLabel = "MEDIUM (24)"; }
            else { lesson.drill_length = 36; lenLabel = "LONG (36)"; }
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
                1: { name: "NOVICE (1600ms)", floor: 3000 },
                2: { name: "STANDARD (1400ms)", floor: 2500 },
                3: { name: "HARD (1200ms)", floor: 2000 },
                4: { name: "ELITE (1000ms)", floor: 1500 },
                5: { name: "COMMANDER (800ms)", floor: 1200 }
            };
            const d = diffMap[params.difficulty] || diffMap[1];
            diffName = d.name;
            diffFloor = d.floor;
        }
        
        lesson.time_floor = diffFloor; 

        // Target Area Logic
        let modeName = "Standard Sequence";
        const currentRegions = this.getRegions(lesson);
        
        // Safety Catch: The "State Carryover" Trap
        let rMode = params.regionMode || 0;
        if (rMode >= currentRegions.length) {
            rMode = 0;
            params.regionMode = 0; // Force reset state
        }

        if (lesson.generator === "reflex" || lesson.generator === "succession" || lesson.generator === "stream" || isRace) {
            const region = currentRegions[rMode] || currentRegions[0];
            
            if (region.forceBoth) {
                modeName = region.name;
            } else {
                const hands = ["Left Hand", "Right Hand", "Both Hands"];
                modeName = `${region.name} - ${hands[params.reflexMode]}`;
            }
        }

        let content = `MISSION BRIEFING: ${lesson.name.toUpperCase()}\n`;
        content += `${lesson.briefing || "No intel available."}\n\n`;
        content += `[ MISSION CONFIGURATION ]\n`;
        content += `LENGTH: ${lenLabel}\n`;
        content += `DIFFICULTY: ${diffName}\n`;
        
        if (lesson.generator === "reflex" || lesson.generator === "succession" || lesson.generator === "stream") {
            content += `TARGET ZONE: ${modeName}\n`;
        }
        
        content += `\n[ Press ENTER to Initiate ]\n[ Press ESC to Abort ]`;
        content += `\n[ Settings: 1-5 Diff, PgUp/Dn Length, L/R Hands, Up/Dn Rows ]`;

        KC.els.displayText.textContent = content;
        
        if (!silent) {
            const intro = `Mission: ${lesson.name}. Length: ${lenLabel}. Difficulty: ${diffName}. Target Zone: ${modeName}. Press Enter to Start.`;
            KC.core.announce(intro);
        }
    },

    changeMissionSetting: function(dir) {
        if (KC.audio.playSynth) KC.audio.playSynth(34); else KC.audio.playSound('click'); 
        
        const lesson = KC.state.activeLesson;
        const currentRegions = this.getRegions(lesson);
        let rMode = KC.state.missionParams.regionMode || 0;
        if (rMode >= currentRegions.length) rMode = 0;
        
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
        
        const isRace = (KC.state.activeLesson.id === "D00-MISSION-RACE");
        const isStream = (KC.state.activeLesson.generator === "stream");
        
        let label = "";
        if (isStream) {
            if (current === 0) label = "SHORT (3x10s)";
            else if (current === 1) label = "MEDIUM (3x20s)";
            else label = "LONG (3x30s)";
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

    changeDifficulty: function(level) {
        if (level < 1 || level > 5) return;
        if (KC.audio.playSynth) KC.audio.playSynth(57); else KC.audio.playSound('click'); // v2.73.1
        KC.state.missionParams.difficulty = level;
        this.renderMissionStart(KC.state.activeLesson, true);
        
        const isRace = (KC.state.activeLesson.id === "D00-MISSION-RACE");
        let desc = "";
        if (isRace) {
            const raceSpeed = 2400 - (level * 400);
            const speedSec = (raceSpeed / 1000).toFixed(1);
            const raceTitles = { 1: "CADET", 2: "ENSIGN", 3: "VETERAN", 4: "ELITE", 5: "COMMANDER" };
            desc = `${raceTitles[level]} (${speedSec}s)`;
        } else {
             const diffMap = { 1: "NOVICE (1600ms)", 2: "STANDARD (1400ms)", 3: "HARD (1200ms)", 4: "ELITE (1000ms)", 5: "COMMANDER (800ms)" };
            desc = diffMap[level];
        }
        KC.core.announce(`Difficulty ${level}: ${desc}`);
    },

    executeMission: function() {
        const lesson = KC.state.activeLesson;
        if (!lesson) {
            console.error("Launch Failed: No activeLesson in state.");
            KC.hub.enterHub();
            return;
        }

        // v2.87: Safety check for handler existence before starting countdown
        const handler = (lesson.generator === "reflex") ? KC.handlers.reflex : 
                        (lesson.generator === "race") ? KC.handlers.race : 
                        (lesson.generator === "stream") ? KC.handlers.stream : null;

        if (!handler) {
            KC.core.announce("Critical Error: Mission handler not found.");
            console.error("Handler missing for generator:", lesson.generator);
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
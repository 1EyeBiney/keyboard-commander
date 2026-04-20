/* kc_hub.js - v2.95 */

KC.hub = {
    
    renderMenu: function() {
        KC.core.loadRoster();
        this.renderLogin(true);
    },

    renderLogin: function(isEntering = false) {
        KC.state.status = "LOGIN";
        KC.state.menuSelection = KC.state.menuSelection || 0;
        if(KC.input && KC.input.flush) KC.input.flush();
        KC.core.updateStatusBar();
        document.body.classList.add('theme-login');

        let content = "TERMINAL LOGIN\nSelect Profile or Create New:\n\n";
        const options = ["Create New Cadet", ...KC.state.roster, "Exit"];

        options.forEach((opt, index) => {
            const cursor = (index === KC.state.menuSelection) ? "> " : "  ";
            content += `${cursor}${opt}\n`;
        });

        KC.els.displayText.textContent = content + "\n\n[Arrows/Letters to Select, Enter to Confirm]";
        KC.els.statusBar.textContent = "Awaiting Login...";

        const currentOpt = options[KC.state.menuSelection];

        if (isEntering) {
            if (KC.bgm && !KC.bgm.isInitialized) {
                KC.bgm.init();
                KC.bgm.start("default", 10);
            }
            setTimeout(() => {
                KC.core.announce(`Welcome to Keyboard Commander. Select your profile. Use up and down arrows to navigate and Enter to select. ${currentOpt}.`);
            }, 600);
        } else {
            KC.core.announce(currentOpt);
        }
    },

    navigateLogin: function(dir) {
        const options = ["Create New Cadet", ...KC.state.roster, "Exit"];
        KC.state.menuSelection += dir;
        if (KC.state.menuSelection < 0) KC.state.menuSelection = options.length - 1;
        if (KC.state.menuSelection >= options.length) KC.state.menuSelection = 0;
        this.renderLogin(false);
    },

    selectLogin: function() {
        const options = ["Create New Cadet", ...KC.state.roster, "Exit"];
        const selection = options[KC.state.menuSelection];

        if (selection === "Create New Cadet") {
            KC.state.status = "LOGIN_INPUT";
            KC.els.displayText.textContent = ">> NEW CADET REGISTRATION <<\n\nEnter your Callsign (Name):\n\n[Type name and press Enter]";
            KC.core.announce("New Cadet Registration. Type your name and press Enter.");
            if(KC.els.inputTrap) KC.els.inputTrap.focus();
        } else if (selection === "Exit") {
            KC.audio.playSound('click');
            location.reload();
        } else {
            KC.core.loadProfile(selection);
            if (KC.bgm) KC.bgm.applyProfileSettings(KC.state.profile);
            this.routeProfileBoot();
        }
    },

    routeProfileBoot: function() {
        document.body.classList.remove('theme-login');
        
        // If they have cleared the tutorial deck, send them straight to the Hub
        if (KC.state.profile.currentDeck > 0) {
            this.enterHub();
            return;
        } 
        
        const targetID = KC.state.profile.currentLessonID || "D00-01";
        const resumeLesson = GAME_DATA.lessons[targetID];
        
        if (!resumeLesson) {
             // Fallback in case of corruption
             this.enterHub();
             return;
        }

        KC.els.displayText.textContent = `WELCOME BACK, ${KC.state.profile.name.toUpperCase()}\n[Press Enter to Resume: ${resumeLesson.name}]`;
        KC.state.status = "MENU";
        KC.core.announce(`Welcome back ${KC.state.profile.name}. Press Enter to start ${resumeLesson.name}.`);
    },

    enterHub: function() {
        document.body.classList.remove('theme-login', 'theme-race', 'theme-reflex', 'theme-stream');
        KC.state.status = "HUB";
        if(KC.input && KC.input.flush) KC.input.flush();
        
        if (typeof KC.state.menuSelection === 'undefined') {
            KC.state.menuSelection = 0;
        }
        
        KC.state.status = "MENU_NAV";
        
        this.renderGameMenu(true);
    },

    getHubMenu: function(deckID) {
        const baseMenu = GAME_DATA.hubs[deckID].menu;
        const callsign = KC.state.profile && KC.state.profile.name ? KC.state.profile.name : "";
        const devUnlocked = callsign === "BRIAN" || callsign.toLowerCase().includes("bot");
        return baseMenu.filter(item => item.type !== "stay_out" || devUnlocked);
    },

    renderGameMenu: function(isEntering = false) {
        const deckID = KC.state.profile.currentDeck || 0;
        const menuItems = this.getHubMenu(deckID);
        const deckName = GAME_DATA.hubs[deckID].name;
        
        let content = `LOCATION: ${deckName.toUpperCase()}\n\n`;
        let announcement = "";

        if (isEntering) {
            let spokenDeck = deckName;
            const match = deckName.match(/\(([^)]+)\)/); 
            if (match) spokenDeck = match[1];
            announcement += `${spokenDeck}. `;
        }
        
        menuItems.forEach((item, index) => {
            const cursor = (index === KC.state.menuSelection) ? "> " : "  ";
            content += `${cursor}${item.label}\n`;
            
            if (index === KC.state.menuSelection) {
                announcement += item.label;

                if (item.desc) {
                    announcement += `. ${item.desc}`;
                }

                if (item.type === "mission") {
                    const est = KC.mission.getMissionRewardEstimate(item.target_id);
                    announcement += ` Reward ${est}.`;
                    KC.els.statusBar.textContent = `${item.label} | Est. Reward: ${est}`;
                } else {
                    KC.els.statusBar.textContent = "Deck Menu | Navigation Active";
                }
            }
        });
        
        content += "\n[Arrows to Select, Enter to Activate]";
        KC.els.displayText.textContent = content;
        
        setTimeout(() => {
            KC.core.announce(announcement);
        }, 100);
    },
    
    activateMenuItem: function() {
        if (KC.audio.playSynth) KC.audio.playSynth(57); else KC.audio.playSound('success');
        
        const deckID = KC.state.profile.currentDeck || 0;
        const menuItems = GAME_DATA.hubs[deckID].menu;
        const selected = menuItems[KC.state.menuSelection];
        
        if (!selected) return;

        KC.core.announce(`${selected.label} Selected.`);

        if (selected.type === "mission") {
            setTimeout(() => {
                KC.mission.loadLesson(selected.target_id);
            }, 600);
        } else if (selected.type === "arcade") {
            setTimeout(() => {
                this.enterArcade();
            }, 600);
        } else if (selected.type === "engineering") {
             setTimeout(() => {
                 // Engineering Module stub
                 KC.core.announce("Engineering offline.");
             }, 600);
        } else {
            setTimeout(() => {
                KC.core.announce("Module offline. Development pending.");
            }, 600);
        }
    },
    
    // --- ARCADE ---
    enterArcade: function() {
        KC.state.status = "ARCADE";
        if(KC.input && KC.input.flush) KC.input.flush();
        KC.state.arcade.index = 0;
        this.renderArcade(true);
    },

    renderArcade: function(isCategoryChange = false) {
        const depts = GAME_DATA.arcade;
        if (KC.state.arcade.tab >= depts.length) KC.state.arcade.tab = 0;
        if (KC.state.arcade.tab < 0) KC.state.arcade.tab = depts.length - 1;
        
        const currentDept = depts[KC.state.arcade.tab];
        if (KC.state.arcade.index >= currentDept.items.length) KC.state.arcade.index = 0;
        if (KC.state.arcade.index < 0) KC.state.arcade.index = currentDept.items.length - 1;
        
        let content = `ARCADE: ${currentDept.name.toUpperCase()} [${KC.state.arcade.tab+1}/${depts.length}]\n\n`;
        let activeItem = null;

        currentDept.items.forEach((item, i) => {
            const marker = (i === KC.state.arcade.index) ? "> " : "  ";
            content += `${marker}${item.name} (Reward: ${item.reward_est})\n`;
            if (i === KC.state.arcade.index) activeItem = item;
        });
        
        content += `\n[INFO]: ${activeItem.desc}\nOBJ: ${activeItem.obj}`;
        KC.els.displayText.textContent = content;

        let audioPrompt = "";
        if (isCategoryChange) audioPrompt += `Category: ${currentDept.name}. `;
        audioPrompt += `${activeItem.name}. Reward ${activeItem.reward_est}.`;
        KC.core.announce(audioPrompt);
    },

    processArcadeSelection: function() {
        const dept = GAME_DATA.arcade[KC.state.arcade.tab];
        const item = dept.items[KC.state.arcade.index];
        KC.mission.loadLesson(item.target_id);
    },

    // --- FABRICATOR ---
    enterFabricator: function() {
        KC.state.status = "FABRICATOR";
        if(KC.input && KC.input.flush) KC.input.flush();
        this.renderFabricator(true);
    },

    renderFabricator: function(isCategoryChange = false) {
        const categories = GAME_DATA.fabricator_recipes;
        if (KC.state.fabCategoryIndex >= categories.length) KC.state.fabCategoryIndex = 0;
        if (KC.state.fabCategoryIndex < 0) KC.state.fabCategoryIndex = categories.length - 1;

        const cat = categories[KC.state.fabCategoryIndex];
        if (KC.state.fabItemIndex >= cat.items.length) KC.state.fabItemIndex = 0;
        if (KC.state.fabItemIndex < 0) KC.state.fabItemIndex = cat.items.length - 1;

        let content = `FABRICATOR: ${cat.category} [${KC.state.fabCategoryIndex+1}/${categories.length}]\n\n`;
        let activeItem = null;

        cat.items.forEach((item, i) => {
            const marker = (i === KC.state.fabItemIndex) ? "> " : "  ";
            content += `${marker}${item.name} - Cost: ${item.cost_val} ${item.cost_type}\n`;
            if (i === KC.state.fabItemIndex) activeItem = item;
        });

        content += `\n[INFO]: ${activeItem.desc}`;
        KC.els.displayText.textContent = content;
        
        let audioPrompt = "";
        if (isCategoryChange) audioPrompt += `Category: ${cat.category}. `;
        audioPrompt += `${activeItem.name}. Cost ${activeItem.cost_val} ${activeItem.cost_type}.`;
        KC.core.announce(audioPrompt);
    },

    processTransaction: function() {
        const cat = GAME_DATA.fabricator_recipes[KC.state.fabCategoryIndex];
        const item = cat.items[KC.state.fabItemIndex];
        const wallet = KC.state.profile.wallet;

        let canAfford = false;
        if (item.cost_type === "data_blocks" && wallet.data_blocks >= item.cost_val) canAfford = true;
        if (item.cost_type === "glitch" && wallet.glitch >= item.cost_val) canAfford = true;
        if (item.cost_type === "logic_shards" && wallet.logic_shards >= item.cost_val) canAfford = true;

        if (!canAfford) {
            KC.audio.playSound('error');
            KC.core.announce("Insufficient funds.");
            return;
        }

        if (item.cost_type === "data_blocks") wallet.data_blocks -= item.cost_val;
        if (item.cost_type === "glitch") wallet.glitch -= item.cost_val;
        if (item.cost_type === "logic_shards") wallet.logic_shards -= item.cost_val;

        if (item.action === "clear_glitch") {
            wallet.glitch = 0;
            KC.core.announce("System Purged. Glitch levels nominal.");
        } else if (item.action === "add_item") {
            // Check if inventory property exists, if not initialize it
            if (!KC.state.profile.inventory) KC.state.profile.inventory = { patches: 0 };
            if (!KC.state.profile.inventory[item.item_key]) KC.state.profile.inventory[item.item_key] = 0;
            KC.state.profile.inventory[item.item_key]++;
            KC.core.announce(`Fabricated ${item.name}.`);
        } else if (item.action === "mystery_swap") {
            const outcome = Math.random() > 0.5 ? 50 : 5;
            wallet.data_blocks += outcome;
            KC.core.announce(`Glitch converted to ${outcome} Data Blocks.`);
        }

        KC.core.saveProgress();
        KC.audio.playSound('success');
        this.renderFabricator(false);
    },
    
    // --- ENGINEERING ---
    enterEngineering: function() {
        KC.state.status = "ENGINEERING";
        if(KC.input && KC.input.flush) KC.input.flush();
        this.renderEngineering(true);
    },

    renderEngineering: function(isCategoryChange = false) {
        const categories = GAME_DATA.engineering;
        if (KC.state.engCategoryIndex >= categories.length) KC.state.engCategoryIndex = 0;
        if (KC.state.engCategoryIndex < 0) KC.state.engCategoryIndex = categories.length - 1;

        const cat = categories[KC.state.engCategoryIndex];
        if (KC.state.engItemIndex >= cat.items.length) KC.state.engItemIndex = 0;
        if (KC.state.engItemIndex < 0) KC.state.engItemIndex = cat.items.length - 1;

        let content = `ENGINEERING: ${cat.category} [${KC.state.engCategoryIndex+1}/${categories.length}]\n\n`;
        let activeItem = null;

        cat.items.forEach((item, i) => {
            const marker = (i === KC.state.engItemIndex) ? "> " : "  ";
            content += `${marker}${item.name} - Cost: ${item.cost_val} ${item.cost_type}\n`;
            if (i === KC.state.engItemIndex) activeItem = item;
        });

        content += `\n[INFO]: ${activeItem.desc}`;
        KC.els.displayText.textContent = content;

        let audioPrompt = "";
        if (isCategoryChange) audioPrompt += `Category: ${cat.category}. `;
        audioPrompt += `${activeItem.name}. Cost ${activeItem.cost_val} ${activeItem.cost_type}.`;
        KC.core.announce(audioPrompt);
    },

    processEngineeringTransaction: function() {
        const cat = GAME_DATA.engineering[KC.state.engCategoryIndex];
        const item = cat.items[KC.state.engItemIndex];
        const wallet = KC.state.profile.wallet;

        let canAfford = false;
        if (item.cost_type === "logic_shards" && wallet.logic_shards >= item.cost_val) canAfford = true;

        if (!canAfford) {
            KC.audio.playSound('error');
            KC.core.announce("Insufficient Logic Shards.");
            return;
        }

        wallet.logic_shards -= item.cost_val;
        KC.core.announce(`Module ${item.name} installed.`);
        KC.core.saveProgress();
        KC.audio.playSound('success');
        this.renderEngineering(false);
    },

    openGameMenu: function() {
        if (KC.state.status !== "HUB") this.enterHub();
    },
    
    // --- CACHE (WALLET & INVENTORY) ---
    enterDataCache: function() {
        KC.state.status = "CACHE";
        if(KC.input && KC.input.flush) KC.input.flush();
        
        // Initialize Cache State to prevent crashes
        if (!KC.state.cache) {
            KC.state.cache = { tab: 0, index: 0 };
        } else {
            KC.state.cache.tab = 0;
            KC.state.cache.index = 0;
        }
        
        this.renderDataCache(true);
    },
    
    renderDataCache: function(isEntering = false) {
        // Bounds checking
        if (KC.state.cache.tab > 1) KC.state.cache.tab = 0;
        if (KC.state.cache.tab < 0) KC.state.cache.tab = 1;

        let header = "DATA CACHE TERMINAL\n-------------------\n";
        let content = "";
        let lines = [];
        let audioPrompt = "";

        if (isEntering) {
            audioPrompt += "Data Cache accessed. ";
        }

        const wallet = KC.state.profile.wallet;
        const inv = KC.state.profile.inventory || { patches: 0 };

        if (KC.state.cache.tab === 0) {
            const w = KC.state.profile.wallet;
            lines = [
                `DATA BLOCKS: ${w.data_blocks}. Earned based on total mission keystrokes.`,
                `LOGIC SHARDS: ${w.logic_shards || 0}. Precision reward for 90% accuracy or higher.`,
                `SYNC SPARKS: ${w.sync_sparks || 0}. Velocity reward based on Transmission Rate and Difficulty.`,
                `CONSECUTIVE COINS: ${w.consecutive_coins || 0}. Focus reward for every 15-key perfect streak.`,
                `GLITCH: ${w.glitch || 0}. System penalty accumulated 1 to 1 for every typing error.`
            ];
            audioPrompt += `Tab: Crypto Wallet. Data Blocks: ${w.data_blocks}.`;
        }
        else {
            lines = [
                `ALGORITHM PATCHES: ${inv.patches || 0}`
            ];
            audioPrompt += `Tab: Hardware Inventory. Algorithm Patches: ${inv.patches || 0}.`;
        }

        lines.forEach(l => content += l + "\n");
        content += `\n\n[Left/Right to Switch Tabs, Up/Down to Read, Esc to Exit]`;
        
        KC.els.displayText.textContent = header + content;
        KC.state.cacheLines = lines;
        KC.core.announce(audioPrompt);
    },
    
    navigateCacheContent: function(dir) {
        if (!KC.state.cacheLines) return;
        if (typeof KC.state.cache.index === 'undefined') KC.state.cache.index = 0;
        
        KC.state.cache.index += dir;
        if (KC.state.cache.index < 0) KC.state.cache.index = 0;
        if (KC.state.cache.index >= KC.state.cacheLines.length) KC.state.cache.index = KC.state.cacheLines.length - 1;
        
        const line = KC.state.cacheLines[KC.state.cache.index];
        KC.els.displayText.textContent = `> ${line}\n\n[Reading Line ${KC.state.cache.index+1}]`;
        KC.core.announce(line);
    },

    enterArchive: function() {
        KC.state.status = "ARCHIVE";
        if(KC.input && KC.input.flush) KC.input.flush();
        
        // Initialize Archive State to prevent crashes
        if (!KC.state.archive) {
            KC.state.archive = { tab: 0, index: 0 };
        } else {
            KC.state.archive.tab = 0;
            KC.state.archive.index = 0;
        }
        
        this.renderArchive(true);
    },

    renderArchive: function(isEntering = false) {
        KC.state.status = "ARCHIVE";
        if (!KC.state.archive) KC.state.archive = { tab: 0, index: 0 };
        
        const career = KC.state.profile.career;
        const history = career.history_buffer || [];
        const zones = Object.keys(career.zone_stats || {});
        
        let header = ">> SYSTEM ARCHIVE <<\n";
        let content = "";
        let audioPrompt = "";

        if (KC.state.archive.tab === 0) {
            header += "CATEGORY: RECENT MISSION HISTORY\n--------------------------------\n";
            if (history.length === 0) {
                content = "No mission data recorded in local buffer.";
                audioPrompt = "Archive: Recent History. No data recorded.";
            } else {
                const entry = history[history.length - 1 - KC.state.archive.index];
                const dateStr = new Date(entry.date).toLocaleDateString();
                content = `Entry ${KC.state.archive.index + 1} of ${history.length}\n`;
                content += `DATE: ${dateStr}\nMISSION: ${entry.id}\nREGION: ${entry.region}\nWPM: ${entry.wpm}\nACCURACY: ${entry.acc}%\nGRADE: ${entry.grade}`;
                audioPrompt = `History Entry ${KC.state.archive.index + 1}. ${entry.id} in ${entry.region}. ${entry.wpm} TRS. Accuracy ${entry.acc} percent.`;
            }
        } else {
            header += "CATEGORY: ZONE MASTERY\n--------------------------------\n";
            if (zones.length === 0) {
                content = "No keyboard zones registered.";
                audioPrompt = "Archive: Zone Mastery. No zones registered.";
            } else {
                const zoneName = zones[KC.state.archive.index];
                const stat = career.zone_stats[zoneName];
                const avgWPM = Math.round(stat.wpmSum / stat.missions);
                const avgAcc = Math.round(stat.accSum / stat.missions);
                content = `Zone ${KC.state.archive.index + 1} of ${zones.length}\n`;
                content += `REGION: ${zoneName}\nTOTAL MISSIONS: ${stat.missions}\nAVG WPM: ${avgWPM}\nAVG ACCURACY: ${avgAcc}%`;
                audioPrompt = `Zone ${KC.state.archive.index + 1}. ${zoneName}. ${stat.missions} missions completed. Average Speed ${avgWPM}. Average Accuracy ${avgAcc} percent.`;
            }
        }

        KC.els.displayText.textContent = header + "\n" + content + "\n\n[Left/Right: Switch Category | Up/Down: Scroll Entries | Esc: Exit]";
        KC.core.announce(audioPrompt);
    },

    navigateArchiveContent: function(dir) {
        const career = KC.state.profile.career;
        let max = 0;
        if (KC.state.archive.tab === 0) {
            max = (career.history_buffer) ? career.history_buffer.length : 0;
        } else {
            max = Object.keys(career.zone_stats || {}).length;
        }

        KC.state.archive.index += dir;
        if (KC.state.archive.index < 0) KC.state.archive.index = 0;
        if (KC.state.archive.index >= max) KC.state.archive.index = Math.max(0, max - 1);
        
        this.renderArchive();
    }
};
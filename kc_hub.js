/* kc_hub.js - v2.95 */

KC.hub = {
    
    renderMenu: function() {
        KC.core.loadRoster();
        this.renderLogin();
    },

    renderLogin: function() {
        KC.state.status = "LOGIN";
        KC.state.menuSelection = 0;
        if(KC.input && KC.input.flush) KC.input.flush();
        KC.core.updateStatusBar();

        let content = "TERMINAL LOGIN\nSelect Profile or Create New:\n\n";
        const options = ["Create New Cadet", ...KC.state.roster];

        options.forEach((opt, index) => {
            const cursor = (index === KC.state.menuSelection) ? "> " : "  ";
            content += `${cursor}${opt}\n`;
        });

        KC.els.displayText.textContent = content + "\n\n[Arrows to Select, Enter to Confirm]";
        KC.els.statusBar.textContent = "Awaiting Login...";

        setTimeout(() => {
            const currentOpt = options[KC.state.menuSelection];
            KC.core.announce(`Terminal Login. ${currentOpt}. Use arrows to navigate, press Enter to select.`);
        }, 600);
    },

    navigateLogin: function(dir) {
        const options = ["Create New Cadet", ...KC.state.roster];
        KC.state.menuSelection += dir;
        if (KC.state.menuSelection < 0) KC.state.menuSelection = options.length - 1;
        if (KC.state.menuSelection >= options.length) KC.state.menuSelection = 0;

        this.renderLogin();
    },

    selectLogin: function() {
        const options = ["Create New Cadet", ...KC.state.roster];
        const selection = options[KC.state.menuSelection];

        if (selection === "Create New Cadet") {
            KC.state.status = "LOGIN_INPUT";
            KC.els.displayText.textContent = ">> NEW CADET REGISTRATION <<\n\nEnter your Callsign (Name):\n\n[Type name and press Enter]";
            KC.core.announce("New Cadet Registration. Type your name and press Enter.");
            if(KC.els.inputTrap) KC.els.inputTrap.focus();
        } else {
            KC.core.loadProfile(selection);
            this.routeProfileBoot();
        }
    },

    routeProfileBoot: function() {
        if (KC.state.profile.currentLessonIndex >= 26) {
            this.enterHub();
        } else {
            const resumeLesson = GAME_DATA.lessons[KC.state.profile.currentLessonIndex] || GAME_DATA.lessons["D00-01"];
            KC.els.displayText.textContent = `WELCOME BACK, ${KC.state.profile.name.toUpperCase()}\n[Press Enter to Resume: ${resumeLesson.name}]`;
            KC.state.status = "MENU";
            KC.core.announce(`Welcome back ${KC.state.profile.name}. Press Enter to start ${resumeLesson.name}.`);
        }
    },

    enterHub: function() {
        KC.state.status = "HUB";
        if(KC.input && KC.input.flush) KC.input.flush();
        
        if (typeof KC.state.menuSelection === 'undefined') {
            KC.state.menuSelection = 0;
        }
        
        KC.state.status = "MENU_NAV";
        
        this.renderGameMenu(true);
    },

    renderGameMenu: function(isEntering = false) {
        const deckID = KC.state.profile.currentDeck || 0;
        const menuItems = GAME_DATA.hubs[deckID].menu;
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
        // Bounds checking to prevent crashes
        if (KC.state.archive.tab > 1) KC.state.archive.tab = 0;
        if (KC.state.archive.tab < 0) KC.state.archive.tab = 1;

        let header = "ARCHIVE TERMINAL\n----------------\n";
        let content = "";
        let lines = [];
        let audioPrompt = "";

        if (isEntering) {
            audioPrompt += "Archive accessed. ";
        }

        if (KC.state.archive.tab === 0) {
            const c = KC.state.profile.career;
            const acc = c.total_keys > 0 ? Math.round(((c.total_keys - c.total_errors) / c.total_keys) * 100) : 100;
            lines = [
                `RANK: ${KC.state.profile.rank.toUpperCase()}`,
                `ACCURACY: ${acc}%`,
                `TOTAL KEYSTROKES: ${c.total_keys}`,
                `MISSIONS COMPLETED: ${c.missions_completed}`
            ];
            audioPrompt += `Tab: Career Profile. Rank ${KC.state.profile.rank}.`;
        }
        else {
            lines = ["Archive entry loaded.", "Accessing database...", "No additional logs found in this sector."];
            audioPrompt += `Tab: Database Logs. Entry accessed.`;
        }

        lines.forEach(l => content += l + "\n");
        content += `\n\n[Left/Right to Switch Tabs, Up/Down to Read, Esc to Exit]`;
        
        KC.els.displayText.textContent = header + content;
        KC.state.archiveLines = lines;
        KC.core.announce(audioPrompt);
    },

    navigateArchiveContent: function(dir) {
        if (!KC.state.archiveLines) return;
        if (typeof KC.state.archive.index === 'undefined') KC.state.archive.index = 0;
        
        KC.state.archive.index += dir;
        if (KC.state.archive.index < 0) KC.state.archive.index = 0;
        if (KC.state.archive.index >= KC.state.archiveLines.length) KC.state.archive.index = KC.state.archiveLines.length - 1;
        
        const line = KC.state.archiveLines[KC.state.archive.index];
        KC.els.displayText.textContent = `> ${line}\n\n[Reading Line ${KC.state.archive.index+1}]`;
        KC.core.announce(line);
    }
};
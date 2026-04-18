/* kc_tutorial.js */

KC.tutorial = {
    startLesson: function(lesson) {
        KC.state.status = "TUTORIAL";
        KC.state.activeLesson = lesson;
        
        // Reset Tutorial-Specific State
        KC.state.pointer = 0;
        
        let prompt = lesson.briefing_prompt || "Press Enter to continue.";
        
        // v1.61.7: Update global prompt state so Audio engine sees it
        KC.state.currentPrompt = prompt;

        KC.els.displayText.textContent = `${lesson.briefing || lesson.name}\n\n[${prompt}]`;
        KC.els.statusBar.textContent = `TUTORIAL: ${lesson.name} | Rank: ${KC.state.profile.rank}`;

        // Play Audio
        KC.audio.playAudio(lesson.audio_briefing, (lesson.briefing || "") + " " + prompt, () => {
            if (!lesson.auto_start || lesson.force_prompt) {
                KC.core.announce(prompt);
            }
        });

        if (lesson.auto_start) {
            this.initInput();
        }
    },

    handleGlobalKeys: function(e) {
        const lesson = KC.state.activeLesson;

        // Shift+Enter Logic (Special per tutorial)
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            if (lesson.tutorial_action === "shortcut_drill") {
                // Special case: Lesson 2 requires Shift+Enter to WIN
                this.completeLesson();
            } else {
                // v1.61.7: Use local replay logic for reliability
                this.replayLessonAudio();
            }
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (lesson.tutorial_action === "shortcut_drill") {
                KC.core.announce("Incorrect. Press Shift plus Enter.");
                return;
            }
            // Normal progression
            if (!lesson.sequence || lesson.sequence === "") { 
                this.completeLesson(); 
            } else { 
                // v1.66.2: Kill audio when skipping from Briefing to Input
                KC.audio.stopActiveAudio();
                this.initInput(); 
            }
        }
    },

    // v1.61.7: Dedicated Replay Function
    replayLessonAudio: function() {
        const lesson = KC.state.activeLesson;
        const prompt = KC.state.currentPrompt || "Press Enter.";
        
        KC.core.announce("Replaying...");
        
        // Direct call to playAudio
        KC.audio.playAudio(lesson.audio_briefing, (lesson.briefing || "") + " " + prompt, () => {
            if (!lesson.auto_start || lesson.force_prompt) {
                KC.core.announce(prompt);
            }
        });
    },

    initInput: function() {
        KC.state.status = "TUTORIAL"; 
        const lesson = KC.state.activeLesson;
        KC.els.displayText.textContent = lesson.sequence;
        KC.els.inputTrap.value = '';
        KC.els.inputTrap.focus();
        
        if (!lesson.audio_briefing) { 
            this.announceNext(); 
        } else {
            setTimeout(() => this.announceNext(), 100);
        }
    },

    announceNext: function() {
        const lesson = KC.state.activeLesson;
        if (KC.state.pointer >= lesson.sequence.length) return;

        let cue = "";
        if (lesson.custom_cues && lesson.custom_cues[KC.state.pointer]) {
            cue = lesson.custom_cues[KC.state.pointer];
        } else {
            const targetChar = lesson.sequence[KC.state.pointer];
            cue = `Type ${targetChar}`;
            if (targetChar === " ") cue = "Space";
        }
        
        let audioPath = null;
        if (lesson.audio_cues && lesson.audio_cues[KC.state.pointer]) {
            audioPath = lesson.audio_cues[KC.state.pointer];
        }

        if (audioPath) {
            KC.audio.playAudio(audioPath, cue, null);
        } else {
            KC.core.announce(cue);
        }
    },

    handleTyping: function(e) {
        const inputChar = e.data;
        if (!inputChar) return;

        const lesson = KC.state.activeLesson;
        const targetChar = lesson.sequence[KC.state.pointer];

        if (inputChar.toLowerCase() === targetChar.toLowerCase()) {
            KC.audio.playSound('click');
            KC.state.pointer++;
            if (KC.state.pointer < lesson.sequence.length) {
                setTimeout(() => this.announceNext(), 100);
            } else {
                this.completeLesson();
            }
        } else {
            KC.audio.playSound('error');
            this.announceNext();
        }
        KC.els.inputTrap.value = '';
    },

    completeLesson: function() {
        KC.audio.stopActiveAudio();
        KC.audio.playSound('success');
        
        const nextIndex = KC.state.profile.currentLessonIndex + 1;
        KC.state.profile.currentLessonIndex = nextIndex;
        KC.core.saveProgress();

        // Check if there is a next tutorial
        const nextLesson = GAME_DATA.lessons[nextIndex];
        
        if (nextLesson) {
            // v1.68.2: Relaxed Type Checking. 
            // If it's a tutorial, stay here. If it's anything else (mission), go to mission loader.
            if (nextLesson.type === "tutorial") {
                this.startLesson(nextLesson);
            } else {
                KC.mission.loadLesson(nextIndex);
            }
        } else {
            // End of content -> Go to Hub
            KC.hub.enterHub();
        }
    }
};
/* mission_archive.js - v0.1.0
 *
 * "The Earth Archive" — Library Mode (parallel track; does NOT feed 9-Quadrant career).
 *
 * Audience : Visually impaired users, ESL learners, absolute keyboard beginners.
 * Pacing   : Zero time pressure. Educational/exploratory.
 * Lore     : Snippy defragments Ancient Earth Archives; Amelia prompts Cadet to
 *            type simple animal names from audio cues.
 *
 * Sentinel Compliance:
 *   S1 — strict === checks on state + key matches.
 *   S2 — every async VO chain captures `dictationId` and aborts on token drift.
 *   S3 — stop() iterates timeouts, nulls token, calls stopActiveAudio().
 *   S4 — `if (e.repeat) return;` is the absolute first gate in handleInput.
 *   S6 — exit path defers to KC.input + KC.mission.abortActiveMission (engine-driven).
 *   S7 — feedback uses KC.core.announce / VO bank; no native modals.
 *   S8 — full functional blocks; no truncation placeholders.
 */

window.KC = window.KC || {};
KC.handlers = KC.handlers || {};
KC.mission  = KC.mission  || {};

/* =========================================================================
 *  1. GAME DATA — Vocabulary + Feedback Banks
 *  Additive only. Live keys must remain verbatim (audio key contract).
 * ========================================================================= */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.archive_vocab = [
    // ---------------- Volume 1 — 3-4 letters, common keys ----------------
    {
        id: "cat",
        word: "CAT",
        volume: 1,
        audio: {
            cue:     "arc_cat_cue",        // diegetic SFX (the meow)
            prompt:  "arc_amelia_spell_cat",
            success: "arc_cat_win"
        }
    },
    {
        id: "dog",
        word: "DOG",
        volume: 1,
        audio: {
            cue:     "arc_dog_cue",        // bark
            prompt:  "arc_amelia_spell_dog",
            success: "arc_dog_win"
        }
    },

    // ---------------- Volume 3 — Rare keys (Q/Z/X) -----------------------
    {
        id: "fox",
        word: "FOX",
        volume: 3,
        audio: {
            cue:     "arc_fox_cue",        // fox call
            prompt:  "arc_amelia_spell_fox",
            success: "arc_fox_win"
        }
    }
];

// Per-letter feedback is GLOBAL (not per-word) — keeps the asset bank lean.
GAME_DATA.archive_letterFeedback = {
    correct: "arc_letter_ok",              // short triumph chime
    wrong:   "arc_letter_buzz"             // gentle buzz
};

// Spatial nudge VO bank, addressed by distance bucket + cardinal direction.
GAME_DATA.archive_proximityVO = {
    adjacent: {  // Chebyshev distance <= 1.0
        L: "arc_amelia_one_left",
        R: "arc_amelia_one_right",
        U: "arc_amelia_one_up",
        D: "arc_amelia_one_down"
    },
    near: {      // 1.0 < dist <= 2.0
        L: "arc_amelia_two_left",
        R: "arc_amelia_two_right",
        U: "arc_amelia_two_up",
        D: "arc_amelia_two_down"
    },
    far:     "arc_amelia_far_off",         // > 2.0  : "Way off. Listen again."
    sameKey: "arc_amelia_same_key"         // edge-case (should not occur)
};

/* =========================================================================
 *  2. PROXIMITY MATRIX — Fractional [X, Y] keyboard map
 *  Y grows downward; X uses fractional offsets to model row stagger so that
 *  F→G reads as one-right and X→C reads as one-up-and-right.
 *  Modifier keys are intentionally absent — curriculum-banned as targets.
 * ========================================================================= */
KC.mission.archive_keyGrid = {
    // Row 1 — Number row (y=0)
    "1":[0.00,0], "2":[1.00,0], "3":[2.00,0], "4":[3.00,0], "5":[4.00,0],
    "6":[5.00,0], "7":[6.00,0], "8":[7.00,0], "9":[8.00,0], "0":[9.00,0],

    // Row 2 — QWERTY row (y=1, +0.50 stagger)
    "Q":[0.50,1], "W":[1.50,1], "E":[2.50,1], "R":[3.50,1], "T":[4.50,1],
    "Y":[5.50,1], "U":[6.50,1], "I":[7.50,1], "O":[8.50,1], "P":[9.50,1],

    // Row 3 — Home row (y=2, +0.75 stagger)
    "A":[0.75,2], "S":[1.75,2], "D":[2.75,2], "F":[3.75,2], "G":[4.75,2],
    "H":[5.75,2], "J":[6.75,2], "K":[7.75,2], "L":[8.75,2],

    // Row 4 — Bottom row (y=3, +1.25 stagger)
    "Z":[1.25,3], "X":[2.25,3], "C":[3.25,3], "V":[4.25,3],
    "B":[5.25,3], "N":[6.25,3], "M":[7.25,3]
};

/* =========================================================================
 *  3. INPUT HANDLER — KC.handlers.archive
 *  Dual-attachment per .rules/namespacing.md: input/event orchestration only.
 * ========================================================================= */
KC.handlers.archive = {

    handleInput: function(e) {
        // ---- S4: Ghost-Key Filter (ABSOLUTE first gate) --------------------
        if (e.repeat) return;

        const m = KC.mission.archive;

        // Esc hands the wheel to engine-level S6 killswitch.
        // (kc_input.js ACTIVE_TYPING branch fires the ordered teardown.)
        if (e.key === "Escape") return;

        // ---- S1: Whitelist — input only valid in LISTENING state -----------
        if (m.state !== "LISTENING") {
            // Input blocked while VO chains are in flight (per cadence ruling).
            return;
        }

        // Single-character printable keys only. Reject Tab, arrows, F-keys, etc.
        if (typeof e.key !== "string" || e.key.length !== 1) return;

        e.preventDefault();
        m._grade(e.key.toUpperCase());
    }
};

/* =========================================================================
 *  4. MISSION CORE — KC.mission.archive
 *  Game-loop logic, state machine, distance math.
 * ========================================================================= */
KC.mission.archive = {
    id: "D00-MISSION-ARCHIVE",

    /* -------- runtime fields -------- */
    isActive:        false,
    state:           "IDLE",      // IDLE | PROMPTING | LISTENING | FEEDBACK_OK | FEEDBACK_WRONG | WORD_COMPLETE | EXITING
    dictationId:     null,        // S2 cancellation token
    timeouts:        [],          // S3 timer registry
    vocab:           [],          // active queue (volume-filtered upstream by setup)
    wordIndex:       0,
    letterIndex:     0,
    currentWord:     null,        // cached vocab record
    consecutiveMisses: 0,         // resets on correct letter; triggers cue replay at 3

    /* ====================================================================
     *  Lifecycle
     * ==================================================================== */

    init: function(config) {
        this.stop();                              // S3: thorough teardown first

        const allVocab = (typeof GAME_DATA !== "undefined" && Array.isArray(GAME_DATA.archive_vocab))
            ? GAME_DATA.archive_vocab : [];

        // Volume gating (default = all). Setup screen will pass {volume:1|2|3}.
        const volFilter = (config && config.volume) || null;
        this.vocab = volFilter
            ? allVocab.filter(w => w.volume === volFilter)
            : allVocab.slice();

        this.isActive          = true;
        this.wordIndex         = 0;
        this.letterIndex       = 0;
        this.currentWord       = null;
        this.consecutiveMisses = 0;
        this.state             = "IDLE";

        if (KC.core && KC.core.announce) {
            KC.core.announce("Earth Archive online. Snippy is defragmenting. Listen carefully.");
        }
    },

    start: function() {
        if (!this.isActive) return;
        if (!this.vocab.length) {
            if (KC.core && KC.core.announce) KC.core.announce("Archive empty. Returning to Hub.");
            return;
        }
        this._beginWord(0);
    },

    stop: function() {
        // S3: lifecycle reset — clear EVERY timer, null the S2 token, kill audio.
        this.state = "EXITING";
        this.dictationId = null;                  // invalidates every in-flight VO callback
        if (Array.isArray(this.timeouts)) {
            this.timeouts.forEach(clearTimeout);
        }
        this.timeouts          = [];
        this.isActive          = false;
        this.currentWord       = null;
        this.wordIndex         = 0;
        this.letterIndex       = 0;
        this.consecutiveMisses = 0;

        if (KC.audio && KC.audio.stopActiveAudio) KC.audio.stopActiveAudio();
        this.state = "IDLE";
    },

    // Engine hook — KC.mission.abortActiveMission() calls endMission on the active handler.
    endMission: function() {
        this.stop();
    },

    /* ====================================================================
     *  Word / Letter pacing
     * ==================================================================== */

    _beginWord: function(idx) {
        if (idx >= this.vocab.length) {
            this._onArchiveComplete();
            return;
        }
        this.wordIndex         = idx;
        this.letterIndex       = 0;
        this.currentWord       = this.vocab[idx];
        this.consecutiveMisses = 0;
        this._promptCurrentWord();
    },

    // Plays:  cue (animal sound) -> Amelia "Spell <word>" -> arm LISTENING.
    // Every step is gated by the captured dictation token (S2).
    _promptCurrentWord: function() {
        this.state = "PROMPTING";
        const tok = this._newToken();
        const word = this.currentWord;
        if (!word) return;

        const onPromptDone = () => {
            if (this.dictationId !== tok) return;       // S2 gate
            this.state = "LISTENING";
        };

        const onCueDone = () => {
            if (this.dictationId !== tok) return;       // S2 gate
            this._playKey(word.audio.prompt, onPromptDone);
        };

        this._playKey(word.audio.cue, onCueDone);
    },

    /* ====================================================================
     *  Grading & Feedback (called from KC.handlers.archive.handleInput)
     * ==================================================================== */

    _grade: function(pressedUpper) {
        const word = this.currentWord;
        if (!word) return;
        const target = word.word.charAt(this.letterIndex);   // canonical UPPERCASE

        if (pressedUpper === target) {                       // S1: strict ===
            this._onCorrect();
        } else {
            this._onWrong(pressedUpper, target);
        }
    },

    _onCorrect: function() {
        this.state = "FEEDBACK_OK";
        this.consecutiveMisses = 0;
        const tok = this._newToken();

        if (KC.audio && KC.audio.playSFX) {
            KC.audio.playSFX(GAME_DATA.archive_letterFeedback.correct);
        }

        // Brief breathing room, then either advance letter or finish word.
        const t = setTimeout(() => {
            if (this.dictationId !== tok) return;            // S2 gate
            this.letterIndex += 1;
            if (this.letterIndex >= this.currentWord.word.length) {
                this._onWordComplete();
            } else {
                this.state = "LISTENING";                    // re-arm for next letter
            }
        }, 300);
        this.timeouts.push(t);
    },

    _onWrong: function(pressedUpper, targetUpper) {
        this.state = "FEEDBACK_WRONG";
        this.consecutiveMisses += 1;
        const tok = this._newToken();

        if (KC.audio && KC.audio.playSFX) {
            KC.audio.playSFX(GAME_DATA.archive_letterFeedback.wrong);
        }

        const dist  = this._distance(pressedUpper, targetUpper);
        const voKey = this._pickProximityVO(dist);
        const reachedRetryCap = (this.consecutiveMisses >= 3);

        const onSpatialDone = () => {
            if (this.dictationId !== tok) return;            // S2 gate
            if (reachedRetryCap) {
                // 3-miss policy: replay original cue + prompt, reset counter.
                this.consecutiveMisses = 0;
                this._promptCurrentWord();                   // bumps token internally
            } else {
                this.state = "LISTENING";                    // re-arm same letter
            }
        };

        // Small gap so buzz doesn't smear into the spatial VO.
        const t = setTimeout(() => {
            if (this.dictationId !== tok) return;            // S2 gate
            this._playKey(voKey, onSpatialDone);
        }, 250);
        this.timeouts.push(t);
    },

    _onWordComplete: function() {
        this.state = "WORD_COMPLETE";
        const tok = this._newToken();
        const word = this.currentWord;

        const onSuccessDone = () => {
            if (this.dictationId !== tok) return;            // S2 gate
            this._beginWord(this.wordIndex + 1);
        };

        this._playKey(word.audio.success, onSuccessDone);
    },

    _onArchiveComplete: function() {
        this.state = "IDLE";
        if (KC.core && KC.core.announce) {
            KC.core.announce("Archive defragmentation complete. Snippy is pleased.");
        }
        // Library mode: no career stat writes. Hub return is engine-managed.
    },

    /* ====================================================================
     *  Distance Math (Proximity Matrix)
     * ==================================================================== */

    // Returns { bucket, dx, dy } where +dx = target is RIGHT of pressed,
    // +dy = target is DOWN from pressed.  Bucket via Chebyshev distance.
    _distance: function(pressedUpper, targetUpper) {
        const grid = KC.mission.archive_keyGrid;
        const a = grid[pressedUpper];
        const b = grid[targetUpper];
        if (!a || !b) {
            return { bucket: "far", dx: 0, dy: 0 };          // S1: no coercion fallback
        }
        const dx   = b[0] - a[0];
        const dy   = b[1] - a[1];
        const cheb = Math.max(Math.abs(dx), Math.abs(dy));

        let bucket;
        if (cheb === 0)        bucket = "sameKey";
        else if (cheb <= 1.0)  bucket = "adjacent";
        else if (cheb <= 2.0)  bucket = "near";
        else                   bucket = "far";

        return { bucket: bucket, dx: dx, dy: dy };
    },

    // Maps a {bucket, dx, dy} into a single audio_bank key.
    _pickProximityVO: function(dist) {
        const bank = GAME_DATA.archive_proximityVO;
        if (dist.bucket === "far")     return bank.far;
        if (dist.bucket === "sameKey") return bank.sameKey;

        // Direction selection — vertical wins ties of equal magnitude.
        const tier = bank[dist.bucket];                      // adjacent | near
        const horizDominant = Math.abs(dist.dx) > Math.abs(dist.dy);
        if (horizDominant) {
            return dist.dx > 0 ? tier.R : tier.L;
        } else {
            return dist.dy > 0 ? tier.D : tier.U;
        }
    },

    /* ====================================================================
     *  Internal helpers
     * ==================================================================== */

    // Mints a fresh S2 token. Bumping invalidates every prior in-flight chain.
    _newToken: function() {
        const tok = (Date.now() << 0) ^ Math.floor(Math.random() * 0xffff);
        this.dictationId = tok;
        return tok;
    },

    // Thin wrapper over KC.audio.playAudio with an announce-fallback. Callback
    // fires whether the asset resolved or fell back to ARIA, so chains never
    // stall when a key is missing from audio_bank.
    _playKey: function(key, callback) {
        const cb = (typeof callback === "function") ? callback : function () {};
        if (KC.audio && typeof KC.audio.playAudio === "function") {
            KC.audio.playAudio(key, key /* fallbackText */, cb);
        } else {
            // Pure-fallback safety: schedule cb so callers never deadlock.
            const t = setTimeout(cb, 50);
            this.timeouts.push(t);
        }
    }
};

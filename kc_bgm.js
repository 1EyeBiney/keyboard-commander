/* kc_bgm.js */
window.KC = window.KC || {};

KC.bgm = {
    audioA: new Audio(),
    audioB: new Audio(),
    activeAudio: null,
    volumeStages: [0.0, 0.05, 0.1, 0.2, 0.3, 0.4],
    currentVolumeIndex: 2, // Default to 0.1 (Volume 10)
    currentStyle: "default",
    crossfadeTimer: null,
    grabBag: [],
    isInitialized: false,

    playlists: {
        default: ["mu_default1", "mu_default2", "mu_default3", "mu_default4", "mu_default5", "mu_default6", "mu_default7", "mu_default8"],
        spaghetti: ["mu_spaghetti1", "mu_spaghetti2", "mu_spaghetti3", "mu_spaghetti4", "mu_spaghetti5", "mu_spaghetti6", "mu_spaghetti7", "mu_spaghetti8"],
        arcade: ["mu_arcade1", "mu_arcade2", "mu_arcade3", "mu_arcade4", "mu_arcade5", "mu_arcade6", "mu_arcade7", "mu_arcade8"]
    },

    init: function() {
        this.activeAudio = this.audioA;
        
        // Wrap playNextTrack to preserve scope
        this._onTrackEnded = () => this.playNextTrack();
        
        this.audioA.addEventListener('ended', this._onTrackEnded);
        this.audioB.addEventListener('ended', this._onTrackEnded);
        this.isInitialized = true;
    },

    switchToStyle: function(style) {
        if (!this.playlists[style]) return;
        
        // Seamless check: If we are already playing this style, do nothing!
        if (this.currentStyle === style) return; 
        
        console.log("BGM Engine: Crossfading to style ->", style);
        this.currentStyle = style;
        this.grabBag = [...this.playlists[style]];
        this.playNextTrack(); // Triggers the crossfade to the new style
    },

    restoreStyle: function() {
        // Look up the user's saved style, fallback to 'default'
        const savedStyle = (KC.state.profile && KC.state.profile.settings && KC.state.profile.settings.bgm_style) 
                           ? KC.state.profile.settings.bgm_style 
                           : "default";
        this.switchToStyle(savedStyle);
    },

    start: function(style = "default", vol = 10) {
        this.currentStyle = style;
        const volFloat = vol / 100;
        this.currentVolumeIndex = this.volumeStages.indexOf(volFloat);
        if (this.currentVolumeIndex === -1) this.currentVolumeIndex = 2;
        this.playNextTrack(true); 
    },

    getNextTrack: function() {
        if (this.grabBag.length === 0) {
            this.grabBag = [...this.playlists[this.currentStyle]];
            // Fisher-Yates Shuffle
            for (let i = this.grabBag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.grabBag[i], this.grabBag[j]] = [this.grabBag[j], this.grabBag[i]];
            }
        }
        return this.grabBag.pop();
    },

    playNextTrack: function(isInitial = false) {
        const standbyAudio = this.activeAudio === this.audioA ? this.audioB : this.audioA;
        const previousAudio = this.activeAudio;
        const targetVolume = this.volumeStages[this.currentVolumeIndex];
        const nextTrack = this.getNextTrack();

        if (this.crossfadeTimer) {
            clearInterval(this.crossfadeTimer);
            this.crossfadeTimer = null;
        }

        previousAudio.removeEventListener('ended', this._onTrackEnded);
        standbyAudio.pause();
        standbyAudio.currentTime = 0;
        standbyAudio.src = (typeof GAME_DATA !== 'undefined' && GAME_DATA.audio_bank && GAME_DATA.audio_bank[nextTrack]) ? GAME_DATA.audio_bank[nextTrack] : nextTrack;
        standbyAudio.volume = 0;
        
        const playPromise = standbyAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((error) => console.warn('Ambient playback blocked:', error));
        }

        const durationMs = 2000;
        const stepMs = 100;
        const totalSteps = durationMs / stepMs;
        let step = 0;
        const startVolume = previousAudio.paused ? 0 : previousAudio.volume;

        this.crossfadeTimer = setInterval(() => {
            step += 1;
            const progress = Math.min(step / totalSteps, 1);
            if (!isInitial) {
                previousAudio.volume = Math.max(0, startVolume * (1 - progress));
            }
            standbyAudio.volume = Math.min(targetVolume, targetVolume * progress);

            if (progress >= 1) {
                clearInterval(this.crossfadeTimer);
                this.crossfadeTimer = null;
                if (!isInitial) {
                    previousAudio.pause();
                    previousAudio.currentTime = 0;
                }
                previousAudio.volume = targetVolume;
                this.activeAudio = standbyAudio;
                this.activeAudio.removeEventListener('ended', this._onTrackEnded);
                this.activeAudio.addEventListener('ended', this._onTrackEnded);
            }
        }, stepMs);
    },

    applyProfileSettings: function(profile) {
        if (!profile || !profile.settings) return;
        
        let needsNewTrack = (this.currentStyle !== profile.settings.bgm_style);
        this.currentStyle = profile.settings.bgm_style || "default";
        
        const volFloat = profile.settings.bgm_volume / 100;
        const newVolIndex = this.volumeStages.indexOf(volFloat);
        if (newVolIndex !== -1) this.currentVolumeIndex = newVolIndex;

        const targetVol = this.volumeStages[this.currentVolumeIndex];

        if (needsNewTrack) {
            this.grabBag = []; // Clear bag to force new style
            this.playNextTrack(); // Triggers crossfade
        } else {
            this.activeAudio.volume = targetVol; // Instantly apply volume
        }
    },

    cycleVolume: function() {
        this.currentVolumeIndex++;
        if (this.currentVolumeIndex >= this.volumeStages.length) this.currentVolumeIndex = 0;
        const targetVol = this.volumeStages[this.currentVolumeIndex];
        
        this.activeAudio.volume = targetVol;
        
        const displayVol = Math.round(targetVol * 100);
        if (KC.state.profile && KC.state.profile.settings) {
            KC.state.profile.settings.bgm_volume = displayVol;
            KC.core.saveProgress();
        }
        KC.core.announce(`Music Volume ${displayVol}`);
    },

    cycleStyle: function() {
        const styles = Object.keys(this.playlists);
        let idx = styles.indexOf(this.currentStyle);
        idx++;
        if (idx >= styles.length) idx = 0;
        this.currentStyle = styles[idx];
        
        if (KC.state.profile && KC.state.profile.settings) {
            KC.state.profile.settings.bgm_style = this.currentStyle;
            KC.core.saveProgress();
        }
        
        const styleNames = { default: "Default", spaghetti: "Spaghetti Western", arcade: "Arcade" };
        let styleName = styleNames[this.currentStyle] || this.currentStyle;
        KC.core.announce(`Music Style: ${styleName}`);
        
        this.grabBag = []; // Clear bag
        this.playNextTrack(); // Crossfade to new style
    },

    setVolume: function(displayVol) {
        // displayVol is on the 0-40 display scale: [0, 5, 10, 20, 30, 40]
        // Divide by 100 to map to the internal volumeStages float array
        const volFloat = displayVol / 100;
        const idx = this.volumeStages.indexOf(volFloat);
        this.currentVolumeIndex = (idx !== -1) ? idx : 2;
        if (this.activeAudio) this.activeAudio.volume = this.volumeStages[this.currentVolumeIndex];
        if (KC.state.profile && KC.state.profile.settings) {
            KC.state.profile.settings.bgm_volume = displayVol;
            KC.core.saveProgress();
        }
    },

    playPreview: function(style) {
        if (!this.playlists[style]) return;

        // Identify track 1 (index 0) of the requested style
        const trackKey = this.playlists[style][0];
        const trackSrc = (typeof GAME_DATA !== 'undefined' && GAME_DATA.audio_bank && GAME_DATA.audio_bank[trackKey])
            ? GAME_DATA.audio_bank[trackKey]
            : trackKey;

        // Deep duck: capture the active element and lower its volume to 0.05
        const duckedAudio = this.activeAudio;
        const savedVolume = duckedAudio ? duckedAudio.volume : 0;
        if (duckedAudio) duckedAudio.volume = 0.05;

        // Play the preview on a separate, temporary Audio element
        const previewAudio = new Audio(trackSrc);
        previewAudio.volume = this.volumeStages[this.currentVolumeIndex];
        previewAudio.play().catch(err => console.warn('BGM preview blocked:', err));

        // After 3.5 seconds, stop the preview and restore the original BGM volume
        setTimeout(() => {
            previewAudio.pause();
            previewAudio.src = '';
            if (duckedAudio) duckedAudio.volume = savedVolume;
        }, 3500);
    }
};

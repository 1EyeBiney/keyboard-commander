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
        "default": [
            "audio/music/mu_default1.mp3", 
            "audio/music/mu_default2.mp3", 
            "audio/music/mu_default3.mp3", 
            "audio/music/mu_default4.mp3"
        ],
        "western": [
            "audio/music/mu_spaghetti1.mp3", 
            "audio/music/mu_spaghetti2.mp3", 
            "audio/music/mu_spaghetti3.mp3", 
            "audio/music/mu_spaghetti4.mp3"
        ]
    },

    init: function() {
        this.activeAudio = this.audioA;
        
        // Wrap playNextTrack to preserve scope
        this._onTrackEnded = () => this.playNextTrack();
        
        this.audioA.addEventListener('ended', this._onTrackEnded);
        this.audioB.addEventListener('ended', this._onTrackEnded);
        this.isInitialized = true;
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
        standbyAudio.src = nextTrack;
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
        
        let styleName = this.currentStyle === "western" ? "Dusty Western" : "Default";
        KC.core.announce(`Music Style: ${styleName}`);
        
        this.grabBag = []; // Clear bag
        this.playNextTrack(); // Crossfade to new style
    }
};

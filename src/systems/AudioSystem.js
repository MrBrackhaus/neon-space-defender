/**
 * @file AudioSystem.js
 * @description Manages all audio playback within the game, including sound effects (SFX) and procedurally generated music.
 * It utilizes the Web Audio API to synthesize sounds and handle music tracks without external assets.
 * @module AudioSystem
 */

export default class AudioSystem {
    constructor(scene) {
        this.scene = scene;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. MASTER COMPRESSOR (Anti-clipping)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);

        // 2. MASTER GAINS
        this.masterGainMusic = this.ctx.createGain();
        this.sidechainGain = this.ctx.createGain();
        this.sidechainGain.gain.value = 1.0;
        this.masterGainSfx = this.ctx.createGain();

        // 3. SFX SPATIAL DELAY (Echo)
        this.sfxDelay = this.ctx.createDelay();
        this.sfxDelay.delayTime.value = 0.25; // 250ms echo
        this.sfxFeedback = this.ctx.createGain();
        this.sfxFeedback.gain.value = 0.3; // 30% feedback decay
        
        this.sfxFilter = this.ctx.createBiquadFilter();
        this.sfxFilter.type = 'lowpass';
        this.sfxFilter.frequency.value = 2000; // Muffle the echoes

        // Connect SFX Master -> Compressor (Dry Signal)
        this.masterGainSfx.connect(this.compressor);
        // Connect SFX Master -> Delay Network (Wet Signal)
        this.masterGainSfx.connect(this.sfxDelay);
        this.sfxDelay.connect(this.sfxFilter);
        this.sfxFilter.connect(this.sfxFeedback);
        this.sfxFeedback.connect(this.sfxDelay);
        this.sfxDelay.connect(this.compressor);

        // Connect Music Master -> Compressor
        this.masterGainMusic.connect(this.sidechainGain);
        this.sidechainGain.connect(this.compressor);

        // 4. PRE-CALCULATE WHITE NOISE BUFFER FOR EXPLOSIONS
        this._initNoiseBuffer();

        // 5. TRACKER STATE
        this.trackerTimeout = null;
        this.currentTrack = null;
        this.isPlaying = false;
        
        // Step resolution
        this.bpm = 165;
        this.stepDuration = (60 / this.bpm) / 4; // 16th note step duration (approx 0.111s at 135 BPM)
        
        this.patternIndex = 0; // Which pattern in the track sequence
        this.stepIndex = 0;    // Which row in the current pattern (0-15 or 0-31)
        
        this.currentArpChord = null;
        this.arpNoteIndex = 0;
        this.arpOsc = null;
        this.arpGain = null;
        this.arpInterval = null;

        this.volMusic = parseFloat(localStorage.getItem('neon_vol_music') ?? '0.5');
        this.volSfx = parseFloat(localStorage.getItem('neon_vol_sfx') ?? '0.8');
        
        this.updateVolumes();
        
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this._initTracks();
    }

    _initNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    updateVolumes() {
        this.volMusic = parseFloat(localStorage.getItem('neon_vol_music') ?? '0.5');
        this.volSfx = parseFloat(localStorage.getItem('neon_vol_sfx') ?? '0.8');
        this.masterGainMusic.gain.value = this.volMusic;
        this.masterGainSfx.gain.value = this.volSfx;
    }

    // ─────────────────── SOUND EFFECTS ───────────────────

    playShoot(weaponClass = 'pulse') {
        if (this.volSfx <= 0.01) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const time = this.ctx.currentTime;
        
        if (weaponClass === 'scatter') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
            gain.gain.setValueAtTime(0.7, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(time); osc.stop(time + 0.15);
        } else if (weaponClass === 'railgun') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(1500, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.35);
            gain.gain.setValueAtTime(0.9, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(time); osc.stop(time + 0.35);
        } else {
            // pulse
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
            gain.gain.setValueAtTime(0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(time); osc.stop(time + 0.1);
        }
    }

    playExplosion() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.5);

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        noiseSource.connect(filter); filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.masterGainSfx);

        noiseSource.start(time); noiseSource.stop(time + 0.5);
        osc.start(time); osc.stop(time + 0.4);
    }

    playNovaBomb() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 2.0);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.linearRampToValueAtTime(3000, time + 1.0);
        filter.frequency.linearRampToValueAtTime(50, time + 2.0);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(2.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 2.0);

        osc.connect(gain);
        noise.connect(filter); filter.connect(gain);
        gain.connect(this.masterGainSfx);

        osc.start(time); osc.stop(time + 2.0);
        noise.start(time); noise.stop(time + 2.0);
    }

    playAbility() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.linearRampToValueAtTime(1200, time + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1.0, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.5);
    }

    playHit() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(150, time + 0.08);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.08);
    }

    playPickup(type = 'scrap') {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        if (type === 'scrap') {
            osc.frequency.setValueAtTime(1200, time);
            osc.frequency.exponentialRampToValueAtTime(2000, time + 0.1);
        } else if (type === 'cube') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, time);
            osc.frequency.exponentialRampToValueAtTime(1600, time + 0.15);
        } else if (type === 'upgrade') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.linearRampToValueAtTime(1200, time + 0.1);
            osc.frequency.linearRampToValueAtTime(1800, time + 0.2);
        } else {
            // xp or default
            osc.frequency.setValueAtTime(1500, time);
            osc.frequency.exponentialRampToValueAtTime(2500, time + 0.05);
        }
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.2);
    }

    playBuy() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;
        [880, 1108.73, 1318.51].forEach((freq, i) => { // A major chord
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const start = time + i * 0.05;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(start); osc.stop(start + 0.3);
        });
    }

    playError() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.linearRampToValueAtTime(100, time + 0.2);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.2);
    }

    playPlayerHit() {
        if (this.volSfx <= 0.01) return;
        const time = this.ctx.currentTime;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.3);
        
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        noise.connect(filter); filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.masterGainSfx);

        noise.start(time); noise.stop(time + 0.3);
        osc.start(time); osc.stop(time + 0.3);
    }

    playLevelUp() {
        if (this.volSfx <= 0.01) return;
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.1;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(startTime); osc.stop(startTime + 0.4);
        });
    }

    playHover() {
        if (!this.ctx || this.volSfx <= 0) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.exponentialRampToValueAtTime(1200, time + 0.05);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(this.volSfx * 0.1, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.1);
    }

    playClick() {
        if (!this.ctx || this.volSfx <= 0) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(this.volSfx * 0.2, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(time); osc.stop(time + 0.15);
    }

    // ─────────────────── DEMOSCENE TRACKER ───────────────────

    _noteToFreq(noteStr) {
        if (!noteStr || noteStr === '-') return 0;
        const notes = {
            'C2': 65.41, 'Db2': 69.30, 'D2': 73.42, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'Gb2': 92.50, 'G2': 98.00, 'Ab2': 103.83, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'Db3': 138.59, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'Gb3': 185.00, 'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'Db4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'Gb4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'Db5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'Gb5': 739.99, 'G5': 783.99, 'Ab5': 830.61, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'Eb6': 1244.51, 'E6': 1318.51, 'G6': 1567.98
        };
        return notes[noteStr] || 130.81;
    }

    /**
     * Parses a tracker pattern string into an array of step objects.
     * Format per line: ARP | LEAD | BASS | DRUM
     * E.g.: "C4,Eb4,G4 | C5 | C3 | K"
     */
    _parsePattern(patternStr) {
        const lines = patternStr.trim().split('\n');
        const pattern = [];
        for (let line of lines) {
            line = line.trim();
            if (!line) continue; // Skip empty lines
            const cols = line.split('|').map(c => c.trim());
            
            const arpStr = cols[0] && cols[0] !== '-' ? cols[0].split(',') : null;
            const lead = cols[1] && cols[1] !== '-' ? cols[1] : null;
            const bass = cols[2] && cols[2] !== '-' ? cols[2] : null;
            const drum = cols[3] && cols[3] !== '-' ? cols[3] : null;
            
            pattern.push({ arp: arpStr, lead, bass, drum });
        }
        return pattern;
    }

    _initTracks() {
        // Tracker format: Arp Chord | Lead Note | Bass Note | Drum Code
        // Modern Chiptune Style (165 BPM) - Driving, syncopated
        
        const patMenu_A = this._parsePattern(`
            C3,G3,C4  | C5  | C2  | K
            -         | -   | -   | -
            C4,Eb4,G4 | Eb5 | C2  | H
            -         | -   | Eb2 | -
            C3,F3,C4  | -   | F2  | S
            -         | C6  | -   | H
            Eb3,G3,Bb3| G5  | F2  | K
            -         | -   | Eb2 | H
            Ab2,C3,Eb3| C5  | Ab1 | K
            -         | -   | -   | H
            Ab2,C3,Eb3| C5  | Ab1 | S
            -         | -   | C2  | H
            Bb2,D3,F3 | Bb4 | Bb1 | K
            -         | -   | -   | H
            Bb2,D3,F3 | D5  | Bb1 | S
            -         | -   | D2  | H
        `);

        const patMenu_B = this._parsePattern(`
            F3,Ab3,C4 | C5  | F1  | K
            -         | -   | F2  | H
            F3,Ab3,C4 | F5  | F1  | H
            -         | -   | Ab1 | K
            C3,Eb3,G3 | G5  | C2  | S
            -         | -   | C3  | H
            C3,Eb3,G3 | Eb5 | C2  | K
            -         | -   | Eb2 | H
            G2,Bb2,D3 | D5  | G1  | K
            -         | -   | -   | H
            G2,Bb2,D3 | B4  | G1  | S
            -         | -   | D2  | H
            C3,Eb3,G3 | C5  | C2  | K
            -         | -   | Eb2 | H
            C3,Eb3,G3 | G5  | G2  | S
            -         | -   | -   | H
        `);

        // Extremely aggressive boss track (16th note basslines)
        const patBoss_A = this._parsePattern(`
            C2,C3,G3  | C4  | C1  | K
            -         | -   | C2  | H
            C3,Eb3,G3 | -   | C1  | K
            -         | Eb4 | Eb1 | -
            F2,C3,F3  | -   | F1  | S
            -         | -   | F1  | H
            Eb2,G2,C3 | -   | Gb1 | K
            -         | -   | F1  | H
            C2,C3,G3  | C4  | C1  | K
            -         | -   | C2  | H
            C3,Eb3,G3 | -   | C1  | K
            -         | Db4 | Db1 | -
            Bb1,F2,Bb2| -   | Bb0 | S
            -         | -   | Bb0 | H
            Ab1,Eb2,Ab2| -  | B0  | K
            -         | -   | Bb0 | H
        `);

        this.tracks = {
            menu: [patMenu_A, patMenu_A, patMenu_B, patMenu_A],
            std_1: [patMenu_A, patMenu_B],
            boss: [patBoss_A, patBoss_A, patBoss_A, patBoss_A]
        };
    }

    playMusic(trackId = 'menu') {
        this.stopMusic();
        if (this.volMusic <= 0.01) return;

        if (!this.tracks[trackId]) trackId = 'std_1';

        this.currentTrack = this.tracks[trackId];
        this.patternIndex = 0;
        this.stepIndex = 0;
        this.isPlaying = true;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime + 0.1;
        this._scheduleTrackerStep(startTime);
    }

    _playDrum(code, time) {
        if (!code) return;
        const gain = this.ctx.createGain();
        gain.connect(this.masterGainMusic);

        if (code === 'K') { // Kick
            // Fake Sidechain Compression on the rest of the music
            this.sidechainGain.gain.setValueAtTime(0.1, time);
            this.sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.25);

            // Sub heavy kick
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.2); // Drops lower (30Hz)
            gain.gain.setValueAtTime(2.0, time); // Even louder kick
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
            // Hard pitch click for punch
            const click = this.ctx.createOscillator();
            click.type = 'square';
            click.frequency.setValueAtTime(1500, time);
            click.frequency.exponentialRampToValueAtTime(50, time + 0.03);
            click.connect(gain);
            click.start(time); click.stop(time + 0.03);

            osc.connect(gain);
            osc.start(time); osc.stop(time + 0.2);
        } else if (code === 'S') { // Snare
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2000;
            gain.gain.setValueAtTime(1.2, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
            noise.connect(filter); filter.connect(gain);
            noise.start(time); noise.stop(time + 0.25);
            
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(0.8, time);
            oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            osc.connect(oscGain); oscGain.connect(this.masterGainMusic);
            osc.start(time); osc.stop(time + 0.1);
        } else if (code === 'H') { // Hihat
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            noise.connect(filter); filter.connect(gain);
            noise.start(time); noise.stop(time + 0.05);
        }
    }

    _playLead(note, time) {
        if (!note) return;
        const freq = this._noteToFreq(note);
        const gain = this.ctx.createGain();
        gain.connect(this.masterGainMusic);

        // Modern chiptune square lead with 50% pulse width (PWM simulation) and portamento
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        
        // Very fast pitch sweep from octave above (Chiptune 'blip' attack)
        osc1.frequency.setValueAtTime(freq * 2, time);
        osc1.frequency.exponentialRampToValueAtTime(freq, time + 0.02);
        
        osc2.frequency.setValueAtTime(freq * 2 * 1.008, time); // detune
        osc2.frequency.exponentialRampToValueAtTime(freq * 1.008, time + 0.02);

        osc1.connect(gain);
        osc2.connect(gain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
        const dur = this.stepDuration * 1.5;
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

        osc1.start(time); osc1.stop(time + dur);
        osc2.start(time); osc2.stop(time + dur);
    }

    _playBass(note, time) {
        if (!note) return;
        const freq = this._noteToFreq(note);
        const gain = this.ctx.createGain();
        gain.connect(this.masterGainMusic);

        // Main brutal bass layer (Sawtooth)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        // Sub bass layer (Square wave one octave down for massive thickness)
        const oscSub = this.ctx.createOscillator();
        oscSub.type = 'square';
        oscSub.frequency.setValueAtTime(freq * 0.5, time);

        // Aggressive lowpass filter with high resonance
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 12; // High resonance for that acid 'squelch'
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(80, time + this.stepDuration * 0.9);

        // Drive the signal hot into the filter
        const driveGain = this.ctx.createGain();
        driveGain.gain.value = 2.0; 

        osc1.connect(driveGain);
        oscSub.connect(driveGain);
        driveGain.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.7, time + 0.01); // Louder base volume
        gain.gain.exponentialRampToValueAtTime(0.01, time + this.stepDuration);

        osc1.start(time); osc1.stop(time + this.stepDuration);
        oscSub.start(time); oscSub.stop(time + this.stepDuration);
    }

    _setArp(chordStr) {
        if (!chordStr) {
            // Stop arpeggiator
            if (this.arpOsc) {
                this.arpGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
                this.arpOsc.stop(this.ctx.currentTime + 0.05);
                this.arpOsc = null;
            }
            if (this.arpInterval) { clearInterval(this.arpInterval); this.arpInterval = null; }
            this.currentArpChord = null;
            return;
        }

        const chord = chordStr.map(n => this._noteToFreq(n));
        
        // If already playing an arp, just update the chord array
        if (this.currentArpChord) {
            this.currentArpChord = chord;
            return;
        }

        this.currentArpChord = chord;
        this.arpNoteIndex = 0;

        // Start continuous synth
        this.arpOsc = this.ctx.createOscillator();
        this.arpGain = this.ctx.createGain();
        this.arpOsc.type = 'square';
        
        this.arpGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.arpGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.02);
        
        this.arpOsc.connect(this.arpGain);
        this.arpGain.connect(this.masterGainMusic);
        this.arpOsc.start();

        // 32nd note arpeggiator tick (extremely fast switching like C64/Amiga)
        const arpSpeedMs = (this.stepDuration / 2) * 1000;
        this.arpInterval = setInterval(() => {
            if (!this.arpOsc || !this.isPlaying) return;
            const freq = this.currentArpChord[this.arpNoteIndex];
            // Snap frequency instantly (no glide)
            this.arpOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            this.arpNoteIndex = (this.arpNoteIndex + 1) % this.currentArpChord.length;
        }, arpSpeedMs);
    }

    _scheduleTrackerStep(time) {
        if (!this.isPlaying) return;

        const pattern = this.currentTrack[this.patternIndex];
        const stepData = pattern[this.stepIndex];

        // Process step
        if (stepData.arp !== undefined) this._setArp(stepData.arp);
        if (stepData.lead) this._playLead(stepData.lead, time);
        if (stepData.bass) this._playBass(stepData.bass, time);
        if (stepData.drum) this._playDrum(stepData.drum, time);

        // Advance indices
        this.stepIndex++;
        if (this.stepIndex >= pattern.length) {
            this.stepIndex = 0;
            this.patternIndex++;
            if (this.patternIndex >= this.currentTrack.length) {
                this.patternIndex = 0; // Loop track
            }
        }

        const nextTime = time + this.stepDuration;
        const delayMs = (nextTime - this.ctx.currentTime) * 1000 - 15; // 15ms lookahead precision
        
        this.trackerTimeout = setTimeout(() => {
            this._scheduleTrackerStep(nextTime);
        }, Math.max(0, delayMs));
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.trackerTimeout) { clearTimeout(this.trackerTimeout); this.trackerTimeout = null; }
        if (this.arpInterval) { clearInterval(this.arpInterval); this.arpInterval = null; }
        if (this.arpOsc) {
            this.arpOsc.stop();
            this.arpOsc = null;
            this.currentArpChord = null;
        }
    }
}

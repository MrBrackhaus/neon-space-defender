export default class AudioSystem {
    constructor(scene) {
        this.scene = scene;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGainMusic = this.ctx.createGain();
        this.masterGainSfx = this.ctx.createGain();

        this.masterGainMusic.connect(this.ctx.destination);
        this.masterGainSfx.connect(this.ctx.destination);

        this.musicTimeout = null;
        this.currentPattern = [];
        this.patternIndex = 0;
        this.currentTrack = null;
        this.isPlaying = false;
        
        this.volMusic = parseFloat(localStorage.getItem('neon_vol_music') ?? '0.5');
        this.volSfx = parseFloat(localStorage.getItem('neon_vol_sfx') ?? '0.8');
        
        this.updateVolumes();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this._initTracks();
    }

    updateVolumes() {
        this.volMusic = parseFloat(localStorage.getItem('neon_vol_music') ?? '0.5');
        this.volSfx = parseFloat(localStorage.getItem('neon_vol_sfx') ?? '0.8');
        this.masterGainMusic.gain.value = this.volMusic;
        this.masterGainSfx.gain.value = this.volSfx;
    }

    // ── SOUND EFFECTS ──

    playShoot(weaponClass = 'pulse') {
        if (this.volSfx <= 0.01) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        if (weaponClass === 'scatter') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(); osc.stop(this.ctx.currentTime + 0.18);
        } else if (weaponClass === 'railgun') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.9, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(); osc.stop(this.ctx.currentTime + 0.3);
        } else {
            // default (pulse)
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(); osc.stop(this.ctx.currentTime + 0.12);
        }
    }

    playExplosion() {
        if (this.volSfx <= 0.01) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(1.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(); osc.stop(this.ctx.currentTime + 0.4);
    }

    playHit() {
        if (this.volSfx <= 0.01) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.masterGainSfx);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }

    playLevelUp() {
        if (this.volSfx <= 0.01) return;
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const startTime = now + i * 0.1;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            osc.connect(gain); gain.connect(this.masterGainSfx);
            osc.start(startTime); osc.stop(startTime + 0.3);
        });
    }

    // ── PROCEDURAL MUSIC ──

    _noteToFreq(noteStr) {
        if (noteStr === 'REST') return 0;
        const notes = {
            'C2': 65.41, 'Db2': 69.30, 'D2': 73.42, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'Gb2': 92.50, 'G2': 98.00, 'Ab2': 103.83, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'Db3': 138.59, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'Gb3': 185.00, 'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'Db4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'Gb4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88
        };
        return notes[noteStr] || 130.81;
    }

    _parse(trackString) {
        const parts = trackString.trim().split(/\s+/);
        const seq = [];
        parts.forEach(p => {
            const [note, durStr, type] = p.split('-');
            seq.push({ note, dur: parseFloat(durStr), type: type || 'arp' });
        });
        return seq;
    }

    _initTracks() {
        // Compact notation: "Note-DurationInSeconds-Type"
        // Type: 'bass' = square low pass, 'arp' = sawtooth pluck, 'lead' = triangle smooth
        
        this.tracks = {
            menu: this._parse(`
                C3-0.2-bass G3-0.2-arp C4-0.2-arp Eb4-0.2-arp G4-0.4-lead Eb4-0.4-lead C4-0.8-lead
                Ab2-0.2-bass Eb3-0.2-arp Ab3-0.2-arp C4-0.2-arp Eb4-0.4-lead C4-0.4-lead Ab3-0.8-lead
                Bb2-0.2-bass F3-0.2-arp Bb3-0.2-arp D4-0.2-arp F4-0.4-lead D4-0.4-lead Bb3-0.8-lead
                C3-0.2-bass G3-0.2-arp C4-0.2-arp Eb4-0.2-arp G4-0.4-lead Eb4-0.4-lead C4-0.8-lead

                F2-0.2-bass C3-0.2-arp F3-0.2-arp Ab3-0.2-arp C5-0.4-lead Ab4-0.4-lead F4-0.8-lead
                C3-0.2-bass G3-0.2-arp C4-0.2-arp Eb4-0.2-arp G4-0.4-lead Eb4-0.4-lead C4-0.8-lead
                G2-0.2-bass D3-0.2-arp G3-0.2-arp B3-0.2-arp D5-0.4-lead B4-0.4-lead G4-0.8-lead
                C3-0.2-bass G3-0.2-arp C4-0.2-arp Eb4-0.2-arp C5-0.8-lead G4-0.8-lead

                Ab2-0.15-bass Eb3-0.15-arp Ab3-0.15-arp C4-0.15-arp Eb4-0.2-lead F4-0.2-lead G4-0.4-lead Eb4-0.6-lead C4-0.4-lead
                Bb2-0.15-bass F3-0.15-arp Bb3-0.15-arp D4-0.15-arp F4-0.2-lead G4-0.2-lead Ab4-0.4-lead F4-0.6-lead D4-0.4-lead
                C3-0.15-bass G3-0.15-arp C4-0.15-arp Eb4-0.15-arp G4-0.3-lead Eb4-0.3-lead C5-0.6-lead G4-0.6-lead
                C3-0.15-bass G3-0.15-arp C4-0.15-arp Eb4-0.15-arp G4-0.3-lead Eb4-0.3-lead C5-0.6-lead G4-0.6-lead

                F2-0.2-bass C3-0.2-arp F3-0.2-arp Ab3-0.2-arp F4-0.4-lead Ab4-0.4-lead C5-0.8-lead
                Bb2-0.2-bass F3-0.2-arp Bb3-0.2-arp D4-0.2-arp F4-0.4-lead Bb4-0.4-lead D5-0.8-lead
                Eb3-0.2-bass Bb3-0.2-arp Eb4-0.2-arp G4-0.2-arp Eb5-0.4-lead Bb4-0.4-lead G4-0.8-lead
                G2-0.2-bass D3-0.2-arp G3-0.2-arp B3-0.2-arp D4-0.4-lead B3-0.4-lead G3-0.8-lead
            `),
            pause: this._parse(`
                C3-0.5-lead REST-0.1-arp G3-0.5-lead REST-0.1-arp
                C4-0.5-lead REST-0.5-arp Bb3-0.5-lead REST-0.1-arp
            `),
            std_1: this._parse(`
                C3-0.125-bass G3-0.125-arp C4-0.125-arp Eb4-0.125-arp
                C3-0.125-bass G3-0.125-arp C4-0.125-arp F4-0.125-arp
                Bb2-0.125-bass F3-0.125-arp Bb3-0.125-arp Eb4-0.125-arp
                G2-0.125-bass D3-0.125-arp G3-0.125-arp Bb3-0.125-arp
            `),
            std_2: this._parse(`
                D3-0.1-bass A3-0.1-arp D4-0.1-arp F4-0.1-arp
                D3-0.1-bass A3-0.1-arp C4-0.1-arp E4-0.1-arp
                C3-0.1-bass G3-0.1-arp C4-0.1-arp Eb4-0.1-arp
                Bb2-0.1-bass F3-0.1-arp Bb3-0.1-arp D4-0.1-arp
            `),
            std_3: this._parse(`
                E3-0.15-bass B3-0.15-arp E4-0.15-arp G4-0.15-arp
                C3-0.15-bass G3-0.15-arp C4-0.15-arp E4-0.15-arp
                D3-0.15-bass A3-0.15-arp D4-0.15-arp F4-0.15-arp
                A2-0.15-bass E3-0.15-arp A3-0.15-arp C4-0.15-arp
            `),
            std_4: this._parse(`
                F3-0.125-bass C4-0.125-arp F4-0.125-arp Ab4-0.125-arp
                Eb3-0.125-bass Bb3-0.125-arp Eb4-0.125-arp G4-0.125-arp
                Db3-0.125-bass Ab3-0.125-arp Db4-0.125-arp F4-0.125-arp
                C3-0.125-bass G3-0.125-arp C4-0.125-arp E4-0.125-arp
            `),
            std_5: this._parse(`
                G3-0.1-bass D4-0.1-arp G4-0.1-arp Bb4-0.1-arp
                F3-0.1-bass C4-0.1-arp F4-0.1-arp A4-0.1-arp
                Eb3-0.1-bass Bb3-0.1-arp Eb4-0.1-arp G4-0.1-arp
                D3-0.1-bass A3-0.1-arp D4-0.1-arp F4-0.1-arp
            `),
            std_6: this._parse(`
                A2-0.15-bass E3-0.15-arp A3-0.15-arp C4-0.15-arp
                G2-0.15-bass D3-0.15-arp G3-0.15-arp B3-0.15-arp
                F2-0.15-bass C3-0.15-arp F3-0.15-arp A3-0.15-arp
                E2-0.15-bass B2-0.15-arp E3-0.15-arp G3-0.15-arp
            `),
            std_7: this._parse(`
                C3-0.1-bass C4-0.1-arp Eb4-0.1-arp G4-0.1-arp
                C3-0.1-bass Eb4-0.1-arp G4-0.1-arp Bb4-0.1-arp
                Ab2-0.1-bass Ab3-0.1-arp C4-0.1-arp Eb4-0.1-arp
                G2-0.1-bass G3-0.1-arp B3-0.1-arp D4-0.1-arp
            `),
            std_8: this._parse(`
                Db3-0.125-bass Ab3-0.125-arp Db4-0.125-arp F4-0.125-arp
                Gb2-0.125-bass Db3-0.125-arp Gb3-0.125-arp Bb3-0.125-arp
                B2-0.125-bass Gb3-0.125-arp B3-0.125-arp Eb4-0.125-arp
                E3-0.125-bass B3-0.125-arp E4-0.125-arp Ab4-0.125-arp
            `),
            boss_1: this._parse(`
                C2-0.5-bass C2-0.25-bass Db2-0.25-bass C2-1.0-bass
                C2-0.5-bass C2-0.25-bass Bb1-0.25-bass C2-1.0-bass
            `),
            boss_2: this._parse(`
                D2-0.25-bass A2-0.25-bass D3-0.25-bass A2-0.25-bass
                Eb2-0.25-bass Bb2-0.25-bass Eb3-0.25-bass Bb2-0.25-bass
                D2-0.25-bass A2-0.25-bass D3-0.25-bass A2-0.25-bass
                Db2-0.25-bass Ab2-0.25-bass Db3-0.25-bass Ab2-0.25-bass
            `),
            boss_3: this._parse(`
                E2-0.125-bass E3-0.125-bass REST-0.125-bass E2-0.125-bass
                G2-0.125-bass G3-0.125-bass REST-0.125-bass G2-0.125-bass
                F2-0.125-bass F3-0.125-bass REST-0.125-bass F2-0.125-bass
                Eb2-0.125-bass Eb3-0.125-bass REST-0.125-bass Eb2-0.125-bass
            `),
            boss_4: this._parse(`
                C2-0.3-bass G2-0.3-bass C3-0.3-bass Eb3-0.7-lead
                C2-0.3-bass F2-0.3-bass C3-0.3-bass Db3-0.7-lead
            `)
        };
    }

    playMusic(trackId = 'menu') {
        this.stopMusic();
        if (this.volMusic <= 0.01) return;

        // Fallback for valid tracks
        if (!this.tracks[trackId]) trackId = 'std_1';

        this.currentTrack = trackId;
        this.isPlaying = true;
        this.patternIndex = 0;
        this.currentPattern = this.tracks[trackId];
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this._scheduleNextNote(this.ctx.currentTime + 0.1);
    }

    _scheduleNextNote(time) {
        if (!this.isPlaying) return;

        const current = this.currentPattern[this.patternIndex];
        
        if (current.note !== 'REST') {
            const freq = this._noteToFreq(current.note);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            if (current.type === 'bass') {
                osc.type = 'square';
            } else if (current.type === 'arp') {
                osc.type = 'sawtooth';
            } else {
                osc.type = 'triangle';
            }
            
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, time + current.dur - 0.01);
            
            osc.connect(gain);
            gain.connect(this.masterGainMusic);
            
            osc.start(time);
            osc.stop(time + current.dur);
        }

        this.patternIndex = (this.patternIndex + 1) % this.currentPattern.length;
        
        const nextTime = time + current.dur;
        const delayMs = (nextTime - this.ctx.currentTime) * 1000 - 20; 
        
        this.musicTimeout = setTimeout(() => {
            this._scheduleNextNote(nextTime);
        }, Math.max(0, delayMs));
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    }
}

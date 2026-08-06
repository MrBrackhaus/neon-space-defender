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
        
        // --- Echo disabled per user request (no echo in space) ---
        // Connect SFX Master -> Delay Network (Wet Signal)
        // this.masterGainSfx.connect(this.sfxDelay);
        // this.sfxDelay.connect(this.sfxFilter);
        // this.sfxFilter.connect(this.sfxFeedback);
        // this.sfxFeedback.connect(this.sfxDelay);
        // this.sfxDelay.connect(this.compressor);

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
        this.bpm = 120;
        this.stepDuration = (60 / this.bpm) / 4; // 16th note step duration
        
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
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(this.masterGainSfx);

        if (weaponClass === 'scatter') {
            // Shotgun blast — noise burst + fast sine sweep
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filt = this.ctx.createBiquadFilter();
            filt.type = 'bandpass'; filt.frequency.value = 2000; filt.Q.value = 2;
            noise.connect(filt); filt.connect(g);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            noise.start(t); noise.stop(t + 0.12);

            const osc = this.ctx.createOscillator();
            const og = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
            og.gain.setValueAtTime(0.4, t);
            og.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(og); og.connect(this.masterGainSfx);
            osc.start(t); osc.stop(t + 0.1);

        } else if (weaponClass === 'railgun') {
            // Railgun — electric charge + high pitch zap
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(2000, t);
            osc1.frequency.exponentialRampToValueAtTime(80, t + 0.4);
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(1800, t);
            osc2.frequency.exponentialRampToValueAtTime(60, t + 0.35);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc1.connect(g); osc2.connect(g);
            osc1.start(t); osc1.stop(t + 0.4);
            osc2.start(t); osc2.stop(t + 0.35);

        } else if (weaponClass === 'sonic_wave') {
            // Sonic wave — wobble sweep
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(900, t + 0.08);
            osc.frequency.linearRampToValueAtTime(200, t + 0.15);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.connect(g);
            osc.start(t); osc.stop(t + 0.15);

        } else if (weaponClass === 'heavy_cannon') {
            // Heavy cannon — deep thump + noise
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filt = this.ctx.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 800;
            noise.connect(filt); filt.connect(g);
            osc.connect(g);
            g.gain.setValueAtTime(0.7, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            osc.start(t); osc.stop(t + 0.25);
            noise.start(t); noise.stop(t + 0.2);

        } else {
            // Pulse — snappy triangle chirp + sub click
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1200, t);
            osc1.frequency.exponentialRampToValueAtTime(200, t + 0.07);
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(100, t);
            osc2.frequency.exponentialRampToValueAtTime(50, t + 0.05);
            const g2 = this.ctx.createGain();
            g2.gain.setValueAtTime(0.3, t);
            g2.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc2.connect(g2); g2.connect(this.masterGainSfx);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
            osc1.connect(g);
            osc1.start(t); osc1.stop(t + 0.07);
            osc2.start(t); osc2.stop(t + 0.05);
        }
    }

    playExplosion() {
        if (this.volSfx <= 0.01) return;
        const t = this.ctx.currentTime;
        const pitchMul = 0.85 + Math.random() * 0.3;

        // Layer 1: Sub-bass impact
        const oscSub = this.ctx.createOscillator();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(60 * pitchMul, t);
        oscSub.frequency.exponentialRampToValueAtTime(18, t + 0.8);
        const gSub = this.ctx.createGain();
        gSub.gain.setValueAtTime(1.5, t);
        gSub.gain.setValueAtTime(1.2, t + 0.1);
        gSub.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        oscSub.connect(gSub); gSub.connect(this.masterGainSfx);
        oscSub.start(t); oscSub.stop(t + 0.8);

        // Layer 2: Distorted mid crunch via waveshaper
        const oscMid = this.ctx.createOscillator();
        oscMid.type = 'sawtooth';
        oscMid.frequency.setValueAtTime(300 * pitchMul, t);
        oscMid.frequency.exponentialRampToValueAtTime(25, t + 0.5);
        const shaper = this.ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x)); }
        shaper.curve = curve; shaper.oversample = '2x';
        const gMid = this.ctx.createGain();
        gMid.gain.setValueAtTime(0.5, t);
        gMid.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        oscMid.connect(shaper); shaper.connect(gMid); gMid.connect(this.masterGainSfx);
        oscMid.start(t); oscMid.stop(t + 0.5);

        // Layer 3: Debris scatter (square pops)
        const oscDebris = this.ctx.createOscillator();
        oscDebris.type = 'square';
        oscDebris.frequency.setValueAtTime(180 * pitchMul, t + 0.02);
        oscDebris.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        const gDebris = this.ctx.createGain();
        gDebris.gain.setValueAtTime(0, t);
        gDebris.gain.linearRampToValueAtTime(0.35, t + 0.02);
        gDebris.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        oscDebris.connect(gDebris); gDebris.connect(this.masterGainSfx);
        oscDebris.start(t); oscDebris.stop(t + 0.35);

        // Layer 4: Noise shrapnel burst
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filtLow = this.ctx.createBiquadFilter();
        filtLow.type = 'lowpass';
        filtLow.frequency.setValueAtTime(5000, t);
        filtLow.frequency.exponentialRampToValueAtTime(60, t + 0.7);
        const gNoise = this.ctx.createGain();
        gNoise.gain.setValueAtTime(0.8, t);
        gNoise.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
        noise.connect(filtLow); filtLow.connect(gNoise); gNoise.connect(this.masterGainSfx);
        noise.start(t); noise.stop(t + 0.7);

        // Layer 5: High sizzle tail
        const noiseTail = this.ctx.createBufferSource();
        noiseTail.buffer = this.noiseBuffer;
        const filtHi = this.ctx.createBiquadFilter();
        filtHi.type = 'highpass'; filtHi.frequency.value = 6000;
        const gTail = this.ctx.createGain();
        gTail.gain.setValueAtTime(0, t);
        gTail.gain.linearRampToValueAtTime(0.2, t + 0.05);
        gTail.gain.exponentialRampToValueAtTime(0.01, t + 0.9);
        noiseTail.connect(filtHi); filtHi.connect(gTail); gTail.connect(this.masterGainSfx);
        noiseTail.start(t); noiseTail.stop(t + 0.9);
    }

    playNovaBomb() {
        if (this.volSfx <= 0.01) return;
        const t = this.ctx.currentTime;

        // Layer 1: Massive sub sweep
        const oscSub = this.ctx.createOscillator();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(80, t);
        oscSub.frequency.linearRampToValueAtTime(30, t + 0.5);
        oscSub.frequency.exponentialRampToValueAtTime(8, t + 3.0);
        const gSub = this.ctx.createGain();
        gSub.gain.setValueAtTime(2.0, t);
        gSub.gain.setValueAtTime(1.5, t + 0.5);
        gSub.gain.exponentialRampToValueAtTime(0.01, t + 3.0);
        oscSub.connect(gSub); gSub.connect(this.masterGainSfx);
        oscSub.start(t); oscSub.stop(t + 3.0);

        // Layer 2: Distorted square sweep
        const oscSweep = this.ctx.createOscillator();
        oscSweep.type = 'square';
        oscSweep.frequency.setValueAtTime(1500, t);
        oscSweep.frequency.exponentialRampToValueAtTime(12, t + 2.8);
        const shaperNova = this.ctx.createWaveShaper();
        const curveNova = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curveNova[i] = Math.tanh(x * 3); }
        shaperNova.curve = curveNova;
        const gSweep = this.ctx.createGain();
        gSweep.gain.setValueAtTime(0.8, t);
        gSweep.gain.exponentialRampToValueAtTime(0.01, t + 2.8);
        oscSweep.connect(shaperNova); shaperNova.connect(gSweep); gSweep.connect(this.masterGainSfx);
        oscSweep.start(t); oscSweep.stop(t + 2.8);

        // Layer 3: Sawtooth overtone shimmer
        const oscShimmer = this.ctx.createOscillator();
        oscShimmer.type = 'sawtooth';
        oscShimmer.frequency.setValueAtTime(800, t);
        oscShimmer.frequency.exponentialRampToValueAtTime(20, t + 2.0);
        const gShimmer = this.ctx.createGain();
        gShimmer.gain.setValueAtTime(0.3, t);
        gShimmer.gain.exponentialRampToValueAtTime(0.01, t + 2.0);
        oscShimmer.connect(gShimmer); gShimmer.connect(this.masterGainSfx);
        oscShimmer.start(t); oscShimmer.stop(t + 2.0);

        // Layer 4: Evolving bandpass noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass'; filt.Q.value = 2;
        filt.frequency.setValueAtTime(200, t);
        filt.frequency.linearRampToValueAtTime(6000, t + 1.0);
        filt.frequency.exponentialRampToValueAtTime(30, t + 3.0);
        const gNoise = this.ctx.createGain();
        gNoise.gain.setValueAtTime(1.2, t);
        gNoise.gain.exponentialRampToValueAtTime(0.01, t + 3.0);
        noise.connect(filt); filt.connect(gNoise); gNoise.connect(this.masterGainSfx);
        noise.start(t); noise.stop(t + 3.0);

        // Layer 5: Metallic ring decay
        const oscRing = this.ctx.createOscillator();
        oscRing.type = 'sine';
        oscRing.frequency.setValueAtTime(440, t);
        oscRing.frequency.exponentialRampToValueAtTime(220, t + 2.5);
        const gRing = this.ctx.createGain();
        gRing.gain.setValueAtTime(0, t);
        gRing.gain.linearRampToValueAtTime(0.15, t + 0.3);
        gRing.gain.exponentialRampToValueAtTime(0.01, t + 2.5);
        oscRing.connect(gRing); gRing.connect(this.masterGainSfx);
        oscRing.start(t); oscRing.stop(t + 2.5);
    }

    playAbility() {
        if (this.volSfx <= 0.01) return;
        const t = this.ctx.currentTime;

        // Rising sweep
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, t);
        osc1.frequency.exponentialRampToValueAtTime(1500, t + 0.3);

        // Shimmer layer
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(800, t);
        osc2.frequency.linearRampToValueAtTime(2000, t + 0.2);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.7, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc1.connect(g); osc2.connect(g);
        g.connect(this.masterGainSfx);
        osc1.start(t); osc1.stop(t + 0.5);
        osc2.start(t); osc2.stop(t + 0.3);
    }

    playHit() {
        if (this.volSfx <= 0.01) return;
        const t = this.ctx.currentTime;
        // Randomized pitch for variety (each hit sounds slightly different)
        const baseFreq = 600 + Math.random() * 400;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
        osc.connect(g); g.connect(this.masterGainSfx);
        osc.start(t); osc.stop(t + 0.06);

        // Tiny noise click for crunch
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'highpass'; filt.frequency.value = 4000;
        const gn = this.ctx.createGain();
        gn.gain.setValueAtTime(0.15, t);
        gn.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        noise.connect(filt); filt.connect(gn); gn.connect(this.masterGainSfx);
        noise.start(t); noise.stop(t + 0.03);
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
        const t = this.ctx.currentTime;

        // Layer 1: Shield crack (distorted square burst)
        const oscCrack = this.ctx.createOscillator();
        oscCrack.type = 'square';
        oscCrack.frequency.setValueAtTime(400, t);
        oscCrack.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        const shaperHit = this.ctx.createWaveShaper();
        const curveHit = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curveHit[i] = Math.tanh(x * 5); }
        shaperHit.curve = curveHit;
        const gCrack = this.ctx.createGain();
        gCrack.gain.setValueAtTime(0.8, t);
        gCrack.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        oscCrack.connect(shaperHit); shaperHit.connect(gCrack); gCrack.connect(this.masterGainSfx);
        oscCrack.start(t); oscCrack.stop(t + 0.15);

        // Layer 2: Sub thump
        const oscThump = this.ctx.createOscillator();
        oscThump.type = 'sine';
        oscThump.frequency.setValueAtTime(70, t);
        oscThump.frequency.exponentialRampToValueAtTime(25, t + 0.25);
        const gThump = this.ctx.createGain();
        gThump.gain.setValueAtTime(1.0, t);
        gThump.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        oscThump.connect(gThump); gThump.connect(this.masterGainSfx);
        oscThump.start(t); oscThump.stop(t + 0.25);

        // Layer 3: Noise debris
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filtHit = this.ctx.createBiquadFilter();
        filtHit.type = 'bandpass';
        filtHit.frequency.setValueAtTime(1200, t);
        filtHit.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        filtHit.Q.value = 2;
        const gNoise = this.ctx.createGain();
        gNoise.gain.setValueAtTime(0.6, t);
        gNoise.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        noise.connect(filtHit); filtHit.connect(gNoise); gNoise.connect(this.masterGainSfx);
        noise.start(t); noise.stop(t + 0.3);

        // Layer 4: Warning alarm ping
        const oscPing = this.ctx.createOscillator();
        oscPing.type = 'sine';
        oscPing.frequency.setValueAtTime(1200, t);
        const gPing = this.ctx.createGain();
        gPing.gain.setValueAtTime(0, t);
        gPing.gain.linearRampToValueAtTime(0.2, t + 0.01);
        gPing.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        oscPing.connect(gPing); gPing.connect(this.masterGainSfx);
        oscPing.start(t); oscPing.stop(t + 0.15);
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
        // ═══════════════════════════════════════════════════════════════
        // MODERN CHIPTUNE TRACKER — 165 BPM — SYNTHWAVE / DEMOSCENE
        // Each pattern = 32 steps (2 bars of 4/4 at 16th notes)
        // Format: Arp Chord | Lead | Bass | Drum
        // ═══════════════════════════════════════════════════════════════

        // ─────────── MENU TRACK ─────────── (Fm → Db → Eb → Cm)
        const patMenu_A = this._parsePattern(`
            F3,Ab3,C4 | F5  | F2  | K
            -         | -   | -   | -
            F3,Ab3,C4 | C5  | F2  | H
            -         | -   | -   | -
            F3,Ab3,C4 | Ab5 | F2  | S
            -         | -   | -   | H
            F3,Ab3,C4 | G5  | F2  | K
            -         | F5  | -   | H
            Db3,F3,Ab3| F5  | Db2 | K
            -         | -   | -   | -
            Db3,F3,Ab3| C5  | Db2 | H
            -         | -   | -   | -
            Db3,F3,Ab3| Ab5 | Db2 | S
            -         | -   | -   | H
            Db3,F3,Ab3| G5  | Db2 | K
            -         | F5  | -   | H
            Eb3,G3,Bb3| G5  | Eb2 | K
            -         | -   | -   | -
            Eb3,G3,Bb3| Eb5 | Eb2 | H
            -         | -   | -   | -
            Eb3,G3,Bb3| Bb5 | Eb2 | S
            -         | -   | -   | H
            Eb3,G3,Bb3| G5  | Eb2 | K
            -         | Eb5 | -   | H
            C3,Eb3,G3 | C6  | C2  | K
            -         | -   | -   | -
            C3,Eb3,G3 | G5  | C2  | H
            -         | -   | -   | -
            C3,Eb3,G3 | Eb5 | C2  | S
            -         | -   | -   | H
            C3,Eb3,G3 | D5  | C2  | K
            -         | C5  | -   | H
        `);

        const patMenu_B = this._parsePattern(`
            Ab3,C4,Eb4| Eb5 | Ab1 | K
            -         | -   | -   | -
            Ab3,C4,Eb4| C5  | Ab1 | H
            -         | Ab4 | -   | -
            Ab3,C4,Eb4| Eb5 | Ab1 | S
            -         | C5  | -   | H
            Ab3,C4,Eb4| G5  | Ab1 | K
            -         | Eb5 | -   | H
            Bb3,D4,F4 | F5  | Bb1 | K
            -         | -   | -   | -
            Bb3,D4,F4 | D5  | Bb1 | H
            -         | Bb4 | -   | -
            Bb3,D4,F4 | F5  | Bb1 | S
            -         | D5  | -   | H
            Bb3,D4,F4 | A5  | Bb1 | K
            -         | F5  | -   | H
            C3,Eb3,G3 | G5  | C2  | K
            -         | -   | -   | -
            C3,Eb3,G3 | Eb5 | C2  | H
            -         | C5  | -   | -
            C3,Eb3,G3 | G5  | C2  | S
            -         | Eb5 | -   | H
            C3,Eb3,G3 | C6  | C2  | K
            -         | G5  | -   | H
            F3,Ab3,C4 | C5  | F2  | K
            -         | -   | -   | -
            F3,Ab3,C4 | Ab5 | F2  | H
            -         | F5  | -   | -
            F3,Ab3,C4 | C6  | F2  | S
            -         | Ab5 | -   | H
            F3,Ab3,C4 | G5  | F2  | K
            -         | F5  | -   | H
        `);

        // ─────────── PAUSE TRACK ─────────── (Ambient / Dreamy — Ab → Fm → Db → Eb)
        const patPause_A = this._parsePattern(`
            Ab3,C4,Eb4| -   | Ab1 | -
            -         | -   | -   | -
            Ab3,C4,Eb4| C5  | -   | -
            -         | -   | -   | -
            Ab3,C4,Eb4| -   | Ab1 | -
            -         | -   | -   | -
            Ab3,C4,Eb4| Eb5 | -   | -
            -         | -   | -   | -
            F3,Ab3,C4 | -   | F1  | -
            -         | -   | -   | -
            F3,Ab3,C4 | Ab4 | -   | -
            -         | -   | -   | -
            F3,Ab3,C4 | -   | F1  | -
            -         | -   | -   | -
            F3,Ab3,C4 | C5  | -   | -
            -         | -   | -   | -
            Db3,F3,Ab3| -   | Db1 | -
            -         | -   | -   | -
            Db3,F3,Ab3| F4  | -   | -
            -         | -   | -   | -
            Db3,F3,Ab3| -   | Db1 | -
            -         | -   | -   | -
            Db3,F3,Ab3| Ab4 | -   | -
            -         | -   | -   | -
            Eb3,G3,Bb3| -   | Eb1 | -
            -         | -   | -   | -
            Eb3,G3,Bb3| G4  | -   | -
            -         | -   | -   | -
            Eb3,G3,Bb3| -   | Eb1 | -
            -         | -   | -   | -
            Eb3,G3,Bb3| Bb4 | -   | -
            -         | -   | -   | -
        `);

        // ═══════════════════════════════════════════════════════════════
        // STANDARD GAME TRACKS (std_1 — std_8)
        // ═══════════════════════════════════════════════════════════════

        // STD 1 — "Neon Highway" (Cm → Ab → Bb → Gm) — Driving, heroic
        const patStd1_A = this._parsePattern(`
            C3,Eb3,G3 | C5  | C2  | K
            -         | -   | C2  | H
            C3,Eb3,G3 | Eb5 | C2  | -
            -         | -   | C2  | H
            C3,Eb3,G3 | G5  | C2  | S
            -         | F5  | C2  | H
            C3,Eb3,G3 | Eb5 | C2  | K
            -         | D5  | C2  | H
            Ab2,C3,Eb3| C5  | Ab1 | K
            -         | -   | Ab1 | H
            Ab2,C3,Eb3| G5  | Ab1 | -
            -         | -   | Ab1 | H
            Ab2,C3,Eb3| Bb5 | Ab1 | S
            -         | Ab5 | Ab1 | H
            Ab2,C3,Eb3| G5  | Ab1 | K
            -         | F5  | Ab1 | H
            Bb2,D3,F3 | D5  | Bb1 | K
            -         | -   | Bb1 | H
            Bb2,D3,F3 | F5  | Bb1 | -
            -         | -   | Bb1 | H
            Bb2,D3,F3 | Bb5 | Bb1 | S
            -         | G5  | Bb1 | H
            Bb2,D3,F3 | F5  | Bb1 | K
            -         | D5  | Bb1 | H
            G2,Bb2,D3 | D5  | G1  | K
            -         | -   | G1  | H
            G2,Bb2,D3 | G5  | G1  | -
            -         | -   | G1  | H
            G2,Bb2,D3 | D6  | G1  | S
            -         | Bb5 | G1  | H
            G2,Bb2,D3 | G5  | G1  | K
            -         | D5  | G1  | H
        `);

        // STD 2 — "Stellar Drift" (Am → F → G → Em) — Spacey, flowing
        const patStd2_A = this._parsePattern(`
            A2,C3,E3  | A4  | A1  | K
            -         | -   | A1  | H
            A2,C3,E3  | C5  | A1  | -
            -         | -   | A1  | H
            A2,C3,E3  | E5  | A1  | S
            -         | C5  | A1  | H
            A2,C3,E3  | D5  | A1  | K
            -         | C5  | A1  | H
            F2,A2,C3  | C5  | F1  | K
            -         | -   | F1  | H
            F2,A2,C3  | A5  | F1  | -
            -         | -   | F1  | H
            F2,A2,C3  | C6  | F1  | S
            -         | A5  | F1  | H
            F2,A2,C3  | G5  | F1  | K
            -         | F5  | F1  | H
            G2,B2,D3  | B4  | G1  | K
            -         | -   | G1  | H
            G2,B2,D3  | D5  | G1  | -
            -         | -   | G1  | H
            G2,B2,D3  | G5  | G1  | S
            -         | F5  | G1  | H
            G2,B2,D3  | D5  | G1  | K
            -         | B4  | G1  | H
            E2,G2,B2  | E5  | E1  | K
            -         | -   | E1  | H
            E2,G2,B2  | B5  | E1  | -
            -         | -   | E1  | H
            E2,G2,B2  | G5  | E1  | S
            -         | E5  | E1  | H
            E2,G2,B2  | B4  | E1  | K
            -         | E5  | E1  | H
        `);

        // STD 3 — "Void Runner" (Ebm → B → Db → Ab) — Dark, aggressive
        const patStd3_A = this._parsePattern(`
            Eb3,Gb3,Bb3| Eb5 | Eb2 | K
            -          | -   | Eb2 | H
            Eb3,Gb3,Bb3| Bb5 | Eb2 | K
            -          | -   | Eb2 | H
            Eb3,Gb3,Bb3| Gb5 | Eb2 | S
            -          | Eb5 | Eb2 | H
            Eb3,Gb3,Bb3| Db5 | Eb2 | K
            -          | Bb4 | Eb2 | H
            B2,Eb3,Gb3 | Gb5 | B1  | K
            -          | -   | B1  | H
            B2,Eb3,Gb3 | Eb5 | B1  | K
            -          | -   | B1  | H
            B2,Eb3,Gb3 | B5  | B1  | S
            -          | Ab5 | B1  | H
            B2,Eb3,Gb3 | Gb5 | B1  | K
            -          | Eb5 | B1  | H
            Db3,F3,Ab3 | Ab5 | Db2 | K
            -          | -   | Db2 | H
            Db3,F3,Ab3 | F5  | Db2 | K
            -          | -   | Db2 | H
            Db3,F3,Ab3 | Db6 | Db2 | S
            -          | Ab5 | Db2 | H
            Db3,F3,Ab3 | F5  | Db2 | K
            -          | Db5 | Db2 | H
            Ab2,C3,Eb3 | Eb5 | Ab1 | K
            -          | -   | Ab1 | H
            Ab2,C3,Eb3 | C5  | Ab1 | K
            -          | -   | Ab1 | H
            Ab2,C3,Eb3 | Ab5 | Ab1 | S
            -          | G5  | Ab1 | H
            Ab2,C3,Eb3 | Eb5 | Ab1 | K
            -          | C5  | Ab1 | H
        `);

        // STD 4 — "Crystal Cascade" (Em → C → D → Bm) — Bright, fast
        const patStd4_A = this._parsePattern(`
            E3,G3,B3  | E5  | E2  | K
            -         | -   | E2  | H
            E3,G3,B3  | G5  | E2  | -
            -         | -   | E2  | H
            E3,G3,B3  | B5  | E2  | S
            -         | A5  | E2  | H
            E3,G3,B3  | G5  | E2  | K
            -         | E5  | E2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | -   | C2  | H
            C3,E3,G3  | E5  | C2  | -
            -         | -   | C2  | H
            C3,E3,G3  | C6  | C2  | S
            -         | B5  | C2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | E5  | C2  | H
            D3,Gb3,A3 | A5  | D2  | K
            -         | -   | D2  | H
            D3,Gb3,A3 | Gb5 | D2  | -
            -         | -   | D2  | H
            D3,Gb3,A3 | D6  | D2  | S
            -         | A5  | D2  | H
            D3,Gb3,A3 | Gb5 | D2  | K
            -         | D5  | D2  | H
            B2,D3,Gb3 | Gb5 | B1  | K
            -         | -   | B1  | H
            B2,D3,Gb3 | B5  | B1  | -
            -         | -   | B1  | H
            B2,D3,Gb3 | D5  | B1  | S
            -         | Gb5 | B1  | H
            B2,D3,Gb3 | B5  | B1  | K
            -         | Gb5 | B1  | H
        `);

        // STD 5 — "Quantum Pulse" (Bbm → Gb → Ab → Fm) — Pulsing, intense
        const patStd5_A = this._parsePattern(`
            Bb2,Db3,F3| F5  | Bb1 | K
            -         | Db5 | Bb1 | H
            Bb2,Db3,F3| Bb5 | Bb1 | K
            -         | -   | Bb1 | H
            Bb2,Db3,F3| F5  | Bb1 | S
            -         | Db5 | Bb1 | H
            Bb2,Db3,F3| Ab5 | Bb1 | K
            -         | F5  | Bb1 | H
            Gb2,Bb2,Db3| Db5| Gb1 | K
            -         | -   | Gb1 | H
            Gb2,Bb2,Db3| Bb5| Gb1 | K
            -         | -   | Gb1 | H
            Gb2,Bb2,Db3| Db6| Gb1 | S
            -         | Bb5| Gb1 | H
            Gb2,Bb2,Db3| Gb5| Gb1 | K
            -         | Db5| Gb1 | H
            Ab2,C3,Eb3| Eb5 | Ab1 | K
            -         | C5  | Ab1 | H
            Ab2,C3,Eb3| Ab5 | Ab1 | K
            -         | -   | Ab1 | H
            Ab2,C3,Eb3| C5  | Ab1 | S
            -         | Eb5 | Ab1 | H
            Ab2,C3,Eb3| Ab5 | Ab1 | K
            -         | C5  | Ab1 | H
            F2,Ab2,C3 | C5  | F1  | K
            -         | -   | F1  | H
            F2,Ab2,C3 | F5  | F1  | K
            -         | -   | F1  | H
            F2,Ab2,C3 | Ab5 | F1  | S
            -         | F5  | F1  | H
            F2,Ab2,C3 | C5  | F1  | K
            -         | Ab4 | F1  | H
        `);

        // STD 6 — "Photon Storm" (Dm → Bb → C → Am) — Upbeat, triumphant
        const patStd6_A = this._parsePattern(`
            D3,F3,A3  | D5  | D2  | K
            -         | -   | D2  | H
            D3,F3,A3  | F5  | D2  | -
            -         | -   | D2  | H
            D3,F3,A3  | A5  | D2  | S
            -         | G5  | D2  | H
            D3,F3,A3  | F5  | D2  | K
            -         | E5  | D2  | H
            Bb2,D3,F3 | F5  | Bb1 | K
            -         | -   | Bb1 | H
            Bb2,D3,F3 | D5  | Bb1 | -
            -         | -   | Bb1 | H
            Bb2,D3,F3 | Bb5 | Bb1 | S
            -         | A5  | Bb1 | H
            Bb2,D3,F3 | F5  | Bb1 | K
            -         | D5  | Bb1 | H
            C3,E3,G3  | E5  | C2  | K
            -         | -   | C2  | H
            C3,E3,G3  | G5  | C2  | -
            -         | -   | C2  | H
            C3,E3,G3  | C6  | C2  | S
            -         | B5  | C2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | E5  | C2  | H
            A2,C3,E3  | E5  | A1  | K
            -         | -   | A1  | H
            A2,C3,E3  | A5  | A1  | -
            -         | -   | A1  | H
            A2,C3,E3  | C5  | A1  | S
            -         | E5  | A1  | H
            A2,C3,E3  | A5  | A1  | K
            -         | G5  | A1  | H
        `);

        // STD 7 — "Plasma Surge" (Gm → Eb → F → Dm) — Heavy, groovy
        const patStd7_A = this._parsePattern(`
            G2,Bb2,D3 | G5  | G1  | K
            -         | Bb5 | G1  | H
            G2,Bb2,D3 | D5  | G1  | K
            -         | -   | G1  | H
            G2,Bb2,D3 | G5  | G1  | S
            -         | F5  | G1  | H
            G2,Bb2,D3 | D5  | G1  | K
            -         | Bb4 | G1  | H
            Eb3,G3,Bb3| Bb5 | Eb2 | K
            -         | G5  | Eb2 | H
            Eb3,G3,Bb3| Eb5 | Eb2 | K
            -         | -   | Eb2 | H
            Eb3,G3,Bb3| Bb5 | Eb2 | S
            -         | G5  | Eb2 | H
            Eb3,G3,Bb3| Eb5 | Eb2 | K
            -         | D5  | Eb2 | H
            F3,A3,C4  | C5  | F2  | K
            -         | A5  | F2  | H
            F3,A3,C4  | F5  | F2  | K
            -         | -   | F2  | H
            F3,A3,C4  | C6  | F2  | S
            -         | A5  | F2  | H
            F3,A3,C4  | F5  | F2  | K
            -         | E5  | F2  | H
            D3,F3,A3  | A5  | D2  | K
            -         | F5  | D2  | H
            D3,F3,A3  | D5  | D2  | K
            -         | -   | D2  | H
            D3,F3,A3  | A5  | D2  | S
            -         | G5  | D2  | H
            D3,F3,A3  | F5  | D2  | K
            -         | D5  | D2  | H
        `);

        // STD 8 — "Warp Drive" (Dbm → A → B → Abm) — Ethereal, mysterious
        const patStd8_A = this._parsePattern(`
            Db3,E3,Ab3| Db5 | Db2 | K
            -         | -   | Db2 | H
            Db3,E3,Ab3| E5  | Db2 | -
            -         | -   | Db2 | H
            Db3,E3,Ab3| Ab5 | Db2 | S
            -         | E5  | Db2 | H
            Db3,E3,Ab3| Db6 | Db2 | K
            -         | Ab5 | Db2 | H
            A2,Db3,E3 | E5  | A1  | K
            -         | -   | A1  | H
            A2,Db3,E3 | Db5 | A1  | -
            -         | -   | A1  | H
            A2,Db3,E3 | A5  | A1  | S
            -         | E5  | A1  | H
            A2,Db3,E3 | Db5 | A1  | K
            -         | A4  | A1  | H
            B2,Eb3,Gb3| Gb5 | B1  | K
            -         | -   | B1  | H
            B2,Eb3,Gb3| Eb5 | B1  | -
            -         | -   | B1  | H
            B2,Eb3,Gb3| B5  | B1  | S
            -         | Gb5 | B1  | H
            B2,Eb3,Gb3| Eb5 | B1  | K
            -         | B4  | B1  | H
            Ab2,B2,Eb3| Eb5 | Ab1 | K
            -         | -   | Ab1 | H
            Ab2,B2,Eb3| Ab5 | Ab1 | -
            -         | -   | Ab1 | H
            Ab2,B2,Eb3| B5  | Ab1 | S
            -         | Eb5 | Ab1 | H
            Ab2,B2,Eb3| Ab5 | Ab1 | K
            -         | Eb5 | Ab1 | H
        `);

        // ═══════════════════════════════════════════════════════════════
        // BOSS TRACKS (boss_1 — boss_4) — Aggressive, menacing, fast
        // ═══════════════════════════════════════════════════════════════

        // BOSS 1 — "Dreadnought" (Dm → Bb → Gm → A) — Relentless
        const patBoss1_A = this._parsePattern(`
            D3,F3,A3  | D5  | D2  | K
            -         | F5  | D2  | H
            D3,F3,A3  | A5  | D2  | K
            -         | Bb5 | D2  | H
            D3,F3,A3  | A5  | D2  | S
            -         | F5  | D2  | H
            D3,F3,A3  | E5  | D2  | K
            -         | F5  | D2  | H
            Bb2,D3,F3 | Bb4 | Bb1 | K
            -         | D5  | Bb1 | H
            Bb2,D3,F3 | F5  | Bb1 | K
            -         | G5  | Bb1 | H
            Bb2,D3,F3 | F5  | Bb1 | S
            -         | D5  | Bb1 | H
            Bb2,D3,F3 | C5  | Bb1 | K
            -         | D5  | Bb1 | H
            G2,Bb2,D3 | D5  | G1  | K
            -         | G5  | G1  | H
            G2,Bb2,D3 | Bb5 | G1  | K
            -         | A5  | G1  | H
            G2,Bb2,D3 | G5  | G1  | S
            -         | D5  | G1  | H
            G2,Bb2,D3 | F5  | G1  | K
            -         | D5  | G1  | H
            A2,Db3,E3 | E5  | A1  | K
            -         | A5  | A1  | H
            A2,Db3,E3 | Db5 | A1  | K
            -         | E5  | A1  | H
            A2,Db3,E3 | A5  | A1  | S
            -         | Db6 | A1  | H
            A2,Db3,E3 | E5  | A1  | K
            -         | Db5 | A1  | H
        `);

        // BOSS 2 — "Crimson Tide" (Em → C → Am → B) — Dark & dramatic
        const patBoss2_A = this._parsePattern(`
            E3,G3,B3  | E5  | E2  | K
            -         | G5  | E2  | H
            E3,G3,B3  | B5  | E2  | K
            -         | E6  | E2  | H
            E3,G3,B3  | B5  | E2  | S
            -         | G5  | E2  | H
            E3,G3,B3  | Gb5 | E2  | K
            -         | E5  | E2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | C5  | C2  | H
            C3,E3,G3  | E5  | C2  | K
            -         | G5  | C2  | H
            C3,E3,G3  | C6  | C2  | S
            -         | B5  | C2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | E5  | C2  | H
            A2,C3,E3  | A5  | A1  | K
            -         | C5  | A1  | H
            A2,C3,E3  | E5  | A1  | K
            -         | A5  | A1  | H
            A2,C3,E3  | E5  | A1  | S
            -         | C5  | A1  | H
            A2,C3,E3  | B4  | A1  | K
            -         | A4  | A1  | H
            B2,Eb3,Gb3| B4  | B1  | K
            -         | Eb5 | B1  | H
            B2,Eb3,Gb3| Gb5 | B1  | K
            -         | B5  | B1  | H
            B2,Eb3,Gb3| Gb5 | B1  | S
            -         | Eb5 | B1  | H
            B2,Eb3,Gb3| Eb5 | B1  | K
            -         | B4  | B1  | H
        `);

        // BOSS 3 — "Supernova" (Fm → Db → Bbm → C) — Frantic, climactic
        const patBoss3_A = this._parsePattern(`
            F3,Ab3,C4 | F5  | F2  | K
            -         | C5  | F2  | H
            F3,Ab3,C4 | Ab5 | F2  | K
            -         | C6  | F2  | H
            F3,Ab3,C4 | Ab5 | F2  | S
            -         | F5  | F2  | H
            F3,Ab3,C4 | Eb5 | F2  | K
            -         | C5  | F2  | H
            Db3,F3,Ab3| Ab5 | Db2 | K
            -         | F5  | Db2 | H
            Db3,F3,Ab3| Db5 | Db2 | K
            -         | Ab5 | Db2 | H
            Db3,F3,Ab3| F5  | Db2 | S
            -         | Db5 | Db2 | H
            Db3,F3,Ab3| C5  | Db2 | K
            -         | Db5 | Db2 | H
            Bb2,Db3,F3| F5  | Bb1 | K
            -         | Db5 | Bb1 | H
            Bb2,Db3,F3| Bb5 | Bb1 | K
            -         | F5  | Bb1 | H
            Bb2,Db3,F3| Db5 | Bb1 | S
            -         | Bb4 | Bb1 | H
            Bb2,Db3,F3| Ab4 | Bb1 | K
            -         | Bb4 | Bb1 | H
            C3,E3,G3  | E5  | C2  | K
            -         | G5  | C2  | H
            C3,E3,G3  | C6  | C2  | K
            -         | G5  | C2  | H
            C3,E3,G3  | E5  | C2  | S
            -         | C5  | C2  | H
            C3,E3,G3  | G5  | C2  | K
            -         | E5  | C2  | H
        `);

        // BOSS 4 — "Singularity" (Abm → E → Gb → Ebm) — Crushing, final
        const patBoss4_A = this._parsePattern(`
            Ab2,B2,Eb3| Ab4 | Ab1 | K
            -         | Eb5 | Ab1 | H
            Ab2,B2,Eb3| B5  | Ab1 | K
            -         | Eb5 | Ab1 | H
            Ab2,B2,Eb3| Ab5 | Ab1 | S
            -         | B4  | Ab1 | H
            Ab2,B2,Eb3| Eb5 | Ab1 | K
            -         | Ab4 | Ab1 | H
            E2,Ab2,B2 | B4  | E1  | K
            -         | E5  | E1  | H
            E2,Ab2,B2 | Ab5 | E1  | K
            -         | B5  | E1  | H
            E2,Ab2,B2 | E5  | E1  | S
            -         | Ab4 | E1  | H
            E2,Ab2,B2 | B4  | E1  | K
            -         | E5  | E1  | H
            Gb2,Bb2,Db3| Db5| Gb1 | K
            -         | Gb5 | Gb1 | H
            Gb2,Bb2,Db3| Bb5| Gb1 | K
            -         | Db6 | Gb1 | H
            Gb2,Bb2,Db3| Gb5| Gb1 | S
            -         | Db5 | Gb1 | H
            Gb2,Bb2,Db3| Bb4| Gb1 | K
            -         | Db5 | Gb1 | H
            Eb3,Gb3,Bb3| Bb5| Eb2 | K
            -         | Gb5 | Eb2 | H
            Eb3,Gb3,Bb3| Eb5| Eb2 | K
            -         | Bb5 | Eb2 | H
            Eb3,Gb3,Bb3| Gb5| Eb2 | S
            -         | Eb5 | Eb2 | H
            Eb3,Gb3,Bb3| Bb4| Eb2 | K
            -         | Eb5 | Eb2 | H
        `);

        // ═══════════════════════════════════════════════════════════════
        // TRACK MAP
        // ═══════════════════════════════════════════════════════════════
        this.tracks = {
            'menu':   [patMenu_A, patMenu_B, patMenu_A, patMenu_B],
            'pause':  [patPause_A, patPause_A],
            'std_1':  [patStd1_A, patStd1_A],
            'std_2':  [patStd2_A, patStd2_A],
            'std_3':  [patStd3_A, patStd3_A],
            'std_4':  [patStd4_A, patStd4_A],
            'std_5':  [patStd5_A, patStd5_A],
            'std_6':  [patStd6_A, patStd6_A],
            'std_7':  [patStd7_A, patStd7_A],
            'std_8':  [patStd8_A, patStd8_A],
            'boss_1': [patBoss1_A, patBoss1_A],
            'boss_2': [patBoss2_A, patBoss2_A],
            'boss_3': [patBoss3_A, patBoss3_A],
            'boss_4': [patBoss4_A, patBoss4_A]
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

        if (code === 'K') { // Kick → Electronic sub-pulse (not a drum!)
            // Gentle sidechain pump for groove
            this.sidechainGain.gain.setValueAtTime(0.3, time);
            this.sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.15);

            // Short sub-bass pulse (like a synth throb, not a kick drum)
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(55, time); // Low A — pure sub tone
            osc.frequency.setValueAtTime(45, time + 0.08);
            gain.gain.setValueAtTime(0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
            osc.connect(gain);
            osc.start(time); osc.stop(time + 0.12);

        } else if (code === 'S') { // Snare → Short filtered noise burst (electronic clap)
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 3500;
            filter.Q.value = 1.5;
            gain.gain.setValueAtTime(0.35, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            noise.connect(filter); filter.connect(gain);
            noise.start(time); noise.stop(time + 0.1);

        } else if (code === 'H') { // Hihat → Tiny metallic tick
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 9000;
            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.025);
            noise.connect(filter); filter.connect(gain);
            noise.start(time); noise.stop(time + 0.025);
        }
    }

    _playLead(note, time) {
        if (!note) return;
        const freq = this._noteToFreq(note);
        const gain = this.ctx.createGain();
        gain.connect(this.masterGainMusic);

        // Warm, musical dual oscillator lead
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'triangle'; // Softer fundamental
        osc2.type = 'sawtooth'; // Light overtones
        
        // Slight detune for chorus effect
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.002, time);

        // Filter out harsh highs
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
        
        // Tighten duration to prevent overlapping dissonant notes
        const dur = this.stepDuration * 0.95; 
        gain.gain.setValueAtTime(0.1, time + dur * 0.5);
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

        // Modern lowpass filter, doesn't drop all the way to 0 to keep the bass alive
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 6; 
        filter.frequency.setValueAtTime(1500, time);
        filter.frequency.exponentialRampToValueAtTime(250, time + this.stepDuration * 0.5);

        // Drive the signal hot into the filter
        const driveGain = this.ctx.createGain();
        driveGain.gain.value = 2.0; 

        osc1.connect(driveGain);
        oscSub.connect(driveGain);
        driveGain.connect(filter);
        filter.connect(gain);

        // Tight bass envelope (prevents muddy overlapping dissonance)
        const dur = this.stepDuration * 0.95; 
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.7, time + 0.02); 
        // Quick decay to 0.2 for punch, then fade out
        gain.gain.exponentialRampToValueAtTime(0.2, time + dur * 0.5);
        gain.gain.linearRampToValueAtTime(0.01, time + dur);

        osc1.start(time); osc1.stop(time + dur);
        oscSub.start(time); oscSub.stop(time + dur);
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
        this.arpOsc.type = 'triangle'; // Softer, finer modern sound
        
        this.arpGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.arpGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.02);
        
        this.arpOsc.connect(this.arpGain);
        this.arpGain.connect(this.masterGainMusic);
        this.arpOsc.start();

        // 16th note arpeggiator tick (much calmer, less hectic)
        const arpSpeedMs = this.stepDuration * 1000;
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

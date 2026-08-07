/**
 * @file GameScene.js
 * @description Main gameplay scene for Neon Space Defender. Manages core loop, player movement, enemy spawning, 
 * collision detection, wave progression, and integrates all major game systems.
 * @module GameScene
 */
import Phaser from 'phaser';
import AudioSystem from '../systems/AudioSystem.js';
import EnvironmentSystem from '../systems/EnvironmentSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import EventSystem from '../systems/EventSystem.js';
import JuiceSystem from '../systems/JuiceSystem.js';
import AchievementSystem from '../systems/AchievementSystem.js';
import BossSystem from '../systems/BossSystem.js';
import AbilitySystem from '../systems/AbilitySystem.js';
import HazardSystem from '../systems/HazardSystem.js';
import { getMetaStats } from '../systems/MetaUpgrades.js';

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════

// Global list of in-run upgrades accessible during level up.
const UPGRADES = [
    { id: 'multi_shot', name: 'DOUBLE BARREL',   desc: '+1 Schuss gleichzeitig (max 6)',     color: '#00ffff' },
    { id: 'speed',      name: 'HYPERDRIVE',       desc: '+20% Bewegungsgeschwindigkeit',       color: '#ffff00' },
    { id: 'damage',     name: 'HEAVY ROUNDS',     desc: '+40% Schaden pro Treffer',           color: '#ff6600' },
    { id: 'fire_rate',  name: 'RAPID FIRE',       desc: '-20% Feuer-Verzögerung',             color: '#ff3300' },
    { id: 'nova',       name: 'NOVA BOMBE',       desc: '+1 Nova-Bombe (Taste Q zünden)',     color: '#ff00ff' },
    { id: 'magnet',     name: 'XP-MAGNET',        desc: '+80px XP-Anziehungsradius',          color: '#aa00ff' },
    { id: 'regen',      name: 'NANO-REPARATUR',   desc: '+3 HP pro Sekunde Regeneration',     color: '#00ff66' },
    { id: 'area',       name: 'SCHOCKWELLE',      desc: 'AoE-Explosion beim Töten',           color: '#ffffff' },
    { id: 'maxhp',      name: 'PANZER-HULL',      desc: '+30 maximale HP + volle Heilung',    color: '#ff4444' },
    { id: 'crit',       name: 'KRITISCHE SYSTEME',desc: '20% Chance auf 3x Schaden',          color: '#ffdd00' }
];

// Base stats, xp yields, and behavioral flags for all enemy types.
const ENEMY_DEFS = {
    basic:   { hp: 30,  speed: 80,  score: 10, xp: 8,  color: 0xff2244, shoots: false },
    fast:    { hp: 15,  speed: 165, score: 15, xp: 10, color: 0xff8800, shoots: false },
    tank:    { hp: 180, speed: 45,  score: 35, xp: 28, color: 0x9900ff, shoots: false },
    shooter: { hp: 50,  speed: 55,  score: 30, xp: 20, color: 0xddcc00, shoots: true  },
    elite:   { hp: 90,  speed: 115, score: 60, xp: 45, color: 0xff00cc, shoots: false },
    swarmer: { hp: 5,   speed: 130, score: 5,  xp: 4,  color: 0x44ff44, shoots: false },
    phantom: { hp: 45,  speed: 95,  score: 40, xp: 30, color: 0x4444ff, shoots: false },
    stealth: { hp: 70,  speed: 140, score: 50, xp: 35, color: 0x222222, shoots: false },
    carrier: { hp: 400, speed: 20,  score: 100, xp: 80, color: 0x00ffaa, shoots: false },
    laser:   { hp: 60,  speed: 35,  score: 60, xp: 40, color: 0xff0000, shoots: true },
    boss:      { hp: 2500, speed: 25, score: 1000, xp: 500, color: 0xff0000, shoots: true },
    mothership:{ hp: 4500, speed: 30, score: 1500, xp: 800, color: 0xff00ff, shoots: true },
    hivemind:  { hp: 6000, speed: 40, score: 2000, xp: 1000, color: 0x00ff00, shoots: true },
    hivemind_clone: { hp: 1500, speed: 110, score: 400, xp: 200, color: 0x55ff55, shoots: true },
    destroyer: { hp: 8000, speed: 20, score: 3000, xp: 1500, color: 0xffaa00, shoots: true },
    charger:   { hp: 120, speed: 20, score: 55, xp: 40, color: 0xffaa00, shoots: false },
    protector: { hp: 200, speed: 30, score: 70, xp: 50, color: 0x00aaff, shoots: false },
    boss_cheese: { hp: 3000, speed: 20, score: 2000, xp: 1000, color: 0xffff00, shoots: true },
    boss_irs: { hp: 4500, speed: 30, score: 3000, xp: 1500, color: 0xff0000, shoots: true },
    boss_irs_p2: { hp: 6000, speed: 45, score: 4000, xp: 2000, color: 0xff4400, shoots: true },
    boss_vacuum: { hp: 6000, speed: 40, score: 4000, xp: 2000, color: 0x00ffff, shoots: true },
    boss_vacuum_p2: { hp: 8000, speed: 60, score: 6000, xp: 3000, color: 0x00ff00, shoots: true },
};

/**
 * @description Procedurally determines enemy composition for a given wave.
 * @param {number} wave - Wave index.
 * @returns {Object} Dictionary of enemy types and quantities.
 */
function getWaveComp(wave) {
    if (wave % 20 === 0) return { destroyer: 1 };
    if (wave % 15 === 0) return { isBoss: true, type: 'boss_vacuum' };
    if (wave % 10 === 0) return { isBoss: true, type: 'boss_irs' };
    if (wave % 5 === 0) return { isBoss: true, type: 'boss' };
    const n = 12 + Math.floor(wave * 4.5 + Math.pow(wave, 1.2));
    if (wave === 1) return { basic: n };
    if (wave === 2) return { basic: Math.ceil(n*0.5), swarmer: Math.ceil(n*0.5) };
    if (wave === 3) return { basic: Math.ceil(n*0.4), fast: Math.ceil(n*0.3), tank: Math.ceil(n*0.3) };
    if (wave === 4) return { swarmer: Math.ceil(n*0.5), fast: Math.ceil(n*0.25), phantom: Math.ceil(n*0.25) };
    if (wave === 6) return { stealth: Math.ceil(n*0.3), basic: Math.ceil(n*0.4), tank: Math.ceil(n*0.3) };
    if (wave === 7) return { carrier: 1, basic: Math.ceil(n*0.5), shooter: Math.ceil(n*0.4) };
    if (wave === 8) return { laser: Math.ceil(n*0.2), elite: Math.ceil(n*0.3), stealth: Math.ceil(n*0.2), swarmer: Math.ceil(n*0.3) };
    if (wave === 9) return { charger: Math.ceil(n*0.4), protector: 2, basic: Math.ceil(n*0.5) };
    if (wave < 12) return { basic: Math.ceil(n*0.1), fast: Math.ceil(n*0.15), tank: Math.ceil(n*0.1), shooter: Math.ceil(n*0.15), elite: Math.ceil(n*0.1), phantom: Math.ceil(n*0.1), swarmer: Math.ceil(n*0.1), charger: Math.ceil(n*0.1), protector: Math.ceil(n*0.1) };
    
    return { 
        basic: Math.ceil(n*0.05), fast: Math.ceil(n*0.1), tank: Math.ceil(n*0.1), 
        shooter: Math.ceil(n*0.1), elite: Math.ceil(n*0.1), phantom: Math.ceil(n*0.1), 
        swarmer: Math.ceil(n*0.1), stealth: Math.ceil(n*0.1), laser: Math.ceil(n*0.05), 
        charger: Math.ceil(n*0.1), protector: Math.ceil(n*0.05),
        carrier: Math.min(5, Math.ceil(n*0.05)) 
    };
}

// ═══════════════════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════════════════

/**
 * @class GameScene
 * @extends Phaser.Scene
 * @description Central scene controlling the gameplay loop, rendering, input handling, and object pooling.
 */
export default class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    /**
     * @description Bootstraps the scene with provided data, loading player stats, ship class, and meta upgrades.
     * @param {Object} data - Initialization parameters passed from previous scenes.
     */
    init(data) {
        this.shipClass = data?.shipClass || localStorage.getItem('neon_selected_ship') || 'standard';
        this.weaponClass = data?.weaponClass || localStorage.getItem('neon_selected_weapon') || 'pulse';
        
        const getSafeInt = (key) => {
            const val = parseInt(localStorage.getItem(key));
            return isNaN(val) ? 0 : val;
        };
        // Load persistent meta-upgrades and apply them as base stat augmentations
        const pHP = getSafeInt('neon_upg_base_hp') * 20;
        const pDmg = getSafeInt('neon_upg_base_dmg') * 0.15;
        const pSpd = getSafeInt('neon_upg_base_speed') * 0.05;
        const pMag = getSafeInt('neon_upg_magnet') * 40;
        const pGreed = getSafeInt('neon_upg_greed') * 0.15;
        const pCrit = getSafeInt('neon_upg_crit') * 0.05;
        const pCool = getSafeInt('neon_upg_cooldown') * 0.05;
        const pShield = getSafeInt('neon_upg_start_shields');
        const pNova = getSafeInt('neon_upg_start_novas');

        let hpMod = 1, dmgMod = 1, spdMod = 1, critMod = false, shieldMod = 0, novaMod = 0;
        let bonusShots = 0, autoTargetCount = 1, isExplosive = false, baseRegen = 0, extraDropChance = 0;
        
        if (this.shipClass === 'standard') {
            extraDropChance = 0.20; // Lucky Looter
        } else if (this.shipClass === 'interceptor') {
            hpMod = 0.5; dmgMod = 1.2; spdMod = 1.5; critMod = true;
        } else if (this.shipClass === 'dreadnought') {
            hpMod = 2.5; dmgMod = 1.5; spdMod = 0.7; shieldMod = 1; baseRegen = 0.5;
        } else if (this.shipClass === 'phantom') {
            hpMod = 0.3; dmgMod = 2.0; spdMod = 1.8;
            bonusShots = 1;
            autoTargetCount = 2; // Multitarget
        } else if (this.shipClass === 'paladin') {
            hpMod = 1.5; dmgMod = 0.8; spdMod = 0.8; shieldMod = 2;
        } else if (this.shipClass === 'bomber') {
            hpMod = 1.2; dmgMod = 1.1; spdMod = 0.9;
            isExplosive = true; // Explosive Payload
        }

        const techPierceStart = parseInt(localStorage.getItem('neon_tech_pierce_start')||'0') > 0;
        const techOrbitals = parseInt(localStorage.getItem('neon_tech_orbitals')||'0') > 0;
        this.shakeEnabled = (localStorage.getItem('neon_shake') !== 'false');

        // ── Apply weapon class modifiers ──
        let weaponShotsMod = 1, weaponDmgMod = 1, weaponFireMod = 1, weaponPierce = techPierceStart;
        let weaponLifespan = 0; // 0 = infinite

        if (this.weaponClass === 'scatter') {
            weaponShotsMod = 3;  
            weaponDmgMod = 0.6; // lower damage per pellet
            weaponFireMod = 0.8; // faster fire
            weaponLifespan = 400; // limited range shotgun
        } else if (this.weaponClass === 'railgun') {
            weaponShotsMod = 1;  
            weaponDmgMod = 2.5; // much higher damage
            weaponFireMod = 1.8; // very slow fire
            weaponPierce = true; // always pierces
        }

        const meta = getMetaStats();

        this.pd = {
            hp: (100 + pHP) * hpMod * meta.hpMult, maxHp: (100 + pHP) * hpMod * meta.hpMult, shield: pShield + shieldMod,
            baseSpeed: (260 * (1 + pSpd)) * spdMod, speed: (260 * (1 + pSpd)) * spdMod,
            fireDelay: Math.round(380 * weaponFireMod * Math.max(0.2, 1 - pCool)), damage: (18 * (1 + pDmg)) * dmgMod * weaponDmgMod * meta.dmgMult,
            shots: weaponShotsMod + bonusShots, level: 1, xp: 0, xpToNext: 80,
            weaponLevel: 1, autoTargetCount: autoTargetCount, isExplosive: isExplosive, extraDropChance: extraDropChance,
            nova: pNova + novaMod, pierce: weaponPierce, crit: critMod, critBoost: pCrit, weaponLifespan: weaponLifespan,
            magnetRange: 130 + pMag + meta.magnetBonus, regen: baseRegen, aoe: false,
            greedMult: meta.greedMult + pGreed,
            orbitals: 0,
            hasLightning: false,
            hasBlackHole: false,
            hasCryo: false,
            hasDrones: false,
            hasRevive: parseInt(localStorage.getItem('neon_tech_revive')||'0') > 0 || parseInt(localStorage.getItem('neon_upg_extra_life')||'0') > 0,
            hasSupernova: false,
            hasLaserWhip: false,
            hasVoidVortex: false,
            hasFrostAegis: false,
            unlockDash: parseInt(localStorage.getItem('neon_tech_dash')||'0') > 0,
            unlockShield: parseInt(localStorage.getItem('neon_tech_shield')||'0') > 0,
            unlockTesla: parseInt(localStorage.getItem('neon_tech_tesla')||'0') > 0,
            unlockSingularity: parseInt(localStorage.getItem('neon_tech_singularity')||'0') > 0,
            unlockCryo: parseInt(localStorage.getItem('neon_tech_cryo')||'0') > 0,
            unlockDrones: parseInt(localStorage.getItem('neon_tech_drones')||'0') > 0,
            unlockFusion: parseInt(localStorage.getItem('neon_tech_fusion')||'0') > 0,
            unlockPierceStart: parseInt(localStorage.getItem('neon_tech_pierce_start')||'0') > 0,
            unlockOrbitals: parseInt(localStorage.getItem('neon_tech_orbitals')||'0') > 0,
            unlockRevive: parseInt(localStorage.getItem('neon_tech_revive')||'0') > 0 || parseInt(localStorage.getItem('neon_upg_extra_life')||'0') > 0,
            unlockAegis: parseInt(localStorage.getItem('neon_tech_aegis')||'0') > 0,
            unlockVoidShield: parseInt(localStorage.getItem('neon_tech_void_shield')||'0') > 0,
            unlockLaserDrones: parseInt(localStorage.getItem('neon_tech_laser_drones')||'0') > 0,
            unlockMirrorShield: parseInt(localStorage.getItem('neon_tech_mirror_shield')||'0') > 0,
            unlockDoomBeam: parseInt(localStorage.getItem('neon_tech_doom_beam')||'0') > 0,
            unlockSonicWave: parseInt(localStorage.getItem('neon_tech_sonic_wave')||'0') > 0,
            unlockMines: parseInt(localStorage.getItem('neon_tech_mines')||'0') > 0,
            unlockSawblades: parseInt(localStorage.getItem('neon_tech_sawblades')||'0') > 0,
            unlockFocusLaser: parseInt(localStorage.getItem('neon_tech_focus_laser')||'0') > 0,
            unlockHeavyCannon: parseInt(localStorage.getItem('neon_tech_heavy_cannon')||'0') > 0,
            unlockDamageAura: parseInt(localStorage.getItem('neon_tech_damage_aura')||'0') > 0,
            unlockScrapMagnet: parseInt(localStorage.getItem('neon_tech_scrap_magnet')||'0') > 0,
            unlockCubeBooster: parseInt(localStorage.getItem('neon_tech_cube_booster')||'0') > 0,
            upgLevels: {},
            scrap: parseInt(localStorage.getItem('neon_scrap') || '0', 10) || 0,
            cubes: 0,
        };

        if (this.pd.unlockAegis) {
            this.pd.maxHp = Math.floor(this.pd.maxHp * 1.5);
            this.pd.hp = this.pd.maxHp;
        }
        
        // Note: unlockVoidShield and unlockLaserDrones effects are applied dynamically 
        // when damage is dealt or weapons are fired, so we just keep the boolean flag here.

        // Schrott-Magnet: Permanent double magnet range
        if (this.pd.unlockScrapMagnet) {
            this.pd.magnetRange *= 2;
        }

        this.score       = 0;
        this.waveNum     = 1;
        this.waveLeft    = 0;
        this.betweenWaves = true;
        this.isGameOver  = false;
        this.bossRef     = null;
        this.comboCount  = 0;
        this.lastKillTime = 0;
        this.playerInvincible = false;
        this.stars       = [];
    }

    // ─────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────
    /**
     * @description Sets up the scene's objects, UI, inputs, physics groups, and external systems.
     */
    create() {
        const { width: cw, height: ch } = this.scale;
        this.cw = cw; this.ch = ch;

        // Hide menu layer if visible
        const ml = document.getElementById('menu-layer');
        if (ml) ml.style.display = 'none';
        const up = document.getElementById('upgrade-panel');
        if (up) up.style.display = 'none';
        const go = document.getElementById('gameover-overlay');
        if (go) go.style.display = 'none';

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Q,E,R,SPACE,SHIFT,ESC,F6');
        this.keys.Q.on('down', () => this.activateNovaBomb());
        this.keys.R.on('down', () => this.useActiveItem());

        this.keys.ESC.on('down', () => {
            this.scene.pause();
            this.scene.launch('PauseScene');
        });
        this.keys.F6.on('down', () => this.toggleDevMenu());
        this.input.on('pointermove', p => this._mouseX = p.x);

        // Initialize AAA Systems
        if (!this.game.audioSys) this.game.audioSys = new AudioSystem(this);
        this.audioSys = this.game.audioSys;
        this.audioSys.scene = this;

        this.envSys = new EnvironmentSystem(this);
        this.weaponSys = new WeaponSystem(this);
        this.eventSys = new EventSystem(this);
        this.juiceSys = new JuiceSystem(this);
        this.achieveSys = new AchievementSystem();
        this.bossSys = new BossSystem(this);
        this.abilitySys = new AbilitySystem(this);
        this.hazardSys = new HazardSystem(this);

        this.envSys.create(); // Creates the parallax deep-space background
        this.generateTextures();
        this.initDOMCache(); // Initialize cached DOM elements for HUD
        
        if (this.audioSys) {
            const startTracks = ['std_1','std_2','std_3','std_4','std_5','std_6','std_7','std_8'];
            this.audioSys.playMusic(Phaser.Utils.Array.GetRandom(startTracks));
        }

        // Groups — bullets use pool pattern (get/killAndHide) so velocity is preserved
        this.enemies  = this.physics.add.group();
        this.bullets  = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 200, runChildUpdate: false
        });
        this.eBullets = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 200, runChildUpdate: false
        });
        this.crystals = this.physics.add.group();
        this.scraps = this.physics.add.group();
        this.cubesGroup = this.physics.add.group();
        this.orbitalsGroup = this.physics.add.group();
        if (this.pd.orbitals > 0) {
            this.time.delayedCall(10, () => this.updateOrbitals());
        }
        this.weaponUpgradesGroup = this.physics.add.group();

        // Object Pools for Performance Optimizations
        this.dmgTexts = this.add.group({ classType: Phaser.GameObjects.Text, maxSize: 80, runChildUpdate: false });
        
        this.poolGlowFX = [];
        this.poolDebrisFX = [];
        for (let i = 0; i < 20; i++) {
            this.poolGlowFX.push(this.add.particles(0, 0, 'p_glow', {
                speed: { min: 50, max: 200 }, scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 }, blendMode: 'ADD', lifespan: 550, emitting: false
            }).setDepth(12));
            
            this.poolDebrisFX.push(this.add.particles(0, 0, 'p_debris', {
                speed: { min: 100, max: 300 }, scale: { start: 0.8, end: 0.2 },
                alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 360 },
                gravityY: 0, friction: 0.05, lifespan: 800, emitting: false
            }).setDepth(11));
        }
        this.fxIndex = 0;

        let shipScale = 0.10;
        let shipTint = 0xffffff;
        let shipTex = 'ship_pizza_flitzer_portrait';
        let shipAnim = null;

        if (this.shipClass === 'interceptor') { shipScale = 0.11; shipTex = 'ship_neon_flamingo'; shipAnim = null; }
        if (this.shipClass === 'dreadnought') { shipScale = 0.20; shipTex = 'ship_arcade_kapsel'; shipAnim = null; }
        if (this.shipClass === 'phantom') { shipScale = 0.155; shipTex = 'ship_phantom'; shipAnim = 'anim_ship_phantom'; }
        if (this.shipClass === 'paladin') { shipScale = 0.125; shipTex = 'ship_paladin'; shipAnim = null; }
        if (this.shipClass === 'bomber') { shipScale = 0.125; shipTex = 'ship_bomber'; shipAnim = null; }

        this.playerBaseAngle = 0; // New generated ships point UP
        
        this.player = this.physics.add.sprite(cw / 2, ch * 0.75, shipTex)
            .setDepth(10)
            .setScale(shipScale)
            .setTint(shipTint)
            .setCollideWorldBounds(true);
            
        if (shipAnim) {
            this.player.play(shipAnim);
        }
        this.player.shipClass = this.shipClass;
            
        if (shipAnim) this.player.play(shipAnim);

        // Make the hitbox perfectly match the visual boundaries of the ship
        const isPizza = !this.shipClass || this.shipClass === 'standard';
        const isFlamingo = this.shipClass === 'interceptor';
        const isArcade = this.shipClass === 'dreadnought';
        if (isPizza) {
            this.player.body.setSize(this.player.width * 0.45, this.player.height * 0.55);
            this.player.body.setOffset(this.player.width * 0.275, this.player.height * 0.25);
        } else if (isFlamingo) {
            // Flamingo has an elongated body - tighter hitbox
            this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.6);
            this.player.body.setOffset(this.player.width * 0.3, this.player.height * 0.2);
        } else if (isArcade) {
            // Arcade Kapsel is chunky, broad and blocky
            this.player.body.setSize(this.player.width * 0.65, this.player.height * 0.65);
            this.player.body.setOffset(this.player.width * 0.175, this.player.height * 0.175);
        } else {
            this.player.body.setSize(this.player.width * 0.75, this.player.height * 0.75);
            this.player.body.setOffset(this.player.width * 0.125, this.player.height * 0.125);
        }

        // Engine exhaust
        this.pizzaEngines = null;
        this.flamingoEngines = null;
        this.arcadeEngines = null;
        this.phantomEngines = null;
        
        if (isPizza) {
            this.pizzaEngines = {};
            
            // Main hull engines - Roaring flames
            [-18, 18].forEach(ex => {
                this.add.particles(0, 0, 'p_glow', {
                    follow: this.player,
                    followOffset: { x: ex, y: 52 },
                    speedY: { min: 180, max: 280 }, speedX: { min: -12, max: 12 },
                    scale: { start: 0.8, end: 0.1 }, alpha: { start: 1, end: 0 },
                    tint: [0xffe600, 0xff7700, 0xff0000], blendMode: 'ADD', 
                    lifespan: { min: 200, max: 300 }, frequency: 15,
                }).setDepth(9);
            });
            
            // Lateral maneuvering thrusters on the cannons - Sharp bursts
            this.pizzaEngines.leftCannon = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -36, y: 35 },
                speedY: { min: 120, max: 200 }, speedX: { min: -8, max: 8 },
                scale: { start: 0.5, end: 0.1 }, alpha: { start: 1, end: 0 },
                tint: [0xffe600, 0xff3300], blendMode: 'ADD', 
                lifespan: { min: 150, max: 200 }, frequency: 20,
            }).setDepth(9);
            this.pizzaEngines.leftCannon.emitting = false;

            this.pizzaEngines.rightCannon = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 36, y: 35 },
                speedY: { min: 120, max: 200 }, speedX: { min: -8, max: 8 },
                scale: { start: 0.5, end: 0.1 }, alpha: { start: 1, end: 0 },
                tint: [0xffe600, 0xff3300], blendMode: 'ADD', 
                lifespan: { min: 150, max: 200 }, frequency: 20,
            }).setDepth(9);
            this.pizzaEngines.rightCannon.emitting = false;
        } else if (isFlamingo) {
            // ═══ NEON-FLAMINGO: Void-Antrieb ═══
            this.flamingoEngines = {};

            // Leg engines - Main thrust (always on), dark void core with neon magenta/cyan edges
            this.flamingoEngines.leftLeg = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -12, y: 48 },
                speedY: { min: 200, max: 320 }, speedX: { min: -8, max: 8 },
                scale: { start: 0.6, end: 0.05 }, alpha: { start: 1, end: 0 },
                tint: [0xff00ff, 0xff44aa, 0x00ffff], blendMode: 'ADD',
                lifespan: { min: 200, max: 300 }, frequency: 12,
            }).setDepth(9);
            this.flamingoEngines.rightLeg = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 12, y: 48 },
                speedY: { min: 200, max: 320 }, speedX: { min: -8, max: 8 },
                scale: { start: 0.6, end: 0.05 }, alpha: { start: 1, end: 0 },
                tint: [0xff00ff, 0xff44aa, 0x00ffff], blendMode: 'ADD',
                lifespan: { min: 200, max: 300 }, frequency: 12,
            }).setDepth(9);

            // Wing thrusters - Maneuvering (toggle with movement direction)
            this.flamingoEngines.leftWing = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -38, y: 12 },
                speedY: { min: 100, max: 180 }, speedX: { min: -5, max: 5 },
                scale: { start: 0.4, end: 0.05 }, alpha: { start: 0.9, end: 0 },
                tint: [0xff44aa, 0x00ffff], blendMode: 'ADD',
                lifespan: { min: 120, max: 180 }, frequency: 18,
            }).setDepth(9);
            this.flamingoEngines.leftWing.emitting = false;

            this.flamingoEngines.rightWing = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 38, y: 12 },
                speedY: { min: 100, max: 180 }, speedX: { min: -5, max: 5 },
                scale: { start: 0.4, end: 0.05 }, alpha: { start: 0.9, end: 0 },
                tint: [0xff44aa, 0x00ffff], blendMode: 'ADD',
                lifespan: { min: 120, max: 180 }, frequency: 18,
            }).setDepth(9);
            this.flamingoEngines.rightWing.emitting = false;
        } else if (isArcade) {
            // ═══ ARCADE-KAPSEL: Plasma-Reaktor & Neon-Aura ═══
            // Four Plasma Reactors (Green/Teal) clustered at the bottom center
            this.arcadeEngines = {};
            
            const engineConfig = {
                speedY: { min: 200, max: 350 }, speedX: { min: -5, max: 5 },
                scale: { start: 0.8, end: 0.2 }, alpha: { start: 1, end: 0 },
                tint: [0x00ff00, 0x00ffcc, 0x00aa00], blendMode: 'ADD',
                lifespan: { min: 300, max: 400 }, frequency: 15,
            };
            
            this.arcadeEngines.outerLeft = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -30, y: 95 }, ...engineConfig
            }).setDepth(9);
            
            this.arcadeEngines.innerLeft = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -10, y: 95 }, ...engineConfig
            }).setDepth(9);
            
            this.arcadeEngines.innerRight = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 10, y: 95 }, ...engineConfig
            }).setDepth(9);
            
            this.arcadeEngines.outerRight = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 30, y: 95 }, ...engineConfig
            }).setDepth(9);

            // Pulsating Neon Aura around the ship
            this.arcadeEngines.aura = this.add.particles(0, 0, 'p_glow', {
                follow: this.player,
                speedY: { min: 20, max: 50 }, speedX: { min: -20, max: 20 },
                scale: { start: 1.5, end: 0.2 }, alpha: { start: 0.3, end: 0 },
                tint: 0xffffff, blendMode: 'ADD',
                lifespan: { min: 500, max: 800 }, frequency: 30,
            }).setDepth(9);

            // Neon Accents (Rainbow nodes on the ship body)
            this.arcadeEngines.neon1 = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: -35, y: -30 },
                speedY: 0, speedX: 0, scale: { start: 0.4, end: 0.4 }, alpha: 0.8,
                tint: 0xffffff, blendMode: 'ADD', lifespan: 50, frequency: 40
            }).setDepth(11);
            this.arcadeEngines.neon2 = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 35, y: -30 },
                speedY: 0, speedX: 0, scale: { start: 0.4, end: 0.4 }, alpha: 0.8,
                tint: 0xffffff, blendMode: 'ADD', lifespan: 50, frequency: 40
            }).setDepth(11);
            this.arcadeEngines.neon3 = this.add.particles(0, 0, 'p_glow', {
                follow: this.player, followOffset: { x: 0, y: -10 },
                speedY: 0, speedX: 0, scale: { start: 0.5, end: 0.5 }, alpha: 0.8,
                tint: 0xffffff, blendMode: 'ADD', lifespan: 50, frequency: 40
            }).setDepth(11);
                } else if (this.shipClass === 'phantom') {
            this.phantomEngines = {};
            const ec = {
                speedY: { min: 150, max: 280 }, speedX: { min: -5, max: 5 },
                scale: { start: 0.5, end: 0.1 }, alpha: { start: 1, end: 0 },
                tint: [0xff00ff, 0x00ffff, 0xff00cc], blendMode: 'ADD',
                lifespan: { min: 150, max: 250 }, frequency: 18,
            };
            this.phantomEngines.ol = this.add.particles(0, 0, 'p_glow', { follow: this.player, followOffset: { x: -65, y: 35 }, ...ec }).setDepth(9);
            this.phantomEngines.il = this.add.particles(0, 0, 'p_glow', { follow: this.player, followOffset: { x: -25, y: 45 }, ...ec }).setDepth(9);
            this.phantomEngines.ir = this.add.particles(0, 0, 'p_glow', { follow: this.player, followOffset: { x: 25, y: 45 }, ...ec }).setDepth(9);
            this.phantomEngines.or = this.add.particles(0, 0, 'p_glow', { follow: this.player, followOffset: { x: 65, y: 35 }, ...ec }).setDepth(9);
        } else if (this.shipClass === 'paladin') {
            // ── OKTOHORNCAT: 8 Tentacle Glow Emitters (star pattern) ──
            this.paladinTentacles = [];
            const tentacleOffsets = [
                { x: 0, y: -40 },   // top (horn direction)
                { x: 30, y: -30 },  // top-right
                { x: 40, y: 0 },    // right
                { x: 30, y: 30 },   // bottom-right
                { x: 0, y: 40 },    // bottom
                { x: -30, y: 30 },  // bottom-left
                { x: -40, y: 0 },   // left
                { x: -30, y: -30 }, // top-left
            ];
            const tentColors = [0xff0055, 0xff8800, 0xffff00, 0x00ff66, 0x00ccff, 0x8800ff, 0xff00cc, 0x00ffaa];
            tentacleOffsets.forEach((off, i) => {
                const tc = {
                    speedX: { min: off.x * 2, max: off.x * 4 },
                    speedY: { min: off.y * 2, max: off.y * 4 },
                    scale: { start: 0.4, end: 0.05 },
                    alpha: { start: 0.8, end: 0 },
                    tint: tentColors[i],
                    blendMode: 'ADD',
                    lifespan: { min: 200, max: 400 },
                    frequency: 60,
                };
                const p = this.add.particles(0, 0, 'p_glow', { follow: this.player, followOffset: off, ...tc }).setDepth(9);
                this.paladinTentacles.push(p);
            });

            // ── OKTOHORNCAT: Rainbow Horn Glow (overlay circle at horn position) ──
            this.paladinHornGlow = this.add.circle(0, 0, 8, 0xff0000, 0.6).setDepth(11).setBlendMode('ADD');
            this.paladinHornHue = 0;

            // ── OKTOHORNCAT: Breathing Scale Animation ──
            this.tweens.add({
                targets: this.player,
                scaleX: shipScale * 1.04,
                scaleY: shipScale * 0.96,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
} else {
            this.engineLeft = this.add.particles(0, 0, 'p_glow', {
                follow: this.player,
                followOffset: { x: -9, y: 24 },
                speedY: { min: 80, max: 180 }, speedX: { min: -18, max: 18 },
                scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 },
                tint: [0x00ffff, 0x8800ff, 0xffffff], blendMode: 'ADD', lifespan: 280, frequency: 25,
            }).setDepth(9);
            this.engineRight = this.add.particles(0, 0, 'p_glow', {
                follow: this.player,
                followOffset: { x: 9, y: 24 },
                speedY: { min: 80, max: 180 }, speedX: { min: -18, max: 18 },
                scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 },
                tint: [0x00ffff, 0x8800ff, 0xffffff], blendMode: 'ADD', lifespan: 280, frequency: 25,
            }).setDepth(9);
            // Extra central engine glow
            this.add.particles(0, 0, 'p_glow', {
                follow: this.player,
                followOffset: { x: 0, y: 26 },
                speedY: { min: 100, max: 250 }, speedX: { min: -8, max: 8 },
                scale: { start: 0.7, end: 0 }, alpha: { start: 0.6, end: 0 },
                tint: [0xffffff, 0x6600ff], blendMode: 'ADD', lifespan: 200, frequency: 20,
            }).setDepth(8);
        }

        // Collisions
        // Core collision setup: Note that overlap is used instead of collide to prevent physics bounce
        this.physics.add.overlap(this.bullets,  this.enemies,  (b, e) => this.onBulletHitEnemy(b, e));
        this.physics.add.overlap(this.player,   this.enemies,  (p, e) => this.onPlayerTouchEnemy(p, e));
        this.physics.add.overlap(this.player,   this.eBullets, (p, b) => this.onEnemyBulletHit(p, b));
        this.physics.add.overlap(this.player,   this.scraps,   (p, s) => this.onScrapCollect(p, s));
        this.physics.add.overlap(this.player,   this.cubesGroup, (p, c) => this.onCollectCube(p, c));
        this.physics.add.overlap(this.player,   this.weaponUpgradesGroup, (p, u) => this.onCollectWeaponUpgrade(p, u));
        this.physics.add.overlap(this.orbitalsGroup, this.enemies, (b, e) => this.onOrbitalHitEnemy(b, e));
        this.physics.add.overlap(this.orbitalsGroup, this.eBullets, (o, b) => this.onOrbitalHitEnemyBullet(o, b));
        
        // Hazard System collisions
        if (this.hazardSys && this.hazardSys.asteroids) {
            this.physics.add.collider(this.hazardSys.asteroids, this.hazardSys.asteroids, (a1, a2) => {
                if (!a1.active || !a2.active) return;
                if (a1.isOre || a2.isOre) {
                    this.hazardSys.explodeAsteroid(a1);
                    this.hazardSys.explodeAsteroid(a2);
                } else {
                    const now = this.time.now;
                    if (now - (a1.spawnTime || 0) > 300 && now - (a2.spawnTime || 0) > 300) {
                        this.hazardSys.splitAsteroid(a1);
                        this.hazardSys.splitAsteroid(a2);
                    }
                }
            });
            
            const handleAsteroidHit = (a, damage) => {
                if (!a.active) return;
                a.hp -= damage;
                this.showDmgNum(a.x, a.y, damage, '#cccccc');
                if (a.hp <= 0) {
                    if (a.isOre) this.hazardSys.explodeAsteroid(a);
                    else this.hazardSys.splitAsteroid(a);
                }
            };

            this.physics.add.overlap(this.bullets, this.hazardSys.asteroids, (b, a) => {
                if (!b.active || !a.active) return;
                if (!b.pierce) {
                    this.bullets.killAndHide(b);
                    b.body.enable = false;
                }
                handleAsteroidHit(a, this.pd.damage);
            });

            this.physics.add.overlap(this.eBullets, this.hazardSys.asteroids, (b, a) => {
                if (!b.active || !a.active) return;
                this.eBullets.killAndHide(b);
                b.body.enable = false;
                handleAsteroidHit(a, 20);
            });

            this.physics.add.overlap(this.player, this.hazardSys.asteroids, (p, a) => {
                if (!p.active || !a.active) return;
                if (a.isOre) {
                    this.hazardSys.explodeAsteroid(a);
                } else {
                    this.damagePlayer(50);
                    this.hazardSys.splitAsteroid(a);
                }
            });

            this.physics.add.overlap(this.enemies, this.hazardSys.asteroids, (e, a) => {
                if (!e.active || !a.active || e.isDying || e.isHitZone) return;
                if (a.isOre) {
                    this.hazardSys.explodeAsteroid(a);
                } else {
                    e.hp -= 200;
                    this.showDmgNum(e.x, e.y, 200, '#ff0000');
                    if (e.hp <= 0) this.killEnemy(e);
                    this.hazardSys.splitAsteroid(a);
                }
            });
        }

        this.createHUD();

        this.shootTimer = this.time.addEvent({
            delay: this.pd.fireDelay, callback: this.autoShoot, callbackScope: this, loop: true
        });

        this.applyNyxBuff = (b) => {
            this.pd.nyxLevels = this.pd.nyxLevels || {};
            this.pd.nyxLevels[b] = (this.pd.nyxLevels[b] || 0) + 1;
            
            // ── Evolutionen ──
            if (b === 'evo_supernova')   this.pd.hasSupernova = true;
            if (b === 'evo_laser_whip')  this.pd.hasLaserWhip = true;
            if (b === 'evo_void_vortex') this.pd.hasVoidVortex = true;
            if (b === 'evo_frost_aegis') this.pd.hasFrostAegis = true;

            // ── Offensiv ──
            if (b === 'vampire_protocol')  this.pd.vampireProtocol = true;
            if (b === 'overclock') {
                this.pd.overclockActive = true;
                if (this.shootTimer) this.shootTimer.delay = this.pd.fireDelay / 3;
            }
            if (b === 'berserker') {
                this.pd.damage *= 1.5;
                this.pd.maxHp = Math.max(1, Math.floor(this.pd.maxHp * 0.75)); // -25% max HP
                this.pd.hp = Math.min(this.pd.hp, this.pd.maxHp);
                this.updateHUD();
            }
            if (b === 'explosive_rounds')  this.pd.explosiveRounds = true;
            if (b === 'homing_rounds')     this.pd.homingRounds = true;
            if (b === 'double_fire')       { this.pd.shots += 1; }
            if (b === 'crit_boost')        { this.pd.critBoost = (this.pd.critBoost || 0) + 0.25; }
            if (b === 'poison_rounds')     this.pd.poisonRounds = true;
            if (b === 'ricochet')          this.pd.ricochetRounds = true;
            if (b === 'overcharge')        { this.pd.overchargeActive = true; this.showBanner('ÜBERLADUNG AKTIV FÜR DIESE WELLE!', '#ffcc00'); }
            if (b === 'bullet_speed')      { this.pd.bulletSpeedMod = (this.pd.bulletSpeedMod || 1) * 1.4; } // +40% speed per level
            
            if (b === 'emp_blast' || b === 'gravity_well' || b === 'kill_weakest') {
                this.pd.activeItem = b;
                this.showBanner('AKTIVES ITEM (R): ' + b, '#00ffcc');
                this.updateHUD();
            }

            if (b === 'damage_aura')       {
                this.pd.damageAura = true;
                if (!this.damageAuraGraphics) {
                    this.damageAuraGraphics = this.add.graphics();
                    this.damageAuraGraphics.setDepth(4);
                }
            }
            if (b === 'kinetic_accelerator') { this.pd.kineticAccelerator = true; } // New upgrade replacing sniper_mode
            if (b === 'clone_shot')        this.pd.cloneShot = true;
            if (b === 'time_slow') {
                this.showBanner('ZEITVERZERRUNG AKTIV!', '#00ffff');
                this.physics.world.timeScale = 0.5;
                this.time.delayedCall(8000, () => { this.physics.world.timeScale = 1.0; });
            }

            // ── Defensiv ──
            if (b === 'shield_recharge')   { this.pd.shield = Math.max(this.pd.shield, (this.pd.upgLevels['shield'] || 0) + parseInt(localStorage.getItem('neon_upg_start_shields')||'0') + 1); this.updateHUD(); }
            if (b === 'full_heal')         { this.pd.hp = Math.min(this.pd.maxHp, this.pd.hp + this.pd.maxHp * 0.6); this.updateHUD(); }
            if (b === 'temp_shield')       { this.pd.shield += 2; this.updateHUD(); }
            if (b === 'invincible_dash')   this.pd.dashInvincible = true;
            if (b === 'regen_boost')       { this.pd.regen += 8; }
            if (b === 'mirror_shield')     {
                this.pd.mirrorShield = true;
                if (!this.mirrorShieldGraphics) {
                    this.mirrorShieldGraphics = this.add.graphics();
                    this.mirrorShieldGraphics.setDepth(5);
                }
            }
            if (b === 'hp_to_shield')      { const cost = Math.floor(this.pd.hp * 0.25); this.pd.hp = Math.max(1, this.pd.hp - cost); this.pd.shield += 3; this.updateHUD(); }
            if (b === 'guardian_angel')    this.pd.guardianAngel = true;
            if (b === 'speed_boost')       { this.pd.speed *= 1.4; this.pd.baseSpeed *= 1.4; }

            // ── Utility ──
            if (b === 'orbital_strike') {
                this.pd.orbitalStrikeLevel = (this.pd.orbitalStrikeLevel || 0) + 1;
                // Handled in update() logic to spawn drone
            }
            if (b === 'scrap_magnet')      { this.pd.magnetRange += 200; }
            if (b === 'xp_boost')          { this.addXP(80); }
            if (b === 'nova_refill')       { this.pd.nova += 2; this.updateHUD(); }
            if (b === 'wave_skip')         { this.pd.skipNextWave = true; this.showBanner('NÄCHSTE WELLE ÜBERSPRUNGEN!', '#ff4444'); }
            if (b === 'score_multiplier')  { this.pd.scoreMultiplier = 2; this.showBanner('2× SCORE AKTIV!', '#ffcc44'); this.time.delayedCall(30000, () => { this.pd.scoreMultiplier = 1; }); }
            if (b === 'xp_vacuum')         { this.crystals.getChildren().forEach(c => { if (c.active) { this.addXP(c.xpVal); c.destroy(); } }); this.showBanner('XP AUFGESAUGT!', '#88ffcc'); }
            if (b === 'cube_rain')         { this.pd.cubes = (this.pd.cubes || 0) + 25; this.updateHUD(); }

            // ── Chaos & Risiko ──
            if (b === 'chaos_mode') {
                const isBuff = Math.random() < 0.6;
                if (isBuff) {
                    const pick = ['double_fire','crit_boost','full_heal','regen_boost','nova_refill','bullet_speed','xp_boost'][Math.floor(Math.random()*7)];
                    this.time.delayedCall(100, () => { if (!this.isGameOver) this.applyNyxBuff(pick); });
                    this.showBanner('CHAOS: BUFF!', '#ff44ff');
                } else {
                    this.pd.speed *= 0.85;
                    this.showBanner('CHAOS: DEBUFF! Langsamkeit.', '#884488');
                }
            }
            if (b === 'glass_cannon')      { this.pd.damage *= 3; this.pd.hp = Math.max(1, Math.floor(this.pd.hp * 0.2)); this.pd.maxHp = Math.max(10, Math.floor(this.pd.maxHp * 0.2)); this.showBanner('GLASKANONE! DMG ×3 | HP ×0.2', '#ffaaff'); this.updateHUD(); }
        };

        this.events.on('resume', (scene, data) => {
            if (data) {
                if (data.cubes !== undefined) this.pd.cubes = data.cubes;
                if (data.buffs) {
                    data.buffs.forEach(b => {
                        this.applyNyxBuff(b);
                    });
                }
            }
            const htmlHud = document.getElementById('html-hud');
            if (htmlHud && !this.isGameOver) htmlHud.style.display = 'block';
            this.keys.W.reset(); this.keys.A.reset(); this.keys.S.reset(); this.keys.D.reset();
        });

        this.regenTimer = this.time.addEvent({
            delay: 1000, callback: () => { if (this.pd.regen > 0) this.healPlayer(this.pd.regen); }, loop: true
        });

        this.time.delayedCall(1800, () => this.startWave(1));
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Patch camera shake
        const origShake = this.cameras.main.shake.bind(this.cameras.main);
        this.cameras.main.shake = (...args) => {
            if (this.shakeEnabled) origShake(...args);
        };

        // Add Bloom FX for intense Neon Cyberpunk feel (Phaser 3.60+)
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addBloom(0xffffff, 1.8, 1.5, 1.1, 1.5);
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.65, 0.3);
        }
    }

    // ─────────────────────────────────────────────────────
    // TEXTURES
    // ─────────────────────────────────────────────────────
    /**
     * @description Procedurally generates small textures (particles, bullets, drops) to avoid external image dependencies.
     */
    generateTextures() {
        // Spritesheets are loaded in BootScene — only generate small procedural assets here

        // ── Glow particle ──
        { const g = this.make.graphics({ add: false }); g.fillStyle(0xffffff); g.fillCircle(6,6,6); g.generateTexture('p_glow',12,12); g.destroy(); }
        { const g = this.make.graphics({ add: false }); g.fillStyle(0xffffff); g.fillRect(0,0,5,5); g.generateTexture('p_debris',5,5); g.destroy(); }

        // ── Player bullet (cyan neon bolt with huge glow) ──
        {
            const g = this.make.graphics({ add: false });
            
            // PULSE
            g.fillStyle(0x00ffff, 0.15); g.fillEllipse(15, 25, 30, 48);
            g.fillStyle(0x00ffff, 0.45); g.fillEllipse(15, 25, 14, 28);
            g.fillStyle(0x00ffff, 1);    g.fillRect(13, 10, 4, 30);
            g.fillStyle(0xffffff, 1);    g.fillRect(14, 10, 2, 12);
            g.generateTexture('bullet_pulse', 30, 50);
            g.clear();

            // SCATTER
            g.fillStyle(0xffaa00, 0.2); g.fillCircle(12, 12, 12);
            g.fillStyle(0xff8800, 0.6); g.fillCircle(12, 12, 8);
            g.fillStyle(0xffff00, 1);   g.fillCircle(12, 12, 4);
            g.fillStyle(0xffffff, 1);   g.fillCircle(12, 12, 2);
            g.generateTexture('bullet_scatter', 24, 24);
            g.clear();

            // RAILGUN
            g.fillStyle(0xaa00ff, 0.2); g.fillEllipse(8, 40, 16, 80);
            g.fillStyle(0xff00ff, 0.6); g.fillRect(5, 5, 6, 70);
            g.fillStyle(0xffffff, 1);   g.fillRect(7, 10, 2, 50);
            g.generateTexture('bullet_railgun', 16, 80);
            
            g.destroy();
        }

        // ── Enemy bullet (orange plasma) ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0xff6600, 0.3); g.fillCircle(8, 8, 8);
            g.fillStyle(0xff4400, 1); g.fillCircle(8, 8, 5);
            g.fillStyle(0xffff00, 0.8); g.fillCircle(6, 6, 2);
            g.generateTexture('ebullet_tex', 16, 16);
            g.destroy();
        }

        // ── XP Crystal (green diamond) ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0x00ff44, 0.35); g.fillCircle(10, 10, 10);
            g.fillStyle(0x00ff44, 1);
            g.beginPath(); g.moveTo(10,1); g.lineTo(18,10); g.lineTo(10,19); g.lineTo(2,10); g.closePath(); g.fillPath();
            g.fillStyle(0xffffff, 0.75);
            g.beginPath(); g.moveTo(10,3); g.lineTo(14,8); g.lineTo(10,7); g.closePath(); g.fillPath();
            g.generateTexture('xp_tex', 20, 20);
            g.destroy();
        }

        // ── Scrap (gold gear) ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0xffaa00, 0.3); g.fillCircle(8, 8, 8);
            g.fillStyle(0xffcc00, 1);
            g.fillRect(3, 3, 10, 10);
            g.fillStyle(0xffffff, 0.9);
            g.fillRect(5, 5, 6, 6);
            g.generateTexture('scrap_tex', 16, 16);
            g.destroy();
        }

        // ── Data Cube (neon yellow square) ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0xffff00, 0.3); g.fillRect(0, 0, 12, 12);
            g.fillStyle(0xffff00, 1); g.fillRect(2, 2, 8, 8);
            g.fillStyle(0xffffff, 0.9); g.fillRect(4, 4, 4, 4);
            g.generateTexture('cube_tex', 12, 12);
            g.destroy();
        }

        // ── Cat Merchant ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0x00ff00, 1);
            g.fillEllipse(20, 20, 30, 25); // head
            g.fillTriangle(5, 5, 15, 10, 10, 20); // left ear
            g.fillTriangle(35, 5, 25, 10, 30, 20); // right ear
            g.fillStyle(0xff00ff, 1); // neon glasses
            g.fillRect(10, 15, 20, 8);
            g.generateTexture('cat_merchant_tex', 40, 40);
            g.destroy();
        }

        // ── Orbital Blade ──
        {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0xff0055, 0.4); g.fillCircle(12, 12, 12);
            g.fillStyle(0xffffff, 0.9);
            g.beginPath();
            g.moveTo(12, 0); g.lineTo(15, 12); g.lineTo(24, 12); g.lineTo(15, 15);
            g.lineTo(12, 24); g.lineTo(9, 15); g.lineTo(0, 12); g.lineTo(9, 12);
            g.closePath(); g.fillPath();
            g.generateTexture('blade_tex', 24, 24);
            g.destroy();
        }
        
        // 💎 Weapon Upgrade Drop (neon magenta box with W)
        {
            const g = this.make.graphics({ add: false });
            g.lineStyle(2, 0xff00ff, 1);
            g.strokeRect(0, 0, 16, 16);
            g.fillStyle(0xff00ff, 0.4);
            g.fillRect(0, 0, 16, 16);
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(4, 4, 12, 4, 8, 12); // simple triangle pointing down as a symbol
            g.generateTexture('weapon_upgrade_tex', 16, 16);
            g.destroy();
        }
    }

    // ─────────────────────────────────────────────────────
    // HUD
    // ─────────────────────────────────────────────────────
    /**
     * @description Initializes all HUD elements (HP, Shield, XP, Boss bar, etc.) and sets them above the game layers.
     */
        createHUD() {
        // Show HTML HUD
        const htmlHud = document.getElementById('html-hud');
        if (htmlHud) htmlHud.style.display = 'block';
        
        // We still keep the Wave Banner and Combo Text in Phaser because they appear in the center of the world/screen
        const { cw, ch } = this;
        const D = 1000;
        this.hud = {};
        this.hud.waveBanner = this.add.text(cw/2, ch*0.4, '', {
            fontFamily:'Orbitron',fontSize:'56px',fontStyle:'bold',
            color:'#ffffff',stroke:'#ff00ff',strokeThickness:5
        }).setOrigin(0.5).setDepth(D+10).setAlpha(0);

        this.hud.bossBg   = this.add.rectangle(cw/2, 120, 520, 20, 0x220000).setDepth(D).setVisible(false);
        this.hud.bossBar  = this.add.rectangle(cw/2-260, 120, 520, 16, 0xff2200).setOrigin(0,0.5).setDepth(D).setVisible(false);
        this.hud.bossName = this.add.text(cw/2, 120, 'VOID OVERLORD', { fontFamily:'Orbitron',fontSize:'11px',color:'#fff',fontStyle:'bold' }).setOrigin(0.5).setDepth(D).setVisible(false);

        this.hud.comboText = this.add.text(cw/2, ch*0.28, '', {
            fontFamily:'Orbitron',fontSize:'30px',fontStyle:'bold',
            color:'#ffff00',stroke:'#ff8800',strokeThickness:4
        }).setOrigin(0.5).setDepth(D+5).setAlpha(0);
    }

    /**
     * @description Refreshes HUD text and bar sizes based on current player statistics.
     */
    initDOMCache() {
        const getEl = (id) => document.getElementById(id);
        this.domCache = {
            hpVal: { el: getEl('hud-hp-val'), val: '' },
            hpBar: { el: getEl('hud-hp-bar'), val: '' },
            shieldBar: { el: getEl('hud-shield-bar'), val: '' },
            wave: { el: getEl('hud-wave'), val: '' },
            score: { el: getEl('hud-score'), val: '' },
            scrap: { el: getEl('hud-scrap'), val: '' },
            cubes: { el: getEl('hud-cubes'), val: '' },
            nova: { el: getEl('hud-nova'), val: '' },
            lvl: { el: getEl('hud-lvl'), val: '' },
            xpBar: { el: getEl('hud-xp-bar'), val: '' },
            abText: { el: getEl('hud-ability'), val: '' },
            abCd: { el: getEl('hud-ability-cd'), val: '' },
            itemText: { el: getEl('hud-item'), val: '' },
            itemCd: { el: getEl('hud-item-cd'), val: '' }
        };
    }

    updateHUD() {
        const { pd, score, waveNum } = this;
        
        if (!this.domCache) return;

        const updateText = (key, text) => {
            const cache = this.domCache[key];
            if (cache && cache.el && cache.val !== text) {
                cache.el.textContent = text;
                cache.val = text;
            }
        };
        const updateWidth = (key, widthStr) => {
            const cache = this.domCache[key];
            if (cache && cache.el && cache.val !== widthStr) {
                cache.el.style.width = widthStr;
                cache.val = widthStr;
            }
        };
        const updateColor = (key, colorStr) => {
            const cache = this.domCache[key];
            if (cache && cache.el && cache.color !== colorStr) {
                cache.el.style.color = colorStr;
                cache.color = colorStr;
            }
        };

        updateText('hpVal', Math.ceil(pd.hp) + '/' + pd.maxHp);
        updateWidth('hpBar', Math.max(0, (pd.hp / pd.maxHp) * 100) + '%');
        updateWidth('shieldBar', Math.min(100, (pd.shield / 3) * 100) + '%');
        
        updateText('wave', 'WAVE ' + waveNum);
        updateText('score', 'SCORE: ' + score.toLocaleString());
        
        // Fix NaN display if scrap is NaN
        updateText('scrap', 'SCRAP: ' + (isNaN(pd.scrap) ? 0 : pd.scrap));
        updateText('cubes', 'CUBES: ' + (pd.cubes || 0));
        updateText('nova', pd.nova);
        updateText('lvl', 'LVL ' + pd.level);
        updateWidth('xpBar', Math.min(100, (pd.xp / pd.xpToNext) * 100) + '%');

        // Ability Cooldown
        if (this.abilitySys) {
            const time = this.time.now;
            const cd = this.abilitySys.cooldown;
            const last = this.abilitySys.lastUsedTime;
            const remaining = Math.max(0, (last + cd) - time);
            
            if (remaining > 0) {
                updateText('abText', (remaining / 1000).toFixed(1) + 's');
                updateColor('abText', '#ff4444');
                updateWidth('abCd', (remaining / cd) * 100 + '%');
            } else {
                updateText('abText', 'READY');
                updateColor('abText', '#fff');
                updateWidth('abCd', '0%');
            }
        }

        // Active Item (consumable)
        if (pd.activeItem) {
            updateText('itemText', pd.activeItem.toUpperCase());
            updateColor('itemText', '#00ffcc');
            updateWidth('itemCd', '100%');
        } else {
            updateText('itemText', 'NONE');
            updateColor('itemText', '#888');
            updateWidth('itemCd', '0%');
        }

        // Active Upgrades List
        const upgList = document.getElementById('hud-upgrades-list');
        if (upgList) {
            const keys = Object.keys(pd.upgLevels);
            if (keys.length === 0) {
                upgList.innerHTML = '<div style="color:#aaa; font-size:12px;">No active upgrades</div>';
            } else {
                let html = '';
                keys.forEach(k => {
                    const lvl = pd.upgLevels[k];
                    const name = k.split('_').map(w => w.toUpperCase()).join(' ');
                    html += '<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">' +
                            '<span style="color:#fff;">' + name + '</span>' +
                            '<span style="color:#00ff55; font-weight:bold;">LVL ' + lvl + '</span>' +
                            '</div>';
                });
                upgList.innerHTML = html;
            }
        }

        // Boss Bar (Phaser)
        if (this.bossRef && this.bossRef.active && this.bossRef.maxHp) {
            const bpct = Math.max(0, this.bossRef.hp / this.bossRef.maxHp);
            this.hud.bossBar.setSize(520 * bpct, 16);
        }
    }

    // ─────────────────────────────────────────────────────
    // PLAYER MOVEMENT
    // ─────────────────────────────────────────────────────
    /**
     * @description Processes player input (Keyboard, Gamepad, Mouse) and applies velocity and rotation to the ship.
     */
    handleMovement() {
        const { keys, player, pd } = this;
        
        if (pd.isDashing) return; // Lock controls during dash

        let vx = 0, vy = 0;

        // 1. Keyboard
        if (keys.A.isDown || keys.LEFT.isDown)  vx -= 1;
        if (keys.D.isDown || keys.RIGHT.isDown) vx += 1;
        if (keys.W.isDown || keys.UP.isDown)    vy -= 1;
        if (keys.S.isDown || keys.DOWN.isDown)  vy += 1;

        // 2. Gamepad (Phaser Native Cross-Browser Support for Xbox/PS)
        const pad = this.input.gamepad ? this.input.gamepad.pad1 : null;
        if (pad) {
            // Movement (Left Stick & D-Pad)
            let lx = 0, ly = 0;
            if (pad.leftStick) { lx = pad.leftStick.x; ly = pad.leftStick.y; }
            if (Math.abs(lx) > 0.2) vx = lx;
            if (Math.abs(ly) > 0.2) vy = ly;

            if (pad.left) vx -= 1;
            if (pad.right) vx += 1;
            if (pad.up) vy -= 1;
            if (pad.down) vy += 1;

            // Gamepad Nova Bomb (Trigger R2 or Button A / Cross)
            if (pad.A || pad.R2) {
                if (!pd.novaCooldown || this.time.now > pd.novaCooldown) {
                    if (this.triggerNova()) pd.novaCooldown = this.time.now + 1000;
                }
            }
        }

        // 3. Mouse/Touch movement (fallback)
        if (vx === 0 && vy === 0 && this.input.activePointer.isDown) {
            const dx = this.input.activePointer.x - player.x;
            const dy = this.input.activePointer.y - player.y;
            const d = Math.hypot(dx, dy);
            if (d > 15) { vx = dx / d; vy = dy / d; }
        }

        // Normalize vector if using keyboard/mouse
        const len = Math.hypot(vx, vy);
        if (len > 1) {
            vx /= len; vy /= len;
        }
        
        // Dash activation (SHIFT or Gamepad B/Circle/L1/R1)
        let dashPressed = Phaser.Input.Keyboard.JustDown(keys.SHIFT);
        if (pad && (pad.B || pad.L1 || pad.R1)) {
            dashPressed = true;
        }

        if (pd.unlockDash && dashPressed && this.time.now > (pd.dashCooldown || 0) && (vx !== 0 || vy !== 0)) {
            pd.isDashing = true;
            this.playerInvincible = true;
            player.setVelocity(vx * pd.speed * 3.5, vy * pd.speed * 3.5);
            
            // Visual after-image effect
            this.time.addEvent({
                delay: 40, repeat: 5,
                callback: () => {
                    if (!player || !player.active) return;
                    const ghost = this.add.sprite(player.x, player.y, player.texture.key).setScale(player.scale).setDepth(8).setTint(0x00ffff).setAlpha(0.6);
                    if (player.anims && player.anims.currentAnim) ghost.play(player.anims.currentAnim.key);
                    this.tweens.add({ targets: ghost, alpha: 0, scale: player.scale * 1.33, duration: 300, onComplete: () => ghost.destroy() });
                }
            });

            this.time.delayedCall(250, () => {
                pd.isDashing = false;
                if (!pd.dashInvincible) this.playerInvincible = false;
                pd.dashCooldown = this.time.now + 1200; // 1.2s cooldown
            });
            if (pd.dashInvincible) {
                this.time.delayedCall(1000, () => {
                    this.playerInvincible = false;
                });
            }
            return;
        }

        player.setVelocity(vx * pd.speed, vy * pd.speed);
        
        pd.isMoving = (vx !== 0 || vy !== 0);
        
        // Maneuvering thrusters logic
        if (this.pizzaEngines && this.pizzaEngines.leftCannon) {
            this.pizzaEngines.leftCannon.emitting = (vx > 0.1);
            this.pizzaEngines.rightCannon.emitting = (vx < -0.1);
        }
        if (this.flamingoEngines && this.flamingoEngines.leftWing) {
            // Wing thrusters fire opposite to movement direction
            this.flamingoEngines.leftWing.emitting = (vx > 0.1);
            this.flamingoEngines.rightWing.emitting = (vx < -0.1);
        }
        if (this.arcadeEngines && this.arcadeEngines.aura) {
            // Rainbow aura color cycling
            const hue = (this.time.now * 0.1) % 360;
            const colorObj = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1);
            const color = colorObj.color;
            this.arcadeEngines.aura.particleTint = color;
            this.player.clearTint(); // Ensure the ship itself is NOT tinted
            
            // Emit static neon dots on the ship that cycle through rainbow colors
            this.arcadeEngines.neon1.particleTint = color;
            this.arcadeEngines.neon2.particleTint = color;
            this.arcadeEngines.neon3.particleTint = color;
            
            // Thrust intensity based on movement (since it's slow)
            const speed = Math.abs(vy);
            const freq = speed > 0.1 ? 8 : 25;
            this.arcadeEngines.outerLeft.frequency = freq;
            this.arcadeEngines.innerLeft.frequency = freq;
            this.arcadeEngines.innerRight.frequency = freq;
            this.arcadeEngines.outerRight.frequency = freq;
        }
        
        // Smooth tilt without 360 degree spin wrapping bugs
        const targetAngle = this.playerBaseAngle + vx * 8;
        let diff = targetAngle - player.angle;
        diff = ((diff + 540) % 360) - 180; // Normalize between -180 and +180
        player.angle += diff * 0.15;
    }

    // ─────────────────────────────────────────────────────
    // AUTO SHOOT
    // ─────────────────────────────────────────────────────
    /**
     * @description Determines target angles and triggers weapon firing logic based on current weapon class and level.
     */
    autoShoot() {
        if (this.isGameOver || this.betweenWaves) return;
        
        // INTERCEPTOR Momentum Passive
        if (this.shipClass === 'interceptor') {
            if (this.pd.isMoving) {
                this.pd.moveTime = (this.pd.moveTime || 0) + this.game.loop.delta;
            } else {
                this.pd.moveTime = 0;
            }
            const speedup = Math.min(1.0, (this.pd.moveTime || 0) / 3000);
            this.shootTimer.delay = this.pd.fireDelay * (1 - (speedup * 0.5));
        }
        
        let targetAngle = null;
        let targetAngle2 = null; // for Phantom dual aim
        const dronesLvl = this.pd.upgLevels['drones'] || 0;
        
        // Twin-Stick Aiming (Cross-Browser Gamepad API)
        const pad = this.input.gamepad ? this.input.gamepad.pad1 : null;
        if (pad && pad.rightStick) {
            const rx = pad.rightStick.x;
            const ry = pad.rightStick.y;
            if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) {
                targetAngle = Math.atan2(ry, rx);
                if (this.pd.autoTargetCount > 1) {
                    targetAngle2 = targetAngle + 0.3; // simple spread when twin sticking
                }
            }
        }
        
        // Fallback to nearest enemy if no stick input
        if (targetAngle === null) {
            const limit = this.pd.autoTargetCount || 1;
            const searchLimit = dronesLvl > 0 ? Math.max(limit, 3) : limit;
            
            const targets = this.findNearestEnemies(searchLimit);
            if (targets.length === 0) return;
            
            targetAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targets[0].x, targets[0].y);
            if (targets.length > 1 && limit > 1) {
                targetAngle2 = Phaser.Math.Angle.Between(this.player.x, this.player.y, targets[1].x, targets[1].y);
            } else {
                targetAngle2 = targetAngle;
            }
            
            // Store targets temporarily for drone usage later
            this._lastTargets = targets;
        }

        const angle = targetAngle;
        
        // Apply Weapon Level Bonus
        const baseShots = this.pd.shots;
        let finalShots = baseShots;
        if (this.weaponClass === 'scatter' && this.pd.weaponLevel > 1) finalShots += (this.pd.weaponLevel - 1) * 2;
        else if (this.pd.weaponLevel > 1) finalShots += (this.pd.weaponLevel - 1);
        
        const spread = finalShots > 1 ? 0.16 : 0;

        const targetAngles = [angle];
        if (targetAngle2 !== angle && this.pd.autoTargetCount > 1) {
            targetAngles.push(targetAngle2);
        }

        let shotsForTarget = [finalShots];
        if (this.shipClass === 'phantom' && targetAngles.length > 1) {
            shotsForTarget[0] = Math.ceil(finalShots / 2);
            shotsForTarget[1] = finalShots - shotsForTarget[0];
        } else if (targetAngles.length > 1) {
            shotsForTarget[1] = finalShots;
        }

        targetAngles.forEach((ang, index) => {
            const shots = shotsForTarget[index];
            if (shots <= 0) return;

            const shipRot = this.player.rotation;
            // Ship visual 'right' vector
            const ox = Math.cos(shipRot);
            const oy = Math.sin(shipRot);
            // Ship visual 'forward' vector (Phaser angle 0 is right, so forward is -90 deg)
            const fx = Math.cos(shipRot - Math.PI / 2);
            const fy = Math.sin(shipRot - Math.PI / 2);
            const isPizza = (!this.shipClass || this.shipClass === 'standard');
            const isArcade = (this.shipClass === 'dreadnought');
            
            // Arcade Kapsel is very boxy, move bullets further forward
            const forwardOffset = isPizza ? 35 : (isArcade ? 45 : 0);
            
            if (shots === 1) {
                this.fireSide = (this.fireSide === 1) ? -1 : 1;
                const gunOffset = isPizza ? 36 : (isArcade ? 55 : 16);
                this.fireBullet(
                    this.player.x + (ox * gunOffset * this.fireSide) + (fx * forwardOffset), 
                    this.player.y + (oy * gunOffset * this.fireSide) + (fy * forwardOffset), 
                    ang
                );
            } else {
                for (let i = 0; i < shots; i++) {
                    const a = ang + (i - (shots - 1) / 2) * spread;
                    const gunOffset = isPizza ? 36 : (isArcade ? 55 : 16);
                    
                    let activeOffset = 0;
                    if (shots === 2) {
                        activeOffset = (i === 0) ? -gunOffset : gunOffset;
                    } else if (shots === 3) {
                        if (i === 0) activeOffset = -gunOffset;
                        else if (i === 1) activeOffset = 0;
                        else activeOffset = gunOffset;
                    } else {
                        // 4+ shots: just spread them across the wings
                        const side = (i % 2 === 0) ? -1 : 1;
                        activeOffset = gunOffset * side + (side * (i * 2));
                    }

                    this.fireBullet(
                        this.player.x + (ox * activeOffset) + (fx * forwardOffset), 
                        this.player.y + (oy * activeOffset) + (fy * forwardOffset), 
                        a
                    );
                }
            }
        });

        // Fire Special Weapons
        const lightningLvl = this.pd.upgLevels['chain_lightning'] || 0;
        if (lightningLvl > 0 && Phaser.Math.Between(1, 100) <= 25) {
            this.weaponSys.fireChainLightning(this.player, this.enemies, this.pd.damage, lightningLvl);
        }

        const blackHoleLvl = this.pd.upgLevels['black_hole'] || 0;
        if (blackHoleLvl > 0) {
            if (!this.lastBlackHole || this.time.now > this.lastBlackHole + 4000) {
                this.lastBlackHole = this.time.now;
                const bx = this.player.x + (Math.random()*100 - 50);
                const by = this.player.y - 150 + (Math.random()*50);
                this.weaponSys.fireBlackHole(bx, by, 3000, 180, this.pd.damage * 0.5, this.enemies, blackHoleLvl);
            }
        }

        if (this.pd.hasFrostAegis) {
            if (!this.lastAegis || this.time.now > this.lastAegis + 8000) {
                this.lastAegis = this.time.now;
                this.weaponSys.triggerFrostAegis(this.player, this.enemies, this.pd.damage);
            }
        }

        // ⚔️ NEW WEAPONS ⚔️
        const sonicLvl = this.pd.upgLevels['sonic_wave'] || 0;
        if (sonicLvl > 0) {
            if (!this.lastSonicWave || this.time.now > this.lastSonicWave + 3000) {
                this.lastSonicWave = this.time.now;
                this.weaponSys.fireSonicWave(this.player, this.enemies, this.pd.damage, sonicLvl);
            }
        }

        const minesLvl = this.pd.upgLevels['mines'] || 0;
        if (minesLvl > 0) {
            const mineInterval = Math.max(1000, (4000 - minesLvl * 500));
            if (!this.lastMineDrop || this.time.now > this.lastMineDrop + mineInterval) {
                this.lastMineDrop = this.time.now;
                this.weaponSys.dropMine(this.player.x, this.player.y + 30, this.pd.damage, this.enemies, minesLvl);
            }
        }

        if (this.pd.unlockDoomBeam) {
            if (!this.lastDoomBeam || this.time.now > this.lastDoomBeam + 8000) {
                this.lastDoomBeam = this.time.now;
                this.weaponSys.fireDoomBeam(this.player, this.enemies, this.pd.damage);
            }
        }

        const sawLvl = this.pd.upgLevels['sawblades'] || 0;
        if (sawLvl > 0) {
            if (!this.lastSawblades || this.time.now > this.lastSawblades + 6000) {
                this.lastSawblades = this.time.now;
                this.weaponSys.spawnSawblades(this.player, this.enemies, this.pd.damage, sawLvl);
            }
        }

        const focusLvl = this.pd.upgLevels['focus_laser'] || 0;
        if (focusLvl > 0) {
            if (!this.lastFocusLaser || this.time.now > this.lastFocusLaser + 5000) {
                this.lastFocusLaser = this.time.now;
                this.weaponSys.fireFocusLaser(this.player, this.enemies, this.pd.damage, focusLvl);
            }
        }

        const cannonLvl = this.pd.upgLevels['heavy_cannon'] || 0;
        if (cannonLvl > 0) {
            if (!this.lastHeavyCannon || this.time.now > this.lastHeavyCannon + 2500) {
                this.lastHeavyCannon = this.time.now;
                this.weaponSys.fireHeavyCannon(this.player, this.enemies, this.pd.damage, cannonLvl);
            }
        }

        const auraLvl = this.pd.upgLevels['damage_aura'] || 0;
        if (auraLvl > 0) {
            this.weaponSys.updateDamageAura(this.player, this.enemies, this.pd.damage, auraLvl);
        }

        if (dronesLvl > 0) {
            let droneAngle = angle;
            if (this._lastTargets) {
                let dt = this._lastTargets[0];
                if (this._lastTargets.length > 2) dt = this._lastTargets[2];
                else if (this._lastTargets.length > 1) dt = this._lastTargets[1];
                if (dt) droneAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, dt.x, dt.y);
            }
            
            for (let i = 0; i < dronesLvl; i++) {
                const offsetA = (Math.PI * 2 / dronesLvl) * i;
                this.fireBullet(
                    this.player.x + Math.cos(offsetA) * 40,
                    this.player.y + Math.sin(offsetA) * 40,
                    droneAngle + Phaser.Math.FloatBetween(-0.1, 0.1),
                    this.pd.unlockLaserDrones
                );
            }
        }

        if (this.pd.hasLaserWhip) {
            if (!this.lastLaserWhip || this.time.now > this.lastLaserWhip + 800) {
                this.lastLaserWhip = this.time.now;
                this.weaponSys.fireLaserWhip(this.player, this.enemies, this.pd.damage * 4);
            }
        }

        if (this.pd.hasVoidVortex) {
            if (!this.lastVortex || this.time.now > this.lastVortex + 6000) {
                this.lastVortex = this.time.now;
                const dist = 250;
                this.weaponSys.triggerVoidVortex(
                    this.player.x + Phaser.Math.Between(-dist, dist),
                    this.player.y + Phaser.Math.Between(-dist, dist),
                    this.pd.damage * 3, this.enemies
                );
            }
        }
    }

    /**
     * @description Spawns a player projectile from the object pool with given coordinates and trajectory.
     * @param {number} x - Origin X coordinate.
     * @param {number} y - Origin Y coordinate.
     * @param {number} angle - Firing angle in radians.
     */
    fireBullet(x, y, angle, isLaserDrone = false) {
        if (this.audioSys) this.audioSys.playShoot(this.weaponClass);

        let tex = 'bullet_pulse';
        if (this.weaponClass === 'scatter') tex = 'bullet_scatter';
        if (this.weaponClass === 'railgun') tex = 'bullet_railgun';
        if (isLaserDrone) tex = 'bullet_railgun';

        const b = this.bullets.get(x, y, tex);
        if (!b) return;
        if (typeof b.setTexture === 'function') { b.setTexture(tex); } else { b.destroy(); return; }
        if (isLaserDrone) b.setTint(0xff00ff); // Purple lasers

        b.setActive(true).setVisible(true);
        b.setScale(1.5); // Make bullets bigger so they are easier to hit with
        if (b.body) {
            b.body.enable = true;
            b.body.setSize(b.width, b.height);
        }
        b.setDepth(8).setRotation(angle + Math.PI / 2);
        b.pierce = isLaserDrone ? (this.pd.pierce || 0) + 2 : this.pd.pierce;
        b.hitEnemies = [];
        const critChance = (this.pd.crit ? 0.2 : 0) + (this.pd.critBoost || 0);
        b.isCrit = Math.random() < critChance;
        b.baseDamage = b.isCrit ? this.pd.damage * 3 : this.pd.damage;
        b.damage = b.baseDamage;
        b.startX = x;
        b.startY = y;
        b.body.reset(x, y);   // reset body position BEFORE setting velocity
        b.spawnTime = this.time.now;
        b.lifespan = this.pd.weaponLifespan;
        b.setVelocity(Math.cos(angle) * 560, Math.sin(angle) * 560);
    }

    /**
     * @description Locates the closest active enemy to the player.
     * @returns {Phaser.Physics.Arcade.Sprite|null} The nearest enemy sprite or null if none exist.
     */
    findNearestEnemy() {
        let best = null, bestDist = Infinity;
        this.enemies.getChildren().forEach(e => {
            if (!e.active || e.isHitZone || e.isDying) return;
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (d < bestDist) { bestDist = d; best = e; }
        });
        return best;
    }

    /**
     * @description Locates a specific number of nearest active enemies.
     * @param {number} count - Maximum number of enemies to return.
     * @returns {Array<Phaser.Physics.Arcade.Sprite>} Array of the nearest enemy sprites.
     */
    findNearestEnemies(count) {
        const alive = this.enemies.getChildren().filter(e => e.active && !e.isHitZone && !e.isDying);
        alive.sort((a, b) => {
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) - Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
        });
        return alive.slice(0, count);
    }

    /**
     * @description Spawns a player projectile from the object pool with given coordinates and trajectory.
     * @param {number} x - Origin X coordinate.
     * @param {number} y - Origin Y coordinate.
     * @param {number} angle - Firing angle in radians.
     */
    fireBullet(x, y, angle, isLaserDrone = false) {
        if (this.audioSys) this.audioSys.playShoot(this.weaponClass);

        let tex = 'bullet_pulse';
        if (this.weaponClass === 'scatter') tex = 'bullet_scatter';
        if (this.weaponClass === 'railgun') tex = 'bullet_railgun';
        if (isLaserDrone) tex = 'bullet_railgun';

        const b = this.bullets.get(x, y, tex);
        if (!b) return;
        if (typeof b.setTexture === 'function') { b.setTexture(tex); } else { b.destroy(); return; }
        if (isLaserDrone) b.setTint(0xff00ff); // Purple lasers

        b.setActive(true).setVisible(true);
        if (b.body) {
            b.body.enable = true;
            b.body.setSize(b.width, b.height);
        }
        b.setDepth(8).setRotation(angle + Math.PI / 2);
        b.pierce = isLaserDrone ? (this.pd.pierce || 0) + 2 : this.pd.pierce;
        b.hitEnemies = [];
        const critChance = (this.pd.crit ? 0.2 : 0) + (this.pd.critBoost || 0);
        b.isCrit = Math.random() < critChance;
        b.baseDamage = b.isCrit ? this.pd.damage * 3 : this.pd.damage;
        b.damage = b.baseDamage;
        b.startX = x;
        b.startY = y;
        b.body.reset(x, y);   // reset body position BEFORE setting velocity
        b.spawnTime = this.time.now;
        b.lifespan = this.pd.weaponLifespan;
        b.setVelocity(Math.cos(angle) * 560, Math.sin(angle) * 560);
    }

    /**
     * @description Locates the closest active enemy to the player.
     * @returns {Phaser.Physics.Arcade.Sprite|null} The nearest enemy sprite or null if none exist.
     */
    findNearestEnemy() {
        let best = null, bestDist = Infinity;
        this.enemies.getChildren().forEach(e => {
            if (!e.active || e.isHitZone || e.isDying) return;
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (d < bestDist) { bestDist = d; best = e; }
        });
        return best;
    }

    /**
     * @description Locates a specific number of nearest active enemies.
     * @param {number} count - Maximum number of enemies to return.
     * @returns {Array<Phaser.Physics.Arcade.Sprite>} Array of the nearest enemy sprites.
     */
    findNearestEnemies(count) {
        const alive = this.enemies.getChildren().filter(e => e.active && !e.isHitZone && !e.isDying);
        alive.sort((a, b) => {
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) - Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
        });
        return alive.slice(0, count);
    }

    // ─────────────────────────────────────────────────────
    // ENEMY SPAWNING & AI
    // ─────────────────────────────────────────────────────
    /**
     * @description Displays a stylized dialogue box for boss taunts or story events.
     * @param {string} title - Speaker name or title.
     * @param {string} text - The message to display.
     * @param {string} [color='#ff0000'] - Theme color for the dialog borders and title.
     * @param {number} [duration=4000] - How long the dialog remains on screen in milliseconds.
     */
    showDialog(title, text, color = '#ff0000', duration = 4000) {
        if (this.dialogBox) this.dialogBox.destroy();
        
        const cw = this.scale.width;
        const ch = this.scale.height;
        const container = this.add.container(cw/2, ch - 70).setDepth(2000);
        
        const bg = this.add.rectangle(0, 0, 600, 80, 0x111122, 0.9).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
        const titleTxt = this.add.text(-280, -30, title, { fontFamily: 'Orbitron', fontSize: '18px', color: color, fontStyle: 'bold' });
        const contentTxt = this.add.text(-280, -5, '', { fontFamily: 'Orbitron', fontSize: '14px', color: '#ffffff', wordWrap: { width: 560 } });
        
        container.add([bg, titleTxt, contentTxt]);
        this.dialogBox = container;
        
        let i = 0;
        this.time.addEvent({
            delay: 40,
            repeat: text.length - 1,
            callback: () => {
                if (!this.dialogBox) return;
                contentTxt.text += text[i];
                i++;
                if (i === text.length) {
                    this.time.delayedCall(duration, () => {
                        if (this.dialogBox === container) {
                            this.tweens.add({ targets: container, alpha: 0, duration: 500, onComplete: () => container.destroy() });
                        }
                    });
                }
            }
        });
        
        container.y += 150;
        this.tweens.add({ targets: container, y: ch - 70, duration: 400, ease: 'Back.easeOut' });
    }

    /**
     * @description Spawns an enemy of the specified type at a random edge or fixed boss location.
     * @param {string} type - Identifier for the enemy type (e.g., 'basic', 'boss').
     * @returns {Phaser.Physics.Arcade.Sprite} The spawned enemy instance.
     */
    spawnEnemy(type) {
        const { cw, ch } = this;
        const pad = 50;
        let x, y;
        
        // Bosses always spawn at the top center to drift downwards slowly
        if (type === 'boss' || type === 'mothership' || type === 'hivemind' || type === 'destroyer' || type.startsWith('boss_')) {
            x = cw / 2;
            y = -150;
        } else {
            switch (Phaser.Math.Between(0, 3)) {
                case 0: x = Math.random()*cw; y = -pad; break;
                case 1: x = cw+pad; y = Math.random()*ch; break;
                case 2: x = Math.random()*cw; y = ch+pad; break;
                default: x = -pad; y = Math.random()*ch;
            }
        }

        // Map type → spritesheet key + animation key + display scale
        const SPRITE_MAP = {
            basic:   { sheet: 'enemy_basic_sheet',   anim: 'anim_basic',   scale: 0.22 },
            fast:    { sheet: 'enemy_fast_sheet',    anim: 'anim_fast',    scale: 0.19 },
            tank:    { sheet: 'enemy_tank_sheet',    anim: 'anim_tank',    scale: 0.32 },
            shooter: { sheet: 'enemy_shooter_sheet', anim: 'anim_shooter', scale: 0.25 },
            elite:   { sheet: 'enemy_elite_sheet',   anim: 'anim_elite',   scale: 0.28 },
            boss:    { sheet: 'boss_phase1',         anim: 'anim_boss_p1_idle', scale: 1.5 },
            swarmer: { sheet: 'enemy_swarmer_sheet', anim: 'anim_swarmer', scale: 0.12 },
            phantom: { sheet: 'enemy_phantom_sheet', anim: 'anim_phantom', scale: 0.22 },
            stealth: { sheet: 'enemy_stealth_sheet', anim: 'anim_stealth', scale: 0.22 },
            carrier: { sheet: 'enemy_carrier_sheet', anim: 'anim_carrier', scale: 0.45 },
            laser:   { sheet: 'enemy_laser_sheet',   anim: 'anim_laser',   scale: 0.25 },
            mothership: { sheet: 'enemy_mothership_sheet', anim: 'anim_mothership', scale: 0.75 },
            hivemind: { sheet: 'enemy_hivemind_sheet', anim: 'anim_hivemind', scale: 0.8 },
            hivemind_clone: { sheet: 'enemy_hivemind_sheet', anim: 'anim_hivemind', scale: 0.45 },
            destroyer: { sheet: 'enemy_destroyer_sheet', anim: 'anim_destroyer', scale: 0.85 },
            charger: { sheet: 'enemy_charger_sheet', anim: null, scale: 0.3 },
            protector: { sheet: 'enemy_protector_sheet', anim: null, scale: 0.4 },
            boss_cheese: { sheet: 'boss_cheese', anim: 'anim_boss_cheese_idle', scale: 1.5 },
            boss_irs: { sheet: 'boss_irs', anim: null, scale: 0.8 },
            boss_irs_p2: { sheet: 'boss_irs_p2', anim: null, scale: 0.9 },
            boss_vacuum: { sheet: 'boss_vacuum', anim: null, scale: 0.3 },
            boss_vacuum_p2: { sheet: 'boss_vacuum_p2', anim: null, scale: 1.2 }
        };
        const sm  = SPRITE_MAP[type] || SPRITE_MAP.basic;
        const def = ENEMY_DEFS[type] || ENEMY_DEFS.basic;

        const variation = Phaser.Math.FloatBetween(0.85, 1.15);
        const finalScale = sm.scale * variation;

        const e = this.physics.add.sprite(x, y, sm.sheet)
            .setDepth(5)
            .setScale(finalScale);
        if (sm.anim) e.play(sm.anim);
        
        e.spawnScale = finalScale;
        
        if (type === 'boss' || type === 'mothership' || type === 'hivemind' || type === 'destroyer' || type.startsWith('boss_')) {
            if (this.bossSys) {
                this.bossSys.initCustomBoss(e, type);
            }
        }

        const hpScale = 1 + (this.waveNum - 1) * 0.35 + Math.pow(this.waveNum / 10, 2);
        e.hp = Math.floor(def.hp * hpScale); 
        e.maxHp = e.hp;
        e.type = type; e.speed = def.speed; e.originalSpeed = def.speed;
        e.waveNum = this.waveNum;
        e.scoreVal = def.score; e.xpVal = def.xp;
        
        // Elite Mechanics (Wave 20+)
        if (this.waveNum >= 20 && Math.random() < 0.25 && !type.startsWith('boss') && type !== 'mothership' && type !== 'hivemind') {
            e.isElite = true;
            e.setScale(finalScale * 1.2);
            e.setTint(0xff5555); // Red tint for elites
            e.hp = Math.floor(e.hp * 2.5);
            e.maxHp = e.hp;
            e.scoreVal *= 3;
            e.xpVal *= 3;
        }

        // Wave 10+: Armor Plating
        if (this.waveNum >= 10 && Math.random() < 0.15 && !type.startsWith('boss') && type !== 'mothership' && type !== 'hivemind') {
            e.hasArmor = true;
            // Draw a cyan ring indicating armor
            const gfx = this.add.graphics();
            gfx.lineStyle(2, 0x00ffff, 0.8);
            gfx.strokeCircle(0, 0, (e.width * finalScale) / 2 + 8);
            e.armorGraphics = gfx;
        }
        
        e.lastShot = 0; e.isDying = false;
        e.tOffset = Math.random() * 100; // Fixed time offset for smooth sine waves

        // Circular physics body based on unscaled texture dimensions
        // The physics body automatically scales with the sprite, so do not multiply by sm.scale here!
        const isBoss = (type === 'boss' || type === 'mothership' || type === 'hivemind' || type === 'destroyer' || type.startsWith('boss_'));
        const hitBoxRatio = isBoss ? 0.2 : 0.32; // Bosses often have more padding, so use a tighter hitbox (40% diameter vs 64%)
        const rSize = e.width * hitBoxRatio;
        e.body.setCircle(rSize, e.width/2 - rSize, e.height/2 - rSize);
        this.enemies.add(e);

        // Breathing glow or phantom blink
        if (type === 'phantom') {
            this.tweens.add({
                targets: e, alpha: 0.1, duration: 800,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut', hold: 400
            });
        } else {
            this.tweens.add({
                targets: e, alpha: 0.78, duration: Phaser.Math.Between(600, 1100),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }

        if (type === 'boss' || type === 'mothership' || type === 'hivemind' || type === 'destroyer' || type.startsWith('boss_')) {
            this.bossRef = e;
            const bossScale = 1 + (this.waveNum * 0.8) + Math.pow(this.waveNum / 6, 2.5);
            e.hp = Math.floor(def.hp * bossScale) + (type === 'boss' ? 0 : (type === 'destroyer' ? 5000 : 3500));
            e.maxHp = e.hp;
            e.scoreVal = def.score;
            e.xpVal = def.xp;
            // Boss entry: scale up dramatically and slide down into the arena
            e.setScale(0.01);
            this.tweens.add({ targets: e, scale: e.spawnScale, y: 180, duration: 1500, ease: 'Cubic.easeOut' });
            this.hud.bossBg.setVisible(true);
            this.hud.bossBar.setVisible(true);
            this.hud.bossName.setVisible(true);
            this.hud.bossName.setText(type.toUpperCase());
            
            // Intro is now handled by initCustomBoss up above
            this.eventSys.triggerCompanionComment('boss_spawn');
        }
        return e;
    }

    /**
     * @description Main AI loop iterating over all active enemies to update their velocities, states, and firing patterns.
     */
    updateEnemies() {
        const { player } = this;
        this.enemies.getChildren().forEach(e => {
            if (!e.active || e.isHitZone) return;
            
            e.isShielded = false;
            if (!e.isFrozen) e.clearTint();

            if (e.isDying) {
                if (e.auraGraphics) {
                    e.auraGraphics.destroy();
                    e.auraGraphics = null;
                }
                if (e.hasArmor && e.armorGraphics) {
                    e.armorGraphics.destroy();
                    e.armorGraphics = null;
                }
                e.setVelocity(0, 0);
                return;
            }

            // Update Wave 10 Armor Graphics
            if (e.hasArmor && e.armorGraphics) {
                e.armorGraphics.setPosition(e.x, e.y);
            }

            // Wave 50+: Nano Regeneration
            if (this.waveNum >= 50 && e.hp < e.maxHp && e.type !== 'boss' && e.type !== 'mothership' && e.type !== 'hivemind') {
                e.hp += e.maxHp * 0.02 * (this.game.loop.delta / 1000); // 2% per second
                if (e.hp > e.maxHp) e.hp = e.maxHp;
            }

            const angle = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
            let moveAngle = angle;
            
            // Wave 40+: Warp Drive (Blink)
            if (this.waveNum >= 40 && Math.random() < 0.005 && e.type !== 'boss' && e.type !== 'mothership' && e.type !== 'hivemind') {
                const distSq = (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y);
                if (distSq > 160000) { // Only if far away (>400px)
                    // Warp effect
                    const p = this.add.particles(e.x, e.y, 'm_dust', {
                        speed: { min: 20, max: 80 },
                        scale: { start: 0.6, end: 0 },
                        tint: 0xaa00ff,
                        blendMode: 'ADD',
                        lifespan: 300,
                        quantity: 10
                    });
                    this.time.delayedCall(300, () => p.destroy());
                    
                    e.x += Math.cos(angle) * 150;
                    e.y += Math.sin(angle) * 150;
                }
            }
            
            // Asteroid Avoidance Steering
            if (this.hazardSys && this.hazardSys.asteroids) {
                let avoidX = 0, avoidY = 0, avoids = 0;
                this.hazardSys.asteroids.getChildren().forEach(a => {
                    if (a.active) {
                        const dx = e.x - a.x;
                        const dy = e.y - a.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq > 0 && distSq < 40000) { // 200 * 200 = 40000
                            const dist = Math.sqrt(distSq);
                            const repAngle = Phaser.Math.Angle.Between(a.x, a.y, e.x, e.y);
                            const strength = 1 - (dist / 200);
                            avoidX += Math.cos(repAngle) * strength;
                            avoidY += Math.sin(repAngle) * strength;
                            avoids++;
                        }
                    }
                });
                if (avoids > 0) {
                    moveAngle = Math.atan2(Math.sin(angle) + avoidY * 2.5, Math.cos(angle) + avoidX * 2.5);
                }
            }

            // Hivemind split logic
            if (e.type === 'hivemind' && e.hp < e.maxHp * 0.5 && !e.hasSplit) {
                e.hasSplit = true;
                this.showDialog('THE HIVEMIND', 'WIR SIND VIELE. WIR SIND UNENDLICH GENVERVT.', '#00ff00', 4000);
                for(let i=0; i<4; i++) {
                    const clone = this.spawnEnemy('hivemind_clone');
                    this.waveLeft++;
                    clone.setPosition(e.x + Phaser.Math.Between(-80,80), e.y + Phaser.Math.Between(-80,80));
                }
            }

            // Cryo effect expiry
            if (e.cryoUntil && this.time.now > e.cryoUntil) {
                e.clearTint();
                if (e.isFrozen) {
                    e.speed = e.originalSpeed;
                    e.isFrozen = false;
                }
            }

            if (e.type === 'stealth') {
                e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                const isStealth = (this.time.now % 4000) > 2000;
                if (isStealth) {
                    e.setAlpha(0.05); e.body.enable = false;
                } else {
                    e.setAlpha(0.8); e.body.enable = true;
                }
            } else if (e.type === 'carrier') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
                if (dist < 400) e.setVelocity(Math.cos(moveAngle)*-e.speed, Math.sin(moveAngle)*-e.speed);
                else if (dist > 700) e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                else e.setVelocity(0, 0);
                
                if (this.time.now - (e.lastShot||0) > 2500) {
                    e.lastShot = this.time.now;
                    this.spawnEnemy('swarmer').setPosition(e.x, e.y);
                    this.waveLeft++;
                }
            } else if (e.type === 'laser') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
                if (dist > 300 && !e.isCharging) {
                    e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                } else {
                    e.setVelocity(0, 0);
                    if (!e.isCharging && this.time.now - e.lastShot > 3000) {
                        e.isCharging = true;
                        e.setTint(0xffffff);
                        this.time.delayedCall(1000, () => {
                            if (!e.active) return;
                            e.isCharging = false;
                            e.clearTint();
                            e.lastShot = this.time.now;
                            const fireAngle = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
                            for(let i=0; i<3; i++) this.time.delayedCall(i*100, ()=>this.fireEnemyBullet(e.x, e.y, fireAngle, 230, 1.0, e.type));
                        });
                    }
                }
            } else if (e.type === 'destroyer') {
                e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                if (this.time.now - e.lastShot > 2500) {
                    e.lastShot = this.time.now;
                    for (let i = 0; i < 12; i++) {
                        const a = angle + (Math.random() - 0.5) * 1.5;
                        this.fireEnemyBullet(e.x, e.y, a, 230, 1.0, e.type);
                    }
                }
            } else if (e.type === 'hivemind' || e.type === 'hivemind_clone') {
                const t = this.time.now / 1000 + e.tOffset;
                e.setVelocity(
                    Math.cos(moveAngle)*e.speed + Math.sin(t*3)*(e.type === 'hivemind' ? 60 : 120),
                    Math.sin(moveAngle)*e.speed + Math.cos(t*2)*(e.type === 'hivemind' ? 30 : 60)
                );
                const delay = e.type === 'hivemind' ? 1500 : 1000;
                if (this.time.now - e.lastShot > delay) {
                    e.lastShot = this.time.now;
                    const shots = e.type === 'hivemind' ? 5 : 3;
                    for (let i = 0; i < shots; i++) {
                        const a = angle + (i - Math.floor(shots/2)) * 0.3;
                        this.fireEnemyBullet(e.x, e.y, a, 230, 1.0, e.type);
                    }
                }
            } else if (e.type === 'charger') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
                if (!e.state) e.state = { mode: 'chase', timer: 0, telegraph: null };
                
                if (e.state.mode === 'chase') {
                    e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                    if (dist < 400 && this.time.now - (e.lastCharge||0) > 3000) {
                        e.state.mode = 'aim';
                        e.state.timer = this.time.now + 800;
                        e.setVelocity(0, 0);
                        const g = this.add.graphics();
                        g.lineStyle(2, 0xffaa00, 0.6);
                        g.lineBetween(e.x, e.y, e.x + Math.cos(angle)*600, e.y + Math.sin(angle)*600);
                        e.state.telegraph = { g: g, angle: angle };
                    }
                } else if (e.state.mode === 'aim') {
                    if (this.time.now > e.state.timer) {
                        e.state.mode = 'dash';
                        e.state.timer = this.time.now + 400;
                        e.state.telegraph.g.destroy();
                        const a = e.state.telegraph.angle;
                        e.setVelocity(Math.cos(a)*800, Math.sin(a)*800);
                        e.lastCharge = this.time.now;
                    }
                } else if (e.state.mode === 'dash') {
                    if (this.time.now > e.state.timer) {
                        e.state.mode = 'chase';
                    }
                }
                if (e.isDying && e.state.telegraph) {
                    e.state.telegraph.g.destroy();
                    e.state.telegraph = null;
                }
            } else if (e.type === 'protector') {
                e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                if (!e.auraGraphics) {
                    e.auraGraphics = this.add.graphics();
                    e.auraGraphics.setDepth(3);
                }
                e.auraGraphics.clear();
                e.auraGraphics.lineStyle(2, 0x00aaff, 0.4);
                e.auraGraphics.strokeCircle(e.x, e.y, 150);
                e.auraGraphics.fillStyle(0x00aaff, 0.1);
                e.auraGraphics.fillCircle(e.x, e.y, 150);
                
                this.enemies.getChildren().forEach(other => {
                    if (other !== e && other.active && !other.isDying && !other.isHitZone) {
                        if (Phaser.Math.Distance.Between(e.x, e.y, other.x, other.y) < 150) {
                            other.isShielded = true;
                            if (!other.isFrozen) other.setTint(0x00aaff);
                        }
                    }
                });
                if (e.isDying && e.auraGraphics) {
                    e.auraGraphics.destroy();
                    e.auraGraphics = null;
                }
            } else if (e.type === 'shooter') {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
                if (dist > 450) {
                    e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                } else {
                    e.setVelocity(Math.cos(moveAngle)*e.speed*0.3, Math.sin(moveAngle)*e.speed*0.3);
                }

                if (dist < 800 && this.time.now - e.lastShot > 1800) {
                    e.lastShot = this.time.now;
                    if (e.isElite) {
                        this.fireEnemyBullet(e.x, e.y, angle, 230, 1.0, e.type);
                        this.fireEnemyBullet(e.x, e.y, angle - 0.25, 230, 1.0, e.type);
                        this.fireEnemyBullet(e.x, e.y, angle + 0.25, 230, 1.0, e.type);
                    } else {
                        this.fireEnemyBullet(e.x, e.y, angle, 230, 1.0, e.type);
                    }
                }
            } else if (e.type === 'boss' || e.type === 'mothership' || e.type === 'hivemind' || e.type === 'destroyer') {
                this.updateBoss(e, player, angle);
            } else if (e.type === 'hitzone') {
                // Hitzones are positioned by their parent, do nothing here.
                return;
            } else {
                e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);
                if (e.customUpdate) e.customUpdate();
            }

            let rotOffset = -Math.PI/2;
            if (e.type === 'mothership' || e.type === 'hivemind') {
                rotOffset += Math.PI; // Flip these bosses so their thrusters point backward
            }
            e.setRotation(angle + rotOffset);
        });
    }

    // ─────────────────────────────────────────────────────
    // BOSS AI (Danmaku / Bullet Hell)
    // ─────────────────────────────────────────────────────
    /**
     * @description Handles phase transitions and movement patterns specifically for Boss entities.
     * @param {Phaser.Physics.Arcade.Sprite} boss - The boss sprite instance.
     * @param {Phaser.Physics.Arcade.Sprite} player - The player sprite instance.
     * @param {number} angle - Angle towards the player.
     */
    updateBoss(boss, player, angle) {
        const now = this.time.now;
        const t = now / 1000 + boss.tOffset;
        
        // Initialize boss state if not present
        if (!boss.state) {
            boss.state = { phase: 1, attackPattern: 0, nextAttack: now + 2000, telegraph: null };
        }
        
        // Phase transition
        const hpPercent = boss.hp / boss.maxHp;
        if (hpPercent < 0.5 && boss.state.phase === 1) {
            boss.state.phase = 2;
            this.showBanner('BOSS ENRAGE!', '#ff0055');
            this.cameras.main.shake(200, 0.01);
            this.triggerHitStop(1.0);
            boss.state.nextAttack = now + 1000;
        }

        // Movement (Sine wave hover)
        boss.setVelocity(
            Math.cos(angle)*boss.speed * 0.5 + Math.sin(t*2)*80,
            Math.sin(angle)*boss.speed * 0.5 + Math.cos(t*1.5)*40
        );

        // Attacks
        if (now > boss.state.nextAttack) {
            this.executeBossAttack(boss, player, angle, t);
        }
    }

    /**
     * @description Executes bullet-hell attack patterns based on the current boss phase and modifiers.
     * @param {Phaser.Physics.Arcade.Sprite} boss - The boss executing the attack.
     * @param {Phaser.Physics.Arcade.Sprite} player - The target player.
     * @param {number} angle - Angle towards the player.
     * @param {number} t - Time offset used for procedural pattern generation.
     */
    executeBossAttack(boss, player, angle, t) {
        const now = this.time.now;
        const phase = boss.state.phase;
        
        let cdMod = 1;
        if (boss.combatModifier) {
            if (boss.combatModifier.aggro) cdMod = 0.6;
            if (boss.combatModifier.defensive) cdMod = 1.4;
            if (boss.combatModifier.spawnMinions && Math.random() < 0.5) {
                this.spawnEnemy('swarmer').setPosition(boss.x, boss.y);
                this.waveLeft++;
            }
        }
        
        boss.cdMod = cdMod;
        
        // Pick random attack based on boss type and phase
        const attackType = Phaser.Math.Between(0, phase === 1 ? 1 : 2);
        
        if (attackType === 0) {
            // Pattern: Shotgun Burst
            const bullets = phase === 1 ? 7 : 12;
            const spread = phase === 1 ? 0.6 : 1.2;
            for (let i = 0; i < bullets; i++) {
                const a = angle - (spread/2) + (spread / (bullets-1)) * i;
                this.fireEnemyBullet(boss.x, boss.y, a, 350, 0.4, boss.type);
            }
            boss.state.nextAttack = now + (phase === 1 ? 2000 : 1200) * boss.cdMod;
            
        } else if (attackType === 1) {
            // Pattern: Spiral Ring
            const bullets = phase === 1 ? 12 : 24;
            for (let i = 0; i < bullets; i++) {
                const a = (Math.PI * 2 / bullets) * i + (t * 2);
                this.fireEnemyBullet(boss.x, boss.y, a, 200, 0.4, boss.type);
            }
            boss.state.nextAttack = now + (phase === 1 ? 2500 : 1500) * boss.cdMod;
            
        } else if (attackType === 2) {
            // Pattern: Death Laser Telegraph (Targeting line)
            // Phase 2 exclusive!
            if (!boss.state.telegraph) {
                // Draw telegraph line
                const graphics = this.add.graphics();
                graphics.lineStyle(4, 0xff0055, 0.5);
                graphics.lineBetween(boss.x, boss.y, boss.x + Math.cos(angle)*1500, boss.y + Math.sin(angle)*1500);
                graphics.setDepth(4);
                
                boss.state.telegraph = { g: graphics, angle: angle };
                boss.state.nextAttack = now + 800 * boss.cdMod; // Time to dodge!
            } else {
                // Fire the laser!
                boss.state.telegraph.g.destroy();
                const attackAngle = boss.state.telegraph.angle;
                boss.state.telegraph = null;
                
                // Big burst of fast bullets acting as a laser
                for(let j = 0; j < 5; j++) {
                    this.time.delayedCall(j * 50, () => {
                        if (!boss.active) return;
                        this.fireEnemyBullet(boss.x, boss.y, attackAngle, 900, 0.8, boss.type);
                        this.fireEnemyBullet(boss.x, boss.y, attackAngle + 0.1, 850, 0.8, boss.type);
                        this.fireEnemyBullet(boss.x, boss.y, attackAngle - 0.1, 850, 0.8, boss.type);
                    });
                }
                boss.state.nextAttack = now + 2500 * boss.cdMod;
            }
        }
    }

    /**
     * @description Spawns an enemy projectile from the pool aiming at a specific angle.
     * @param {number} x - Origin X coordinate.
     * @param {number} y - Origin Y coordinate.
     * @param {number} angle - Trajectory angle in radians.
     * @param {number} [speed=230] - Velocity magnitude.
     */
    fireEnemyBullet(x, y, angle, speed = 230, dmgMod = 1.0, eType = 'default') {
        let textureKey = 'proj_default';
        if (eType === 'shooter') textureKey = 'proj_shooter';
        else if (eType === 'laser') textureKey = 'proj_laser';
        else if (eType === 'hivemind_clone') textureKey = 'proj_clone';

        const b = this.eBullets.get(x, y);
        if (!b) return;
        b.setTexture(textureKey);
        b.setActive(true).setVisible(true).setDepth(6);
        
        if (textureKey === 'proj_laser') {
            b.setScale(1.0);
            if (b.body) {
                b.body.enable = true;
                b.body.setCircle(8, b.width/2 - 8, b.height/2 - 8);
            }
        } else {
            b.setScale(0.5);
            if (b.body) {
                b.body.enable = true;
                b.body.setCircle(24, b.width/2 - 24, b.height/2 - 24);
            }
        }
        b.damage = (5 + (this.waveNum * 1.5) + (this.pd.maxHp * 0.04)) * dmgMod;
        b.body.reset(x, y);
        b.setVelocity(Math.cos(angle)*speed, Math.sin(angle)*speed);
        b.rotation = angle;
    }

    // ─────────────────────────────────────────────────────
    // COLLISION HANDLERS
    // ─────────────────────────────────────────────────────
    /**
     * @description Collision callback when a player projectile strikes an enemy.
     * @param {Phaser.Physics.Arcade.Image} bullet - The projectile striking the target.
     * @param {Phaser.Physics.Arcade.Sprite} enemy - The target being struck.
     */
    onBulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active || enemy.isDying) return;
        
        if (bullet.hitEnemies && bullet.hitEnemies.includes(enemy)) return;
        
        if (enemy.isShielded) {
            if (!bullet.pierce) this.bullets.killAndHide(bullet);
            this.showDmgNum(enemy.x, enemy.y - 10, 'BLOCK', '#00aaff');
            if (this.audioSys) this.audioSys.playHit();
            return;
        }

        // Wave 10: Armor Plating Block
        if (enemy.hasArmor) {
            enemy.hasArmor = false;
            if (enemy.armorGraphics) {
                enemy.armorGraphics.destroy();
                enemy.armorGraphics = null;
            }
            if (!bullet.pierce) this.bullets.killAndHide(bullet);
            this.showDmgNum(enemy.x, enemy.y - 10, 'ARMOR', '#00ffff');
            if (this.audioSys) this.audioSys.playHit();
            
            // Armor break particle effect
            const p = this.add.particles(enemy.x, enemy.y, 'm_dust', {
                speed: { min: 50, max: 150 },
                scale: { start: 0.5, end: 0 },
                tint: 0x00ffff,
                blendMode: 'ADD',
                lifespan: 400,
                quantity: 10
            });
            this.time.delayedCall(400, () => p.destroy());
            
            return; // Block all damage
        }
        
        if (!bullet.hitEnemies) bullet.hitEnemies = [];
        bullet.hitEnemies.push(enemy);
        
        let appliedDamage = bullet.damage;
        if (this.pd.kineticAccelerator && bullet.startX !== undefined) {
            const dist = Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y);
            const multiplier = 1 + Math.min(dist / 800, 1) * 1.5; // Up to +150% damage at 800px distance
            appliedDamage = Math.floor((bullet.baseDamage || bullet.damage) * multiplier);
            bullet.damage = appliedDamage; // Update for AoE effects if needed
        }
        
        if (!bullet.pierce) {
            if (this.pd.ricochetRounds && (bullet.bounces || 0) < 3) {
                bullet.bounces = (bullet.bounces || 0) + 1;
                
                let nearest = null;
                let minDist = 400; // max bounce distance
                this.enemies.getChildren().forEach(e => {
                    if (e.active && e !== enemy && !e.isDying && !bullet.hitEnemies.includes(e)) {
                        let d = Phaser.Math.Distance.Between(bullet.x, bullet.y, e.x, e.y);
                        if (d < minDist) { minDist = d; nearest = e; }
                    }
                });
                
                if (nearest && bullet.body) {
                    let angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, nearest.x, nearest.y);
                    const speed = Math.sqrt(bullet.body.velocity.x**2 + bullet.body.velocity.y**2) || 800;
                    bullet.body.setVelocity(Math.cos(angle) * Math.max(speed, 600), Math.sin(angle) * Math.max(speed, 600));
                    bullet.setRotation(angle + Math.PI/2);
                } else {
                    this.bullets.killAndHide(bullet);
                }
            } else {
                this.bullets.killAndHide(bullet);
            }
        }

        if (enemy.isHitZone) {
            this.bossSys.damageHitZone(enemy, bullet.damage, enemy.parentBoss);
            this.showDmgNum(enemy.x, enemy.y - 10, bullet.damage, bullet.isCrit ? '#ff0055' : '#ffff00');
            if (enemy.parentBoss && !enemy.parentBoss.isDying) {
                enemy.parentBoss.hp -= bullet.damage * 0.2;
                if (enemy.parentBoss.hp <= 0) {
                    this.killEnemy(enemy.parentBoss);
                }
            }
            return;
        }

        if (this.pd.hasSupernova) {
            this.weaponSys.triggerSupernova(enemy.x, enemy.y, this.pd.damage * 3, this.enemies);
        }
        
        if (this.pd.isExplosive || this.pd.explosiveRounds) {
            // Bomber's passive or Explosive Rounds Nyx Upgrade: mini AoE around the hit target
            const radius = 60;
            const splashDmg = this.pd.damage * 0.5;
            this.spawnDeathFX(enemy.x, enemy.y, 0xff5500); // Orange mini explosion
            
            this.enemies.getChildren().forEach(e => {
                if (e.active && !e.isHitZone && !e.isDying && e !== enemy) {
                    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y) < radius) {
                        e.hp -= splashDmg;
                        if (e.hp <= 0) this.killEnemy(e);
                    }
                }
            });
        }

        const cryoLvl = this.pd.upgLevels['cryo_ray'] || 0;
        if (cryoLvl > 0) {
            enemy.isFrozen = true;
            const slowFactor = Math.max(0.1, 0.85 - (cryoLvl * 0.15));
            enemy.speed = Math.max(10, enemy.originalSpeed * slowFactor);
            if (enemy.setTint) enemy.setTint(0x00ccff);
            enemy.cryoUntil = this.time.now + 2000 + (cryoLvl * 500);
        }

        if (this.pd.poisonRounds) {
            enemy.isPoisoned = true;
            enemy.poisonTicks = 4;
            if (enemy.setTint) enemy.setTint(0x88ff00);
            if (!enemy.poisonTimer) {
                enemy.poisonTimer = this.time.addEvent({
                    delay: 1000,
                    loop: true,
                    callback: () => {
                        if (!enemy.active || enemy.isDying) {
                            if (enemy.poisonTimer) enemy.poisonTimer.remove();
                            return;
                        }
                        if (enemy.poisonTicks > 0) {
                            enemy.hp -= 2;
                            this.showDmgNum(enemy.x, enemy.y, 2, '#88ff00');
                            if (enemy.hp <= 0 && !enemy.isDying) this.killEnemy(enemy);
                            enemy.poisonTicks--;
                        } else {
                            enemy.isPoisoned = false;
                            if (enemy.clearTint) enemy.clearTint();
                            if (enemy.poisonTimer) enemy.poisonTimer.remove();
                            enemy.poisonTimer = null;
                        }
                    }
                });
            }
        }

        if (this.audioSys) this.audioSys.playHit();
        enemy.hp -= bullet.damage;
        
        let color = '#ffffff';
        if (bullet.isCrit) {
            color = '#ff0055';
            this.triggerHitStop(0.5);
            this.cameras.main.shake(40, 0.005);
        }

        this.showDmgNum(enemy.x, enemy.y - 10, bullet.damage, color);
        this.tweens.add({ targets: enemy, alpha: 0.35, duration: 60, yoyo: true });

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    /**
     * @description Collision callback when the player physically collides with an enemy hull.
     * @param {Phaser.Physics.Arcade.Sprite} player - The player.
     * @param {Phaser.Physics.Arcade.Sprite} enemy - The enemy colliding with the player.
     */
    onPlayerTouchEnemy(player, enemy) {
        if (!player || !player.active || !enemy || !enemy.active || this.isGameOver || this.playerInvincible || this.godMode) return;
        const collisionDmg = 10 + (this.waveNum * 2.5) + (this.pd.maxHp * 0.08);
        this.damagePlayer(collisionDmg);
        // Repulse enemy if it has physics enabled and body still exists
        if (enemy.body && typeof enemy.setVelocity === 'function') {
            const a = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            enemy.setVelocity(Math.cos(a)*320, Math.sin(a)*320);
            this.time.delayedCall(300, () => { if (enemy.active && enemy.body && typeof enemy.setVelocity === 'function') enemy.setVelocity(0,0); });
        }
    }

    /**
     * @description Collision callback when an enemy projectile strikes the player.
     * @param {Phaser.Physics.Arcade.Sprite} player - The player.
     * @param {Phaser.Physics.Arcade.Image} bullet - The enemy projectile.
     */
    onEnemyBulletHit(player, bullet) {
        if (!player || !player.active || !bullet || !bullet.active || this.isGameOver) return;
        this.eBullets.killAndHide(bullet);
        this.damagePlayer(bullet.damage || 10);
    }

    /**
     * @description Collision callback when an orbital defense blade slices an enemy.
     * @param {Phaser.Physics.Arcade.Sprite} blade - The orbital blade.
     * @param {Phaser.Physics.Arcade.Sprite} enemy - The target enemy.
     */
    onOrbitalHitEnemy(blade, enemy) {
        if (!enemy.active || enemy.isDying || enemy.isShielded) return;
        const now = this.time.now;
        if (now - (enemy.lastOrbitalHit || 0) < 400) return; // Cooldown for orbital damage ticks
        enemy.lastOrbitalHit = now;
        
        const dmg = this.pd.damage * 1.5;
        if (this.audioSys) this.audioSys.playHit();
        enemy.hp -= dmg;
        this.showDmgNum(enemy.x, enemy.y - 10, dmg);
        this.tweens.add({ targets: enemy, alpha: 0.35, duration: 60, yoyo: true });
        
        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    /**
     * @description Collision callback when an orbital blade blocks an incoming enemy projectile.
     * @param {Phaser.Physics.Arcade.Sprite} blade - The orbital blade.
     * @param {Phaser.Physics.Arcade.Image} bullet - The blocked projectile.
     */
    onOrbitalHitEnemyBullet(blade, bullet) {
        if (!bullet.active) return;
        this.eBullets.killAndHide(bullet);
        bullet.active = false;
        bullet.body.enable = false;
        this.spawnDeathFX(bullet.x, bullet.y, 0x00ffcc);
        if (this.audioSys) this.audioSys.playHit();
    }

    /**
     * @description Initiates the death sequence and cleanup for a defeated enemy.
     * @param {Phaser.Physics.Arcade.Sprite} enemy - The defeated enemy.
     */
    killEnemy(enemy) {
        if (this.audioSys) this.audioSys.playExplosion();
        
        // Clean up boss telegraphs
        if (enemy.state && enemy.state.telegraph) {
            enemy.state.telegraph.g.destroy();
            enemy.state.telegraph = null;
        }
        
        enemy.isDying = true;
        this.onEnemyDied(enemy);
    }

    /**
     * @description Handles drop generation (XP, scrap, weapons), score calculation, and chain effects upon enemy death.
     * @param {Phaser.Physics.Arcade.Sprite} enemy - The enemy that just died.
     */
    onEnemyDied(enemy) {
        if (enemy.type === 'boss') {
            if (this.pd.overclockActive) {
                this.pd.overclockActive = false;
                if (this.shootTimer) this.shootTimer.delay = this.pd.fireDelay;
                this.showBanner('KOFFEIN-SCHOCK BEENDET', '#ffff00');
            }
        }
        
        if (this.pd.vampireProtocol) {
            this.healPlayer(1);
        }

        // Wave 30+: Volatile Blood (Säure-Explosion)
        if (this.waveNum >= 30 && Math.random() < 0.20 && enemy.type !== 'boss' && enemy.type !== 'mothership' && enemy.type !== 'hivemind') {
            const angles = [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4]; // X pattern
            angles.forEach(a => {
                this.fireEnemyBullet(enemy.x, enemy.y, a, 180, 1.2, enemy.type);
            });
            // Explosion visual
            const p = this.add.particles(enemy.x, enemy.y, 'm_dust', {
                speed: { min: 100, max: 200 },
                scale: { start: 0.8, end: 0 },
                tint: 0x00ff00,
                blendMode: 'ADD',
                lifespan: 500,
                quantity: 15
            });
            this.time.delayedCall(500, () => p.destroy());
        }
        
        if (this.shipClass === 'paladin') {
            this.pd.vampireKills = (this.pd.vampireKills || 0) + 1;
            if (this.pd.vampireKills >= 15) {
                this.pd.vampireKills = 0;
                this.healPlayer(1);
            }
        }

        // Combo
        const now = this.time.now;
        this.comboCount = (now - this.lastKillTime < 1400) ? this.comboCount + 1 : 1;
        this.lastKillTime = now;
        if (this.comboCount >= 3) this.showCombo(this.comboCount);

        const mult = Math.max(1, Math.floor(this.comboCount / 3));
        this.score += (enemy.scoreVal || 0) * mult;

        // AoE shockwave
        if (this.pd.aoe) {
            this.enemies.getChildren().forEach(other => {
                if (other === enemy || !other.active) return;
                const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y);
                if (d < 130) {
                    if (other.isHitZone) {
                        this.bossSys.damageHitZone(other, this.pd.damage * 0.6, other.parentBoss);
                    } else {
                        other.hp -= this.pd.damage * 0.6;
                        if (other.hp <= 0 && !other.isDying) { 
                            this.killEnemy(other); 
                        }
                    }
                }
            });
        }

        this.spawnXP(enemy.x, enemy.y, enemy.xpVal);
        
        // Scrap drops (40% chance for basic enemies, 5 scraps for boss)
        if (enemy.type === 'boss') {
            for (let i = 0; i < 5; i++) this.spawnScrap(enemy.x + Math.random()*40-20, enemy.y + Math.random()*40-20);
        } else if (Math.random() < 0.40) {
            this.spawnScrap(enemy.x, enemy.y);
        }

        const cubeChance = this.pd.unlockCubeBooster ? 0.30 : 0.20;
        if (Math.random() < cubeChance) {
            this.spawnCube(enemy.x, enemy.y);
        }
        
        // Weapon Upgrade drop logic (Elites and Bosses)
        if (enemy.type === 'elite' || enemy.type === 'boss' || enemy.type === 'mothership' || enemy.type === 'hivemind' || enemy.type === 'destroyer') {
            if (Math.random() < 0.50) {
                this.spawnWeaponUpgrade(enemy.x, enemy.y);
            }
        }

        this.spawnDeathFX(enemy.x, enemy.y, enemy.displayWidth > 50 ? 0xff3300 : 0xff8800);
        this.cameras.main.shake(120, enemy.type === 'boss' ? 0.018 : 0.006);

        if (enemy.type === 'boss_cheese' || enemy.type === 'boss_irs_p2' || enemy.type === 'boss_vacuum_p2') {
            this.triggerHitStop(3.0);
            if (enemy.type === 'boss' && this.achieveSys.unlock('boss_1')) {
                this.showBanner('ACHIEVEMENT: Piratenkönig auf Abwegen!', '#00ffff');
            }
            this.eventSys.triggerCompanionComment('boss_kill');
            this.hud.bossBg.setVisible(false);
            this.hud.bossBar.setVisible(false);
            this.hud.bossName.setVisible(false);
            this.bossRef = null;
        }

        if (enemy.auraGraphics) {
            enemy.auraGraphics.destroy();
            enemy.auraGraphics = null;
        }
        enemy.destroy();
        if (enemy.waveNum === this.waveNum) {
            this.waveLeft--;
        }
        // ── BOSS PHASE 2 TRANSITIONS ──
        let phase2Type = null;
        if (enemy.type === 'boss') phase2Type = 'boss_cheese';
        if (enemy.type === 'boss_irs') phase2Type = 'boss_irs_p2';
        if (enemy.type === 'boss_vacuum') phase2Type = 'boss_vacuum_p2';

        if (phase2Type) {
            this.waveLeft++; // keep wave alive
            this.time.delayedCall(4000, () => {
                if (!this.isGameOver) {
                    const phase2Boss = this.spawnEnemy(phase2Type);
                    phase2Boss.setPosition(enemy.x, enemy.y);
                }
            });
        }

        this.checkWaveComplete();
    }

    /**
     * @description Spawns a scrap collectible at the specified coordinates.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     */
    spawnScrap(x, y) {
        const s = this.scraps.create(x, y, 'scrap_gear').setDepth(4);
        s.setScale(0.06);
        s.body.setCircle(256); // Full image circle scaled down
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 60 + 20;
        s.setVelocity(Math.cos(angle)*spd, Math.sin(angle)*spd);
        s.setDrag(1.2);
    }

    /**
     * @description Collision callback for collecting scrap currency.
     * @param {Phaser.Physics.Arcade.Sprite} player - The player.
     * @param {Phaser.Physics.Arcade.Sprite} scrap - The collected scrap.
     */
    onScrapCollect(player, scrap) {
        if (!scrap.active) return;
        if(this.audioSys) this.audioSys.playPickup('scrap');
        scrap.destroy();
        const value = Math.round(1 * (this.pd.greedMult || 1));
        this.pd.scrap += value;
        localStorage.setItem('neon_scrap', this.pd.scrap);
        this.showDmgNum(scrap.x, scrap.y - 10, '+1 SCRAP', '#ffcc00');
        if (this.audioSys) this.audioSys.playHit();
        
        const pt = this.add.text(scrap.x, scrap.y - 10, '+' + value, {
            fontFamily:'Orbitron', fontSize:'11px', color:'#ffcc00', fontStyle:'bold'
        }).setDepth(15).setOrigin(0.5);
        this.tweens.add({ targets: pt, y: pt.y - 20, alpha: 0, duration: 600, onComplete: () => pt.destroy() });
    }

    /**
     * @description Spawns a premium data cube drop.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     */
    spawnCube(x, y) {
        const c = this.cubesGroup.create(x, y, 'datacube').setDepth(4);
        c.setScale(0.06);
        c.body.setCircle(256);
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 80 + 20;
        c.setVelocity(Math.cos(angle)*spd, Math.sin(angle)*spd);
        c.setDrag(1.5);
    }

    /**
     * @description Spawns a temporary in-run weapon upgrade drop.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     */
    spawnWeaponUpgrade(x, y) {
        const u = this.weaponUpgradesGroup.create(x, y, 'weapon_upgrade_tex').setDepth(4);
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 80 + 20;
        u.setVelocity(Math.cos(angle)*spd, Math.sin(angle)*spd);
        u.setDrag(1.2);
        
        // Pulse effect
        this.tweens.add({
            targets: u,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * @description Collision callback for collecting a weapon upgrade. Increases weapon level up to max.
     * @param {Phaser.Physics.Arcade.Sprite} player - The player.
     * @param {Phaser.Physics.Arcade.Sprite} upgrade - The collected upgrade item.
     */
    onCollectWeaponUpgrade(player, upgrade) {
        if (!upgrade.active) return;
        if(this.audioSys) this.audioSys.playPickup('upgrade');
        upgrade.destroy();
        
        if (this.audioSys) this.audioSys.playLevelUp();
        
        if (this.pd.weaponLevel < 5) {
            this.pd.weaponLevel++;
            this.showBanner('WEAPON UPGRADED!', '#ff00ff');
            this.cameras.main.flash(150, 255, 0, 255);
        } else {
            // Already max level, give a lot of scrap instead
            this.pd.scrap += 10;
            localStorage.setItem('neon_scrap', this.pd.scrap);
            this.showBanner('MAX WEAPON LEVEL: +10 SCRAP!', '#ffcc00');
        }
    }

    /**
     * @description Collision callback for data cubes (meta-currency).
     * @param {Phaser.Physics.Arcade.Sprite} player - The player.
     * @param {Phaser.Physics.Arcade.Sprite} cube - The collected cube.
     */
    onCollectCube(player, cube) {
        if (!cube.active) return;
        if(this.audioSys) this.audioSys.playPickup('cube');
        cube.destroy();
        this.pd.cubes++;
        
        const pt = this.add.text(cube.x, cube.y - 10, '+1 CUBE', {
            fontFamily:'Orbitron', fontSize:'11px', color:'#ffff00', fontStyle:'bold'
        }).setDepth(15).setOrigin(0.5);
        this.tweens.add({ targets: pt, y: pt.y - 20, alpha: 0, duration: 600, onComplete: () => pt.destroy() });
    }

    // ─────────────────────────────────────────────────────
    // DAMAGE / HEAL
    // ─────────────────────────────────────────────────────
    
    /**
     * @description Slows time briefly for dramatic effect upon heavy impacts or crits.
     * @param {number} [intensity=1] - Multiplier for the freeze duration.
     */
    triggerHitStop(intensity = 1) {
        // Creates a dramatic micro-pause
        this.time.timeScale = 0.05; 
        setTimeout(() => {
            if (this.sys && this.sys.isActive()) {
                this.time.timeScale = 1;
            }
        }, 40 * intensity);
    }

    /**
     * @description Applies damage to the player, handling shields, invulnerability frames, and death state.
     * @param {number} amount - Amount of damage to deal.
     */
    damagePlayer(amount) {
        if (this.isGameOver || !this.player || !this.player.active || this.playerInvincible || this.godMode || this.player.isInvulnerable || this.player.hasAegis) return;

        if (this.pd.mirrorShield && Math.random() < 0.3) {
            this.showBanner('REFLEKTIERT!', '#aaddff');
            if (this.audioSys) this.audioSys.playHit();
            let nearest = null;
            let minDist = 1000;
            this.enemies.getChildren().forEach(e => {
                if (e.active && !e.isDying) {
                    let d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
                    if (d < minDist) { minDist = d; nearest = e; }
                }
            });
            if (nearest) {
                nearest.hp -= amount * 2;
                this.showDmgNum(nearest.x, nearest.y, amount * 2, '#aaddff');
                if (nearest.hp <= 0 && !nearest.isDying) this.killEnemy(nearest);
            }
            this.playerInvincible = true;
            this.time.delayedCall(250, () => { this.playerInvincible = false; });
            return;
        }

        this.triggerHitStop(1.5);
        this.eventSys.triggerCompanionComment('take_damage');
        if(this.audioSys) this.audioSys.playPlayerHit();

        if (this.pd.shield > 0) {
            this.pd.shield--;
            this.cameras.main.shake(50, 0.003);
            this.tweens.add({ targets: this.player, tint: 0x4499ff, duration: 80, yoyo: true, onComplete: () => this.player.clearTint() });
            
            // Reflektor-Schild: Fire revenge projectiles on shield break
            if (this.pd.unlockMirrorShield) {
                this.weaponSys.fireMirrorShieldProjectiles(this.player, this.enemies, this.pd.damage);
            }
            return;
        }

        if (this.audioSys) this.audioSys.playHit();
        
        if (this.pd.unlockVoidShield) {
            amount *= 0.85; // 15% damage reduction
        }
        
        if (this.pd.hp <= amount && this.pd.guardianAngel) {
            this.pd.guardianAngel = false;
            amount = this.pd.hp - 1;
            this.showBanner('SCHUTZENGEL AKTIVIERT!', '#ffffaa');
            this.playerInvincible = true;
            this.time.delayedCall(2000, () => { this.playerInvincible = false; });
        }
        
        this.pd.hp -= amount;
        this.playerInvincible = true;
        this.time.delayedCall(550, () => { this.playerInvincible = false; });
        this.cameras.main.shake(140, 0.008);
        this.tweens.add({ targets: this.player, alpha: 0.25, duration: 80, yoyo: true, repeat: 3, onComplete: () => this.player.setAlpha(1) });

        if (this.pd.hp <= 0) {
            if (this.pd.hasRevive) {
                this.pd.hasRevive = false;
                this.pd.hp = this.pd.maxHp * 0.5;
                this.showBanner('RUFUS PLOT-ARMOR AKTIVIERT!', '#00ffff');
                this.player.setPosition(this.cw/2, this.ch/2);
                
                this.enemies.getChildren().forEach(e => { 
                    if (e.active) { 
                        if (e.isHitZone) {
                            this.bossSys.damageHitZone(e, 300, e.parentBoss);
                            return;
                        }
                        if (e.type === 'boss') {
                            e.hp -= 300;
                            if (e.hp <= 0 && !e.isDying) { this.killEnemy(e); }
                        } else {
                            if (e.state && e.state.telegraph) {
                                e.state.telegraph.g.destroy();
                                e.state.telegraph = null;
                            }
                            if (e.auraGraphics) {
                                e.auraGraphics.destroy();
                                e.auraGraphics = null;
                            }
                            this.spawnDeathFX(e.x, e.y, 0xffffff); 
                            if (e.waveNum === this.waveNum) this.waveLeft--;
                            e.destroy();
                        }
                    }
                });
                this.checkWaveComplete();
                this.eBullets.getChildren().forEach(b => { if (b.active) this.eBullets.killAndHide(b); });
                
                this.playerInvincible = true;
                this.player.setAlpha(0.2);
                this.tweens.add({ targets: this.player, alpha: 1, duration: 2000 });
                this.time.delayedCall(2000, () => { this.playerInvincible = false; });
                return;
            }
            this.pd.hp = 0;
            this.gameOver();
        }
    }

    /**
     * @description Restores player HP without exceeding the maximum cap.
     * @param {number} amount - HP to restore.
     */
    healPlayer(amount) {
        this.pd.hp = Math.min(this.pd.maxHp, this.pd.hp + amount);
        this.eventSys.triggerCompanionComment('heal');
    }

    // ─────────────────────────────────────────────────────
    // XP / LEVEL UP
    // ─────────────────────────────────────────────────────
    /**
     * @description Drops an experience crystal containing a specific XP value.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} amount - Experience points contained.
     */
    spawnXP(x, y, amount) {
        const c = this.physics.add.image(x, y, 'crystal_xp').setDepth(3);
        c.setScale(0.05);
        c.xpVal = amount;
        c.body.setCircle(256);
        c.body.setDrag(180);
        const a = Math.random() * Math.PI * 2;
        c.setVelocity(Math.cos(a)*60, Math.sin(a)*60);
        this.crystals.add(c);
    }

    /**
     * @description Pulls nearby XP crystals, scrap, and upgrades toward the player based on the magnet stat.
     */
    updateXPMagnet() {
        const px = this.player.x, py = this.player.y;
        const rangeSq = this.pd.magnetRange * this.pd.magnetRange;
        this.crystals.getChildren().forEach(c => {
            if (!c.active) return;
            const distSq = (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y);
            if (distSq < rangeSq || c.magnetized) {
                c.magnetized = true;
                const a = Phaser.Math.Angle.Between(c.x, c.y, px, py);
                c.setVelocity(Math.cos(a) * 1200, Math.sin(a) * 1200);
                c.setAlpha(0.6);
            }
            if (distSq < 3600) { // 60 * 60 = 3600
                if(this.audioSys) this.audioSys.playPickup('xp');
                this.addXP(c.xpVal);
                c.destroy();
            }
        });

        this.scraps.getChildren().forEach(c => {
            if (!c.active) return;
            const distSq = (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y);
            if (distSq < rangeSq || c.magnetized) {
                c.magnetized = true;
                const a = Phaser.Math.Angle.Between(c.x, c.y, px, py);
                c.setVelocity(Math.cos(a) * 1200, Math.sin(a) * 1200);
            }
            if (distSq < 3600) {
                this.onScrapCollect(this.player, c);
            }
        });

        this.cubesGroup.getChildren().forEach(c => {
            if (!c.active) return;
            const distSq = (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y);
            if (distSq < rangeSq || c.magnetized) {
                c.magnetized = true;
                const a = Phaser.Math.Angle.Between(c.x, c.y, px, py);
                c.setVelocity(Math.cos(a) * 1200, Math.sin(a) * 1200);
                c.setAlpha(0.6);
            }
            if (distSq < 3600) {
                this.pd.cubes += 1;
                this.audioSys.playHover();
                c.destroy();
            }
        });
        
        this.weaponUpgradesGroup.getChildren().forEach(c => {
            if (!c.active) return;
            const distSq = (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y);
            if (distSq < rangeSq || c.magnetized) {
                c.magnetized = true;
                const a = Phaser.Math.Angle.Between(c.x, c.y, px, py);
                c.setVelocity(Math.cos(a) * 1200, Math.sin(a) * 1200);
            }
        });
    }

    /**
     * @description Adds experience points to the player and triggers level up if the threshold is reached.
     * @param {number} amount - XP to add.
     */
    addXP(amount) {
        this.pd.xp += amount;
        if (this.pd.xp >= this.pd.xpToNext) {
            this.pd.xp -= this.pd.xpToNext;
            this.pd.xpToNext = Math.floor(this.pd.xpToNext * 1.3);
            this.pd.level++;
            this.levelUp();
        }
    }

    /**
     * @description Pauses game logic and generates 3 random upgrade choices from the available pool.
     */
    levelUp() {
        // ── PAUSE EVERYTHING during upgrade selection ──
        this.physics.world.pause();
        this.tweens.pauseAll();
        this.shootTimer.paused = true;
        if (this.regenTimer) this.regenTimer.paused = true;
        this.playerInvincible = true;   // can't die while choosing

        // Flash level-up announcement
        this.cameras.main.flash(200, 0, 255, 100);
        if (this.audioSys) this.audioSys.playLevelUp();

        const MAX_LEVELS = { multi_shot: 5, chain_lightning: 5, black_hole: 5, drones: 5, cryo_ray: 5, orbital: 6, shield: 3, area: 1, crit: 1, damage: 5, fire_rate: 5, speed: 5, magnet: 5, sonic_wave: 3, mines: 5, sawblades: 5, focus_laser: 3, heavy_cannon: 5, damage_aura: 5 };
        let available = UPGRADES.filter(u => (this.pd.upgLevels[u.id] || 0) < (MAX_LEVELS[u.id] || 99));

        // Dynamically add Tech-Tree-unlocked items to the pool
        if (this.pd.unlockShield && (this.pd.upgLevels['shield'] || 0) < 3) {
            available.push({ id: 'shield', name: 'SCHILD MATRIX', desc: '+1 Schutzschild-Ladung', color: '#4499ff' });
        }
        if (this.pd.unlockTesla && (this.pd.upgLevels['chain_lightning'] || 0) < 5) {
            available.push({ id: 'chain_lightning', name: 'TESLA SPULE', desc: 'Blitze springen auf bis zu 4 Gegner', color: '#00ffff' });
        }
        if (this.pd.unlockSingularity && (this.pd.upgLevels['black_hole'] || 0) < 5) {
            available.push({ id: 'black_hole', name: 'SINGULARITÄT', desc: 'Schwarze Löcher saugen Gegner ein', color: '#aa00ff' });
        }
        if (this.pd.unlockCryo && (this.pd.upgLevels['cryo_ray'] || 0) < 5) {
            available.push({ id: 'cryo_ray', name: 'CRYO-STRAHL', desc: 'Verlangsamt Gegner permanent', color: '#00ccff' });
        }
        if (this.pd.unlockDrones && (this.pd.upgLevels['drones'] || 0) < 5) {
            available.push({ id: 'drones', name: 'KAMPFDROHNEN', desc: 'Begleitende Drohnen schießen mit', color: '#ff9900' });
        }
        if (this.pd.unlockOrbitals && (this.pd.upgLevels['orbital'] || 0) < 6) {
            available.push({ id: 'orbital', name: 'PLASMA ORBITALS', desc: '+1 kreisende Plasma-Klinge', color: '#ff0055' });
        }
        if (this.pd.unlockSonicWave && (this.pd.upgLevels['sonic_wave'] || 0) < 3) {
            available.push({ id: 'sonic_wave', name: 'SCHALL-BLASTER', desc: 'Erzeugt abstoßende Druckwellen', color: '#00ccff' });
        }
        if (this.pd.unlockMines && (this.pd.upgLevels['mines'] || 0) < 5) {
            available.push({ id: 'mines', name: 'NOVA-MINEN', desc: 'Legt automatisch Sprengfallen ab', color: '#ff5500' });
        }
        if (this.pd.unlockSawblades && (this.pd.upgLevels['sawblades'] || 0) < 5) {
            available.push({ id: 'sawblades', name: 'NEON-SÄGEBLÄTTER', desc: 'Wirbelnde Klingen um dein Schiff', color: '#ff0088' });
        }
        if (this.pd.unlockFocusLaser && (this.pd.upgLevels['focus_laser'] || 0) < 3) {
            available.push({ id: 'focus_laser', name: 'FOKUS-LASER', desc: 'Gebündelter Dauerstrahl voraus', color: '#ff2200' });
        }
        if (this.pd.unlockHeavyCannon && (this.pd.upgLevels['heavy_cannon'] || 0) < 5) {
            available.push({ id: 'heavy_cannon', name: 'SCHIFFSKANONE', desc: 'Massive Neon-Kugeln mit Durchschlag', color: '#ffcc00' });
        }
        if (this.pd.unlockDamageAura && (this.pd.upgLevels['damage_aura'] || 0) < 5) {
            available.push({ id: 'damage_aura', name: 'SCHADENSAURA', desc: 'Permanenter Schadensring', color: '#ff4400' });
        }

        // Evolutions only available with Fusion Core unlocked
        if (this.pd.unlockFusion) {
            if ((this.pd.upgLevels['damage'] || 0) >= 5 && (this.pd.upgLevels['area'] || 0) >= 1 && !this.pd.hasSupernova) {
                available.push({ id: 'evo_supernova', name: 'SUPERNOVA (EVO)', desc: 'Gigantische Explosion bei jedem Treffer', color: '#ff0000' });
            }
            if ((this.pd.upgLevels['chain_lightning'] || 0) >= 5 && (this.pd.upgLevels['fire_rate'] || 0) >= 5 && !this.pd.hasLaserWhip) {
                available.push({ id: 'evo_laser_whip', name: 'LASER WHIP (EVO)', desc: 'Peitscht tödliche Blitze über das ganze Feld', color: '#00ffff' });
            }
            if ((this.pd.upgLevels['magnet'] || 0) >= 5 && (this.pd.upgLevels['area'] || 0) >= 1 && !this.pd.hasVoidVortex) {
                available.push({ id: 'evo_void_vortex', name: 'VOID VORTEX (EVO)', desc: 'Erzeugt ein massives Schwarzes Loch', color: '#8800ff' });
            }
            if ((this.pd.upgLevels['shield'] || 0) >= 3 && (this.pd.upgLevels['cryo_ray'] || 0) >= 5 && !this.pd.hasFrostAegis) {
                available.push({ id: 'evo_frost_aegis', name: 'FROST AEGIS (EVO)', desc: 'Permanentes Eisschild, das Gegner einfriert', color: '#00ffff' });
            }
        }

        Phaser.Utils.Array.Shuffle(available);
        
        // Priority system: Ensure at least 1 tech/evo item appears if available
        const techItems = available.filter(u => ['shield', 'chain_lightning', 'black_hole', 'cryo_ray', 'drones', 'orbital', 'sonic_wave', 'mines', 'sawblades', 'focus_laser', 'heavy_cannon', 'damage_aura', 'evo_supernova', 'evo_laser_whip', 'evo_void_vortex', 'evo_frost_aegis'].includes(u.id));
        const basicItems = available.filter(u => !techItems.includes(u));
        
        let choices = [];
        if (techItems.length > 0) {
            choices.push(techItems.pop()); // Guarantee 1 tech item
        }
        
        // Fill the rest randomly from remaining items
        const remainingPool = Phaser.Utils.Array.Shuffle([...techItems, ...basicItems]);
        while (choices.length < 3 && remainingPool.length > 0) {
            choices.push(remainingPool.pop());
        }
        
        // Shuffle the 3 choices so the tech item isn't always the first card
        Phaser.Utils.Array.Shuffle(choices);

        this.showUpgradePanel(choices);
    }

    /**
     * @description Displays the HTML-based upgrade selection panel.
     * @param {Array<Object>} choices - The randomly drawn upgrades to offer.
     */
    showUpgradePanel(choices) {
        const panel = document.getElementById('upgrade-panel');
        const cardContainer = document.getElementById('upgrade-cards');
        if (!panel || !cardContainer) return;
        cardContainer.innerHTML = '';

        choices.forEach(upg => {
            const currentLevel = this.pd.upgLevels[upg.id] || 0;
            const nextLevel = currentLevel + 1;
            
            let dynamicDesc = upg.desc;
            switch (upg.id) {
                case 'multi_shot': dynamicDesc = '+1 Schuss-Projektil pro Salve'; break;
                case 'speed': dynamicDesc = '+20% Geschwindigkeit (Gesamt: +' + (nextLevel * 20) + '%)'; break;
                case 'damage': dynamicDesc = '+40% Schaden (Gesamt: +' + (nextLevel * 40) + '%)'; break;
                case 'fire_rate': dynamicDesc = '-20% Feuer-Verzögerung (Schneller feuern)'; break;
                case 'magnet': dynamicDesc = '+80px XP-Radius (Gesamt: +' + (nextLevel * 80) + 'px)'; break;
                case 'regen': dynamicDesc = '+3 HP/s Regeneration (Gesamt: ' + (nextLevel * 3) + ' HP/s)'; break;
                case 'chain_lightning': dynamicDesc = 'Blitze springen auf ' + (3 + nextLevel) + ' Gegner (Schaden +' + (nextLevel * 20) + '%)'; break;
                case 'black_hole': dynamicDesc = 'Dauer: ' + (3 + nextLevel) + 's, Saug-Radius: +' + (nextLevel * 30) + 'px (Schaden +' + (nextLevel * 20) + '%)'; break;
                case 'drones': dynamicDesc = 'Drohnen feuern ' + nextLevel + ' Schuss pro Salve in einer Kreisformation'; break;
                case 'cryo_ray': dynamicDesc = 'Frost-Dauer: ' + (2 + nextLevel * 0.5) + 's (Verstärkter Verlangsamungs-Effekt)'; break;
                case 'orbital': dynamicDesc = '+1 Plasma-Klinge (Du erhältst Klinge Nr. ' + nextLevel + ')'; break;
                case 'shield': dynamicDesc = 'Schild-Aufladezeit sinkt auf ' + (nextLevel === 1 ? '8s' : nextLevel === 2 ? '6s' : '4.5s'); break;
                case 'sonic_wave': dynamicDesc = 'Schallwelle stößt Feinde ' + (20 + nextLevel * 10) + '% weiter zurück'; break;
                case 'mines': dynamicDesc = 'Mine alle ' + Math.max(1, (4 - nextLevel * 0.5)) + 's (Max: ' + (nextLevel * 2) + ' Stück)'; break;
                case 'sawblades': dynamicDesc = 'Klingen: ' + (1 + nextLevel) + ' Stück (Schaden +' + (nextLevel * 15) + '%)'; break;
                case 'focus_laser': dynamicDesc = 'Laser-Stärke: ' + (nextLevel * 100) + '% (Breite +' + (nextLevel * 2) + 'px)'; break;
                case 'heavy_cannon': dynamicDesc = 'Kugelgröße: ' + (10 + nextLevel * 5) + 'px (Schaden x' + (1 + nextLevel * 0.5) + ')'; break;
                case 'damage_aura': dynamicDesc = 'Aura-Radius: ' + (60 + nextLevel * 20) + 'px (DPS: ' + (nextLevel * 10) + ')'; break;
            }

            const card = document.createElement('button');
            card.className = 'upg-card';
            card.style.cssText = `border-color:${upg.color}; --upg-color:${upg.color};`;
            card.innerHTML = `<div class="upg-name" style="color:${upg.color}">${upg.name} <span style="font-size:12px; color:#fff;">(Lvl ${nextLevel})</span></div><div class="upg-desc">${dynamicDesc}</div>`;
            card.addEventListener('click', () => {
                this.applyUpgrade(upg.id);
                panel.style.display = 'none';
                // Resume EVERYTHING
                this.physics.world.resume();
                this.tweens.resumeAll();
                this.eventSys.triggerCompanionComment('level_up');
                this.shootTimer.paused = false;
                if (this.regenTimer) this.regenTimer.paused = false;
                // Brief invincibility after selecting (avoid immediate death)
                this.playerInvincible = true;
                this.time.delayedCall(1200, () => { this.playerInvincible = false; });
            });
            cardContainer.appendChild(card);
        });

        document.getElementById('upg-level').textContent = `LEVEL ${this.pd.level}`;
        panel.style.display = 'flex';
    }

    /**
     * @description Applies the chosen upgrade modifier to the player's internal stats.
     * @param {string} id - The unique identifier of the chosen upgrade.
     */
    applyUpgrade(id) {
        const pd = this.pd;
        pd.upgLevels[id] = (pd.upgLevels[id] || 0) + 1;
        switch (id) {
            case 'multi_shot': pd.shots = Math.min(6, pd.shots + 1); break;
            case 'speed':      pd.speed = pd.baseSpeed * (1 + pd.upgLevels[id] * 0.20); break;
            case 'damage':     pd.damage = Math.floor(pd.damage * 1.4); break;
            case 'fire_rate':
                pd.fireDelay = Math.max(80, pd.fireDelay * 0.80);
                this.shootTimer.delay = pd.fireDelay;
                break;
            case 'shield':     pd.shield = Math.min(3, pd.shield + 1); break;
            case 'nova':       pd.nova++; break;
            case 'magnet':     pd.magnetRange += 80; break;
            case 'regen':      pd.regen += 3; break;
            case 'pierce':     pd.pierce = true; break;
            case 'area':       pd.aoe = true; break;
            case 'maxhp':      pd.maxHp += 30; pd.hp += 30; break;
            case 'crit':       pd.crit = true; break;
            case 'orbital':    this.pd.orbitals = pd.upgLevels[id]; this.updateOrbitals(); break;
            case 'evo_supernova': pd.hasSupernova = true; break;
            case 'evo_laser_whip': pd.hasLaserWhip = true; break;
            case 'evo_void_vortex': pd.hasVoidVortex = true; break;
            case 'evo_frost_aegis': pd.hasFrostAegis = true; break;
            case 'sawblades': /* Handled in fireBullet via upgLevels */ break;
            case 'focus_laser': /* Handled in fireBullet via upgLevels */ break;
            case 'heavy_cannon': /* Handled in fireBullet via upgLevels */ break;
            case 'damage_aura': /* Handled in update loop via upgLevels */ break;
            case 'sonic_wave': /* Handled in fireBullet via upgLevels */ break;
            case 'mines': /* Handled in update loop via upgLevels */ break;
        }
    }

    /**
     * @description Standard active: Consumes one Nova charge to wipe standard enemies from the screen and damage bosses.
     */
    useActiveItem() {
        if (!this.pd.activeItem || this.isGameOver) return;
        
        const item = this.pd.activeItem;
        this.pd.activeItem = null; // Consume the item
        
        // Hide the HUD text
        this.updateHUD();
        this.showBanner(item.toUpperCase() + ' AUSGELÖST!', '#00ffcc');

        if (item === 'emp_blast') {
            this.enemies.getChildren().forEach(e => {
                if (!e.active || e.isHitZone || e.isDying) return;
                e.stunned = true;
                e.oldVelocity = { x: e.body.velocity.x, y: e.body.velocity.y };
                e.setVelocity(0, 0);
                this.time.delayedCall(3000, () => { if (e.active && !e.isDying) { e.stunned = false; } });
            });
            this.cameras.main.flash(200, 136, 170, 255); // #88aaff flash
            if (this.audioSys) this.audioSys.playNovaBomb(); // Re-use nova bomb sound for impact
        }
        else if (item === 'gravity_well') {
            const cx = this.cw / 2, cy = this.ch / 2;
            this.time.addEvent({ delay: 100, repeat: 49, callback: () => {
                this.enemies.getChildren().forEach(e => { 
                    if (e.active && !e.isHitZone && !e.isDying && e.type !== 'boss') {
                        this.physics.moveToObject(e, { x: cx, y: cy }, 200);
                    }
                });
            }});
        }
        else if (item === 'kill_weakest') {
            const alive = this.enemies.getChildren().filter(e => e.active && !e.isDying && !e.isHitZone && e.type !== 'boss').sort((a, b) => a.hp - b.hp);
            alive.slice(0, 10).forEach(e => this.killEnemy(e));
        }
    }

    activateNovaBomb() {
        if (this.pd.nova <= 0 || this.isGameOver) return;
        this.pd.nova--;
        if (this.audioSys) this.audioSys.playNovaBomb();
        this.cameras.main.flash(300, 255, 255, 255);
        this.cameras.main.shake(400, 0.015);
        this.enemies.getChildren().forEach(e => {
            if (!e.active) return;
            if (e.isDying) {
                if (e.auraGraphics) {
                    e.auraGraphics.destroy();
                    e.auraGraphics = null;
                }
                e.setVelocity(0, 0);
                return; 
            }
            if (e.isHitZone) {
                this.bossSys.damageHitZone(e, 250, e.parentBoss);
                return;
            }
            if (e.type === 'boss') {
                e.hp -= 250;
                if (e.hp <= 0 && !e.isDying) { this.killEnemy(e); }
            } else {
                if (e.state && e.state.telegraph) {
                    e.state.telegraph.g.destroy();
                    e.state.telegraph = null;
                }
                if (e.auraGraphics) {
                    e.auraGraphics.destroy();
                    e.auraGraphics = null;
                }
                this.score += (e.scoreVal || 0);
                this.spawnXP(e.x, e.y, e.xpVal);
                this.spawnDeathFX(e.x, e.y, 0xffffff);
                if (e.waveNum === this.waveNum) this.waveLeft--;
                e.destroy();
            }
        });
        this.checkWaveComplete();
    }

    /**
     * @description Resizes or repositions the defensive orbital blades to match current upgrade levels.
     */
    updateOrbitals() {
        const count = this.pd.orbitals;
        
        // For Dreadnought/Arcade-Kapsel, weapons are on the extreme left/right wings
        let isArcade = (this.shipClass === 'dreadnought');

        while (this.orbitalsGroup.getChildren().length < count) {
            const b = this.orbitalsGroup.create(this.player.x, this.player.y, 'orbital_blade').setDepth(9);
            b.setScale(0.06);
            b.body.setCircle(128); 
        }
        
        const blades = this.orbitalsGroup.getChildren();
        blades.forEach((b, i) => {
            b.angleOffset = (Math.PI * 2 / blades.length) * i;
        });
    }

    // ─────────────────────────────────────────────────────
    // WAVE SYSTEM
    // ─────────────────────────────────────────────────────
    /**
     * @description Initiates the next wave cycle, queuing enemy spawns according to the procedural composition.
     * @param {number} n - The wave number to commence.
     */
    startWave(n) {
        this.waveNum = n;
        this.betweenWaves = false;

        if (this.pd.overchargeActive) {
            this.pd.overchargeActive = false;
        }

        // Wave skip (purchased from Nyx)
        if (this.pd.skipNextWave) {
            this.pd.skipNextWave = false;
            this.score += 1000 * n;
            this.addXP(200);
            this.showBanner(`WELLE ${n} ÜBERSPRUNGEN!`, '#ff4444');
            this.time.delayedCall(4000, () => { if (!this.isGameOver) this.startWave(n + 1); });
            return;
        }

        if (this.pd.orbitalStrikeReady) {
            this.pd.orbitalStrikeReady = false;
            this.showBanner('KATZENKLO-STRIKE INITIATED!', '#ff0000');
            this.cameras.main.flash(800, 255, 50, 50);
            this.cameras.main.shake(1000, 0.03);
            this.score += 2000 * n;
            this.addXP(500 * n);
            this.time.delayedCall(2000, () => {
                this.waveLeft = 0;
                this.checkWaveComplete();
            });
            return;
        }

        const comp = getWaveComp(n);
        
        if (this.audioSys) {
            if (comp.boss || comp.mothership || comp.hivemind || comp.destroyer || comp.boss_cheese || comp.boss_irs || comp.boss_vacuum) {
                const bTracks = ['boss_1', 'boss_2', 'boss_3', 'boss_4'];
                this.audioSys.playMusic(Phaser.Utils.Array.GetRandom(bTracks));
            } else {
                const sTracks = ['std_1', 'std_2', 'std_3', 'std_4', 'std_5', 'std_6', 'std_7', 'std_8'];
                this.audioSys.playMusic(Phaser.Utils.Array.GetRandom(sTracks));
            }
        }

        if (comp.boss || comp.isBoss) {
            this.waveLeft = 1;
            const bType = comp.type || 'boss';
            this.showBanner('⚠ BOSS ⚠', '#ff0000');
            this.time.delayedCall(2800, () => { if (!this.isGameOver) this.spawnEnemy(bType); });
            return;
        }

        let total = 0;
        Object.values(comp).forEach(c => total += c);
        this.waveLeft = total;

        this.showBanner(`WAVE ${n}`, '#ff00ff');

        let delay = 2400;
        Object.entries(comp).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                this.time.delayedCall(delay, () => {
                    if (!this.isGameOver) this.spawnEnemy(type);
                });
                const spawnMod = Math.max(0.15, 1 - (n * 0.04));
                delay += Phaser.Math.Between(180, 450) * spawnMod;
            }
        });
    }

    /**
     * @description Evaluates if all enemies in the current wave are defeated and progresses to the downtime phase.
     */
    checkWaveComplete() {
        if (this.waveLeft <= 0 && !this.betweenWaves) {
            this.betweenWaves = true;
            this.showBanner('SCHROTTBESEITIGUNG ERFOLGREICH!', '#00ff66');
            this.healPlayer(this.pd.maxHp * 0.2);
            this.pd.vampireProtocol = false; // expires after wave

            if (this.waveNum > 0 && this.waveNum % 5 === 0) {
                this.time.delayedCall(2000, () => { if (!this.isGameOver) this.spawnLaserCatMerchant(); });
            } else {
                this.time.delayedCall(3200, () => { if (!this.isGameOver) this.startWave(this.waveNum + 1); });
            }
        }
    }

    /**
     * @description Summons the mid-run shop vendor during specific wave intervals.
     */
    spawnLaserCatMerchant() {
        this.merchant = this.physics.add.sprite(-50, this.ch/2, 'nyx_merchant').setDepth(15);
        this.merchant.setScale(0.12);
        
        this.tweens.add({
            targets: this.merchant, x: this.cw + 50, duration: 8000,
            onComplete: () => {
                this.merchant.destroy();
                this.startWave(this.waveNum + 1);
            }
        });
        
        this.physics.add.overlap(this.player, this.merchant, () => {
            if (this.merchant.isOpened) return;
            this.merchant.isOpened = true;
            this.scene.pause();
            const htmlHud = document.getElementById('html-hud');
            if (htmlHud) htmlHud.style.display = 'none';
            this.scene.launch('InGameShopScene', { cubes: this.pd.cubes, upgLevels: this.pd.upgLevels, flags: this.pd });
        });
        
        this.showBanner('DIE KATZE WILL DEIN GELD!', '#aa00ff');
    }

    /**
     * @description Displays large stylized text across the center of the screen (e.g., Wave notifications).
     * @param {string} text - Message to show.
     * @param {string} color - Hex color for the text stroke.
     */
    showBanner(text, color) {
        const b = this.hud.waveBanner;
        b.setText(text).setColor(color).setAlpha(0);
        
        // Scale down if text is too wide for small screens
        b.setScale(1);
        if (b.width > this.cw * 0.9) {
            b.setScale((this.cw * 0.9) / b.width);
        }

        this.tweens.add({ targets: b, alpha: 1, duration: 380, onComplete: () => {
            this.tweens.add({ targets: b, alpha: 0, duration: 700, delay: 2000 });
        }});
    }

    // ─────────────────────────────────────────────────────
    // FX
    // ─────────────────────────────────────────────────────
    /**
     * @description Emits particle explosions denoting an entity's destruction.
     * @param {number} x - Impact X coordinate.
     * @param {number} y - Impact Y coordinate.
     * @param {number} color - Particle tint color.
     */
    spawnDeathFX(x, y, color) {
        const em = this.add.particles(x, y, 'p_glow', {
            speed: { min: 50, max: 200 }, scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 }, tint: color,
            blendMode: 'ADD', lifespan: 550, quantity: 14,
        }).setDepth(12);
        
        // Debris / Shrapnel explosion
        const debris = this.add.particles(x, y, 'p_debris', {
            speed: { min: 100, max: 300 }, scale: { start: 0.8, end: 0.2 },
            alpha: { start: 1, end: 0 }, tint: color,
            rotate: { start: 0, end: 360 },
            gravityY: 0, friction: 0.05,
            lifespan: 800, quantity: 8,
        }).setDepth(11);
        
        this.time.delayedCall(800, () => {
            em.destroy();
            debris.destroy();
        });
    }

    /**
     * @description Pops up a floating damage or status indicator text.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number|string} amount - Value or text to float.
     * @param {string} [color='#ffff00'] - Text color.
     */
    showDmgNum(x, y, amount, color = '#ffff00') {
        const isCrit = color === '#ff0055';
        const textVal = typeof amount === 'number' ? `-${Math.round(amount)}` : amount;
        const t = this.add.text(x, y, textVal, {
            fontFamily: 'Orbitron', fontSize: isCrit ? '18px' : '13px', color: color,
            fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setDepth(250).setOrigin(0.5);
        
        if (isCrit) {
            t.setScale(1.5);
            this.tweens.add({ targets: t, scale: 1, duration: 150, ease: 'Back.easeOut' });
        }
        
        this.tweens.add({ targets: t, y: y - 55, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }

    /**
     * @description Highlights consecutive rapid kills with a combo multiplier notification.
     * @param {number} count - Current combo sequence count.
     */
    showCombo(count) {
        const t = this.hud.comboText;
        const msg = (count > 15) ? 'MASCHINE!' : (count > 10) ? 'ZERSTÖRER!' : (count > 5) ? 'SCHROTT-COMBO!' : 'GLÜCK GEHABT!';
        t.setText(count + 'x ' + msg).setAlpha(1);
        this.tweens.killTweensOf(t);
        this.tweens.add({ targets: t, alpha: 0, duration: 1100, delay: 700 });
        if (count % 5 === 0) this.eventSys.triggerCompanionComment('combo_milestone');
    }

    // ─────────────────────────────────────────────────────
    // GAME OVER
    // ─────────────────────────────────────────────────────
    /**
     * @description Freezes gameplay, finalizes scoring, checks highscores, and reveals the Game Over overlay.
     */
    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        const htmlHud = document.getElementById('html-hud');
        if (htmlHud) htmlHud.style.display = 'none';
        this.shootTimer.paused = true;
        this.cameras.main.shake(500, 0.02);

        // Save highscore for legacy/HUD
        const prevHs   = parseInt(localStorage.getItem('neon_highscore') || '0');
        const isNewHs  = this.score > prevHs;
        if (isNewHs) {
            localStorage.setItem('neon_highscore', this.score);
            localStorage.setItem('neon_hs_wave',   this.waveNum);
        }

        // New Array-based Highscore System
        let highscores = [];
        try {
            highscores = JSON.parse(localStorage.getItem('neon_highscores')) || [];
        } catch (e) { highscores = []; }

        // Check if qualifies for top 10
        let qualifies = false;
        if (highscores.length < 10) {
            qualifies = true;
        } else {
            const minScore = highscores[highscores.length - 1].score;
            if (this.score > minScore) qualifies = true;
        }
        if (this.score === 0) qualifies = false;

        this.time.delayedCall(900, () => {
            const ov = document.getElementById('gameover-overlay');
            if (!ov) return;

            document.getElementById('go-score').textContent     = this.score.toLocaleString();
            document.getElementById('go-wave').textContent      = this.waveNum;
            document.getElementById('go-level').textContent     = this.pd.level;
            const hsEl = document.getElementById('go-highscore');
            if (hsEl) hsEl.textContent = isNewHs
                ? this.score.toLocaleString()
                : prevHs.toLocaleString();

            // New-highscore banner
            const nhsEl = document.getElementById('go-newhs');
            if (nhsEl) nhsEl.style.display = qualifies ? 'block' : 'none';

            const nameInput = document.getElementById('go-name-input');
            if (nameInput) {
                nameInput.style.display = qualifies ? 'block' : 'none';
                nameInput.value = '';
                
                // Disable keyboard capture in this scene so typing doesn't trigger game actions
                this.input.keyboard.enabled = false;
                
                nameInput.addEventListener('focus', () => { this.input.keyboard.enabled = false; });
                nameInput.addEventListener('blur', () => { this.input.keyboard.enabled = true; });
            }

            ov.style.display = 'flex';

            const saveHighscore = () => {
                if (qualifies && nameInput && nameInput.value.trim() !== '') {
                    let finalName = nameInput.value.trim().toUpperCase();
                    
                    // Profanity Filter
                    const badWords = ['HITLER', 'FICKER', 'FUCK', 'SHIT', 'CUNT', 'NIGGA', 'NIGGER', 'BITCH', 'ASSHOLE', 'ARSCHLOCH', 'HURE', 'NUTTE', 'PENIS', 'VAGINA', 'DICK', 'COCK', 'PIMMEL', 'FOTZE', 'NAZI', 'SPAST', 'WANKER', 'SLUT', 'WHORE'];
                    for (const bw of badWords) {
                        if (finalName.includes(bw)) {
                            finalName = 'CENSORED';
                            break;
                        }
                    }

                    highscores.push({
                        name: finalName,
                        score: this.score,
                        wave: this.waveNum,
                        ship: this.shipClass.toUpperCase()
                    });
                    highscores.sort((a, b) => b.score - a.score);
                    highscores = highscores.slice(0, 10);
                    localStorage.setItem('neon_highscores', JSON.stringify(highscores));
                }
            };

            const goRestart = document.getElementById('go-restart');
            goRestart.onmouseenter = () => { if (this.audioSys) this.audioSys.playHover(); };
            goRestart.onclick = () => {
                if (this.audioSys) this.audioSys.playClick();
                saveHighscore();
                ov.style.display = 'none';
                this.input.keyboard.enabled = true;
                this.scene.restart();
            };
            const goMenu = document.getElementById('go-menu');
            goMenu.onmouseenter = () => { if (this.audioSys) this.audioSys.playHover(); };
            goMenu.onclick = () => {
                if (this.audioSys) this.audioSys.playClick();
                saveHighscore();
                ov.style.display = 'none';
                this.input.keyboard.enabled = true;
                this.scene.start('MenuScene');
            };
        });
    }

    // ─────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────
    /**
     * @description Phaser core tick loop. Updates movement, physics logic, and cleans up out-of-bound entities.
     * @param {number} time - Current elapsed game time.
     * @param {number} delta - Delta time since last frame.
     */
    update(time, delta) {
        if (this.isGameOver || this.isDevMenuOpen) return;

        this.handleMovement();
        this.updateEnemies();
        this.updateXPMagnet();
        this.updateHUD();
        this.envSys.update(time, delta);
        this.juiceSys.update(time, delta);
        this.abilitySys.update(time, delta);
        this.hazardSys.update(time, delta);

        // ── OKTOHORNCAT: Rainbow Horn Glow + Tentacle Color Cycling ──
        if (this.shipClass === 'paladin' && this.player && this.player.active) {
            // Rainbow horn: smoothly cycle through HSL colors
            if (this.paladinHornGlow) {
                this.paladinHornHue = (this.paladinHornHue + delta * 0.2) % 360;
                const h = this.paladinHornHue / 360;
                // HSL to RGB conversion (s=1, l=0.5 = full saturation)
                const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
                const q = 1, p = 0;
                const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
                const g = Math.round(hue2rgb(p, q, h) * 255);
                const b2 = Math.round(hue2rgb(p, q, h - 1/3) * 255);
                const color = (r << 16) | (g << 8) | b2;
                this.paladinHornGlow.setFillStyle(color, 0.7);
                this.paladinHornGlow.setPosition(this.player.x, this.player.y - 28);
            }
            // Tentacle color cycling: shift each tentacle's tint over time
            if (this.paladinTentacles) {
                const baseHue = (time * 0.1) % 360;
                this.paladinTentacles.forEach((p, i) => {
                    const tentHue = (baseHue + i * 45) % 360;
                    const th = tentHue / 360;
                    const hue2rgb = (pp, qq, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return pp + (qq - pp) * 6 * t; if (t < 1/2) return qq; if (t < 2/3) return pp + (qq - pp) * (2/3 - t) * 6; return pp; };
                    const qq = 1, pp = 0;
                    const rr = Math.round(hue2rgb(pp, qq, th + 1/3) * 255);
                    const gg = Math.round(hue2rgb(pp, qq, th) * 255);
                    const bb = Math.round(hue2rgb(pp, qq, th - 1/3) * 255);
                    const tc = (rr << 16) | (gg << 8) | bb;
                    p.setParticleTint(tc);
                });
            }
        }
        
        if (Math.random() < 0.0005) {
            this.eventSys.triggerCompanionComment('idle');
        }

        const timeSeconds = time / 1000;
        const radius = 70 + (this.pd.orbitals * 3);
        const rotSpeed = 3.5;
        this.orbitalsGroup.getChildren().forEach(b => {
            if (typeof b.angleOffset !== 'number') b.angleOffset = 0;
            const targetX = this.player.x + Math.cos(timeSeconds * rotSpeed + b.angleOffset) * radius;
            const targetY = this.player.y + Math.sin(timeSeconds * rotSpeed + b.angleOffset) * radius;
            
            if (!isNaN(targetX) && !isNaN(targetY)) {
                b.setPosition(targetX, targetY);
            }
            b.rotation += 0.3; // Spin blade
            
            // Failsafe: if the blade gets stuck far away, teleport it back
            if (Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) > radius * 2.5) {
                b.setPosition(this.player.x, this.player.y);
            }
        });

        // ── Visuals für Auren & Schilde ──
        if (this.pd.damageAura && this.damageAuraGraphics) {
            this.damageAuraGraphics.clear();
            const dmgAuraLevel = (this.pd.nyxLevels && this.pd.nyxLevels['damage_aura']) ? this.pd.nyxLevels['damage_aura'] : 1;
            const auraRadius = 100 + (dmgAuraLevel * 20);
            this.damageAuraGraphics.lineStyle(2, 0xff4400, 0.4);
            this.damageAuraGraphics.fillStyle(0xff4400, 0.1);
            this.damageAuraGraphics.strokeCircle(this.player.x, this.player.y, auraRadius);
            this.damageAuraGraphics.fillCircle(this.player.x, this.player.y, auraRadius);
            
            if (!this.lastAuraDmgTime) this.lastAuraDmgTime = time;
            if (time - this.lastAuraDmgTime > 1000) {
                this.lastAuraDmgTime = time;
                const auraDmg = 5 * dmgAuraLevel;
                this.enemies.getChildren().forEach(e => {
                    if (e.active && !e.isHitZone && !e.isDying && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < auraRadius) {
                        e.hp -= auraDmg;
                        this.showDmgNum(e.x, e.y - 10, auraDmg, '#ff4400');
                        if (e.hp <= 0) this.killEnemy(e);
                    }
                });
            }
        }
        
        if (this.pd.mirrorShield && this.mirrorShieldGraphics) {
            this.mirrorShieldGraphics.clear();
            this.mirrorShieldGraphics.lineStyle(3, 0xaaddff, 0.6);
            this.mirrorShieldGraphics.strokeCircle(this.player.x, this.player.y, 45);
        }

        // ── Orbital Strike Drone Companion ──
        if (this.pd.orbitalStrikeLevel > 0) {
            if (!this.strikeDrone) {
                this.strikeDrone = this.add.sprite(this.player.x, this.player.y, 'orbital_blade').setScale(0.2).setDepth(25).setTint(0xff00aa);
                this.strikeDrone.lastFire = time;
            }
            
            // Follow player slowly
            const destX = this.player.x - 40;
            const destY = this.player.y - 40;
            this.strikeDrone.x += (destX - this.strikeDrone.x) * 0.05;
            this.strikeDrone.y += (destY - this.strikeDrone.y) * 0.05;
            this.strikeDrone.rotation += 0.05;
            
            const fireRate = Math.max(500, 2000 - (this.pd.orbitalStrikeLevel * 300));
            if (time - this.strikeDrone.lastFire > fireRate) {
                this.strikeDrone.lastFire = time;
                let target = this.findNearestEnemy();
                if (target) {
                    const angle = Phaser.Math.Angle.Between(this.strikeDrone.x, this.strikeDrone.y, target.x, target.y);
                    this.fireBullet(this.strikeDrone.x, this.strikeDrone.y, angle, true);
                    this.cameras.main.shake(50, 0.005);
                }
            }
        }

        // ── Clean out-of-bounds projectiles (use killAndHide to keep pool) ──
        const margin = 90;
        const { cw, ch } = this;
        this.bullets.getChildren().forEach(b => {
            if (!b.active) return;
            if (b.x < -margin || b.x > cw+margin || b.y < -margin || b.y > ch+margin) {
                this.bullets.killAndHide(b);
            } else if (b.lifespan > 0 && time - b.spawnTime > b.lifespan) {
                this.bullets.killAndHide(b);
            } else if (this.pd.homingRounds && b.body && b.body.velocity.length() > 0) {
                let nearest = null;
                let minDist = 250;
                this.enemies.getChildren().forEach(e => {
                    if (e.active && !e.isDying && (!b.hitEnemies || !b.hitEnemies.includes(e))) {
                        let d = Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y);
                        if (d < minDist) { minDist = d; nearest = e; }
                    }
                });
                if (nearest) {
                    const targetAngle = Phaser.Math.Angle.Between(b.x, b.y, nearest.x, nearest.y);
                    let currentAngle = b.body.velocity.angle();
                    let diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                    currentAngle += diff * 0.08;
                    const speed = b.body.velocity.length();
                    b.body.setVelocity(Math.cos(currentAngle) * speed, Math.sin(currentAngle) * speed);
                    b.setRotation(currentAngle + Math.PI/2);
                }
            }
        });
        this.eBullets.getChildren().forEach(b => {
            if (b.active) {
                if (b.x < -margin || b.x > cw+margin || b.y < -margin || b.y > ch+margin) {
                    this.eBullets.killAndHide(b);
                } else if (b.body && b.body.velocity.x === 0 && b.body.velocity.y === 0) {
                    this.eBullets.killAndHide(b);
                }
            }
        });
        this.crystals.getChildren().forEach(c => {
            if (c.active && (c.x < -margin || c.x > cw+margin || c.y < -margin || c.y > ch+margin))
                c.destroy();
        });
        this.cubesGroup.getChildren().forEach(c => {
            if (c.active && (c.x < -margin || c.x > cw+margin || c.y < -margin || c.y > ch+margin))
                c.destroy();
        });
    }

    // ==========================================
    // DEV MENU (F6)
    // ==========================================
    /**
     * @description Opens or closes the developer debug interface overlay.
     */
    toggleDevMenu() {
        if (this.isGameOver) return;
        
        this.isDevMenuOpen = !this.isDevMenuOpen;
        
        if (!this.isDevMenuOpen) {
            if (this.devMenuContainer) {
                this.devMenuContainer.destroy();
                this.devMenuContainer = null;
            }
            this.physics.resume();
            if (this.shootTimer) this.shootTimer.paused = false;
            if (this.scene.systems.tweens) this.scene.systems.tweens.resumeAll();
            return;
        }

        // Pause
        this.physics.pause();
        if (this.shootTimer) this.shootTimer.paused = true;
        if (this.scene.systems.tweens) this.scene.systems.tweens.pauseAll();

        const { width: cw, height: ch } = this.scale;
        this.devMenuContainer = this.add.container(cw / 2, ch / 2).setDepth(9999);

        const bg = this.add.rectangle(0, 0, 400, 600, 0x000000, 0.9).setStrokeStyle(2, 0xff00ff);
        this.devMenuContainer.add(bg);

        this.devMenuContainer.add(this.add.text(0, -260, '[ DEVELOPER MENU ]', {
            fontFamily: 'Orbitron', fontSize: '20px', color: '#ff00ff', fontStyle: 'bold'
        }).setOrigin(0.5));

        const createBtn = (x, y, text, callback) => {
            const btnBg = this.add.rectangle(x, y, 300, 40, 0x222222).setStrokeStyle(1, 0xff00ff).setInteractive({ useHandCursor: true });
            const btnTxt = this.add.text(x, y, text, { fontFamily: 'Share Tech Mono', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
            btnBg.on('pointerover', () => btnBg.setFillStyle(0xff00ff));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x222222));
            btnBg.on('pointerdown', () => { callback(); this.toggleDevMenu(); });
            this.devMenuContainer.add([btnBg, btnTxt]);
        };

        // Buttons
        createBtn(0, -150, 'JUMP TO BOSS 1 (WAVE 5)', () => {
            this.waveNum = 4; // will be incremented to 5
            this.waveLeft = 0;
            
            // Buff player to level 10
            this.pd.level = 10;
            this.pd.maxHp += 200;
            this.pd.hp = this.pd.maxHp;
            this.pd.damage *= 2;
            this.pd.fireDelay = Math.max(50, this.pd.fireDelay - 100);
            this.pd.shots += 2;
            this.pd.orbitals = 2;
            this.updateOrbitals();
            this.updateHUD();

            this.enemies.clear(true, true);
            this.checkWaveComplete();
        });

        createBtn(0, -90, 'JUMP TO BOSS 2 (WAVE 10)', () => {
            this.waveNum = 9;
            this.waveLeft = 0;
            this.enemies.clear(true, true);
            this.checkWaveComplete();
        });

        createBtn(0, -30, '+ 10.000 SCRAP', () => {
            this.scrap += 10000;
            this.eventSys.triggerCompanionComment('dev_cheat');
        });

        createBtn(0, 30, '+ 100 CUBES', () => {
            this.cubes += 100;
            this.eventSys.triggerCompanionComment('dev_cheat');
        });

        createBtn(0, 90, 'LEVEL UP x5', () => {
            for (let i = 0; i < 5; i++) {
                this.pd.level++;
                this.pd.skillPoints++;
            }
            this.scene.pause();
            this.scene.launch('ShopScene', { currentPoints: this.pd.skillPoints });
        });

        createBtn(0, 150, 'OPEN NYX SHOP', () => {
            this.scene.pause();
            const htmlHud = document.getElementById('html-hud');
            if (htmlHud) htmlHud.style.display = 'none';
            this.scene.launch('InGameShopScene');
        });

        createBtn(0, 210, 'TOGGLE GODMODE', () => {
            this.godMode = !this.godMode;
            this.player.setAlpha(this.godMode ? 0.5 : 1);
            this.showBanner(this.godMode ? 'GODMODE ON' : 'GODMODE OFF', '#ff00ff');
        });

        createBtn(0, 270, 'CLOSE', () => {
            // handled in toggleDevMenu
        });
    }
}









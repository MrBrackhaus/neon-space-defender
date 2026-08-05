/**
 * @file BootScene.js
 * @description The initial scene of the Neon Space Defender game. Responsible for loading
 * all game assets (images, spritesheets), setting up the loading bar, creating global
 * animations, and routing the player to the Intro or Menu scene.
 * @module BootScene
 */

import Phaser from 'phaser';

/**
 * @class BootScene
 * @extends Phaser.Scene
 * @description Handles asset preloading, global graphics generation, and animation creation.
 */
export default class BootScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the BootScene with its unique scene key.
     */
    constructor() { 
        super('BootScene'); 
    }

    /**
     * @method preload
     * @description Preloads all visual assets required for the game, including spritesheets,
     * background images, and UI elements. Displays a loading progress bar during the process.
     * @returns {void}
     */
    preload() {
        const cw = this.scale.width, ch = this.scale.height;

        // ─────────────────── UI: LOADING BAR ───────────────────
        
        // Background for the loading bar
        this.add.rectangle(cw/2, ch/2, 420, 18, 0x111122);
        
        // The actual progress bar that fills up
        const bar = this.add.rectangle(cw/2 - 210, ch/2, 0, 14, 0x00ffff).setOrigin(0, 0.5);
        
        // Loading text
        this.add.text(cw/2, ch/2 - 44, 'LOADING...', {
            fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#00ffff',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        
        // Subtitle text
        this.add.text(cw/2, ch/2 + 36, 'NEON ROGUELIKE — VOID ANOMALY', {
            fontFamily: 'Orbitron, monospace', fontSize: '11px', color: '#333366',
            letterSpacing: 4
        }).setOrigin(0.5);

        // Update the loading bar width based on load progress
        this.load.on('progress', v => { bar.width = 420 * v; });

        // Set base URL so assets resolve correctly in both local dev and GitHub Pages environments
        this.load.setBaseURL(import.meta.env.BASE_URL);

        // ─────────────────── ASSET LOADING ───────────────────

        //  Player ships (static top-down render with transparency) 
        this.load.image('ship_standard', 'ship_standard.png?v=6');
        this.load.image('ship_interceptor', 'ship_interceptor.png?v=6');
        this.load.image('ship_dreadnought', 'ship_dreadnought.png?v=6');
        this.load.image('ship_phantom', 'ship_phantom.png?v=6');
        this.load.image('ship_paladin', 'ship_paladin.png?v=6');
        this.load.image('ship_bomber', 'ship_bomber.png?v=6');

        // Sprite sheets for enemies (4 frames each, transparent background)
        const FW = 512, FH = 512;
        this.load.spritesheet('enemy_basic_sheet',   'enemy_basic_sheet.png?v=6',   { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_fast_sheet',    'enemy_fast_sheet.png?v=6',    { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_tank_sheet',    'enemy_tank_sheet.png?v=6',    { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_shooter_sheet', 'enemy_shooter_sheet.png?v=6', { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_elite_sheet',   'enemy_elite_sheet.png?v=6',   { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_boss_sheet',    'enemy_boss_sheet.png?v=6',    { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_phantom_sheet', 'enemy_phantom_sheet.png?v=6', { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_swarmer_sheet', 'enemy_swarmer_sheet.png?v=6', { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_stealth_sheet', 'enemy_stealth_sheet.png?v=6', { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_laser_sheet',   'enemy_laser_sheet.png?v=6',   { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_carrier_sheet', 'enemy_carrier_sheet.png?v=6', { frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_hivemind_sheet','enemy_hivemind_sheet.png?v=6',{ frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_mothership_sheet','enemy_mothership_sheet.png?v=6',{ frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_destroyer_sheet','enemy_destroyer_sheet.png?v=6',{ frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_charger_sheet','enemy_charger_sheet.png?v=6',{ frameWidth: FW, frameHeight: FH });
        this.load.spritesheet('enemy_protector_sheet','enemy_protector_sheet.png?v=6',{ frameWidth: FW, frameHeight: FH });

        // Boss Overhaul Sprites
        this.load.spritesheet('boss_cheese', 'assets/boss_cheese.png?v=5', { frameWidth: 224, frameHeight: 240 });
        this.load.image('boss_cheese_portrait', 'assets/boss_cheese_portrait.png?v=1');
        this.load.image('boss_irs', 'assets/boss_irs.png?v=2');
        this.load.image('boss_vacuum', 'assets/boss_vacuum.png?v=2');

        // Cinematic intro images
        this.load.image('intro_hero',  'intro_hero_anime.jpg?v=6');
        this.load.image('intro_fleet', 'intro_fleet_anime.jpg?v=6');
        this.load.image('intro_ship',  'intro_ship_anime.jpg?v=6');
        this.load.image('intro_sparkles', 'intro_sparkles_anime.jpg?v=6');
        this.load.image('intro_junk', 'intro_junk_anime.jpg?v=6');
        this.load.image('intro_nyx', 'intro_nyx_anime.jpg?v=6');

        // Audio is now fully procedural (Web Audio API in AudioSystem.js). 
        // No external WAV files needed!
        
        // Static images for UI, items, and environment
        this.load.image('jergeric',     'jergeric.jpg?v=6');
        this.load.image('jergeric_cmd', 'jergeric_cmd.jpg?v=6');
        this.load.image('jergeric_sheet', 'jergeric_sheet.jpg?v=6');
        
        // NPC Spritesheets
        this.load.spritesheet('npc_jergeric', 'npc_jergeric_sheet.jpg?v=6', { frameWidth: 344, frameHeight: 768 });
        this.load.spritesheet('npc_sparkles', 'npc_sparkles_sheet.jpg?v=6', { frameWidth: 344, frameHeight: 768 });
        this.load.spritesheet('npc_nyx', 'npc_nyx_sheet.jpg?v=6', { frameWidth: 344, frameHeight: 768 });
        this.load.image('cat',          'cat.jpg?v=6');
        this.load.image('nyx_merchant', 'nyx_merchant.png?v=6');
        this.load.image('scrap_merchant', 'scrap_merchant.png?v=6');
        this.load.image('title_bg',     'title_bg_v3.jpg?v=6');
        this.load.image('mascot_center','mascot_center.png?v=14');
        this.load.image('title_logo',   'title_logo_v2.png?v=7');
        this.load.image('deco_planet',  'deco_planet.jpg?v=6');
        this.load.image('bg',           'bg.jpg?v=6');
        this.load.image('asteroid_1',   'asteroid_1.png?v=6');
        this.load.image('asteroid_2',   'asteroid_2.png?v=6');
        this.load.image('asteroid_3',   'asteroid_3.png?v=6');
        
        // AI Generated Asteroids
        for (let i = 0; i < 9; i++) {
            this.load.image('asteroid_normal_' + i, 'asteroids/normal_' + i + '.png?v=9');
            this.load.image('asteroid_ore_' + i, 'asteroids/ore_' + i + '.png?v=9');
        }
        
        this.load.image('crystal_xp',   'crystal_xp.png?v=6');
        this.load.image('scrap_gear',   'scrap_gear.png?v=6');
        this.load.image('datacube',     'datacube.png?v=6');
        
        // --- TECH ICONS ---
        for (let i = 0; i < 32; i++) {
            this.load.image('tech_weapons_' + i, 'icons/weapon_' + i + '.png');
            this.load.image('tech_defense_' + i, 'icons/defense_' + i + '.png');
        }
        
        // VFX Images for weapons and projectiles
        this.load.image('enemy_projectile', 'enemy_projectile.png?v=6');
        this.load.image('orbital_blade',    'orbital_blade.png?v=6');
        this.load.image('missile_bomb',     'missile_bomb.png?v=6');
        
        // Mascot Pet spritesheet for various states
        this.load.spritesheet('mascot_sheet', 'assets/mascot_sheet.png?v=6', { frameWidth: 117, frameHeight: 103 });
    }

    /**
     * @method create
     * @description Executed after all assets are loaded. Generates procedural textures,
     * creates global animations for all game objects, and handles scene transitions.
     * @returns {void}
     */
    create() {
        // ─────────────────── PROCEDURAL GENERATION ───────────────────
        
        // Procedural Particles (Global glow texture)
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff); 
        g.fillCircle(6,6,6);
        g.generateTexture('p_glow', 12, 12);
        g.destroy();

        // ─────────────────── ANIMATION CREATION ───────────────────

        // (ship_fly no longer needed — player uses static sprite)
        
        // Enemy animations from spritesheets
        this.anims.create({
            key: 'anim_basic',
            frames: this.anims.generateFrameNumbers('enemy_basic_sheet', { start: 0, end: 3 }),
            frameRate: 5, repeat: -1
        });
        this.anims.create({
            key: 'anim_fast',
            frames: this.anims.generateFrameNumbers('enemy_fast_sheet', { start: 0, end: 3 }),
            frameRate: 8, repeat: -1
        });
        this.anims.create({
            key: 'anim_tank',
            frames: this.anims.generateFrameNumbers('enemy_tank_sheet', { start: 0, end: 3 }),
            frameRate: 3, repeat: -1
        });
        this.anims.create({
            key: 'anim_shooter',
            frames: this.anims.generateFrameNumbers('enemy_shooter_sheet', { start: 0, end: 3 }),
            frameRate: 4, repeat: -1
        });
        this.anims.create({
            key: 'anim_elite',
            frames: this.anims.generateFrameNumbers('enemy_elite_sheet', { start: 0, end: 3 }),
            frameRate: 10, repeat: -1  // fast spin for disco ball effect
        });
        this.anims.create({
            key: 'anim_boss',
            frames: this.anims.generateFrameNumbers('enemy_boss_sheet', { start: 0, end: 3 }),
            frameRate: 4, repeat: -1
        });
        this.anims.create({
            key: 'anim_phantom',
            frames: this.anims.generateFrameNumbers('enemy_phantom_sheet', { start: 0, end: 3 }),
            frameRate: 6, repeat: -1
        });
        this.anims.create({
            key: 'anim_swarmer',
            frames: this.anims.generateFrameNumbers('enemy_swarmer_sheet', { start: 0, end: 3 }),
            frameRate: 12, repeat: -1
        });
        this.anims.create({
            key: 'anim_stealth',
            frames: this.anims.generateFrameNumbers('enemy_stealth_sheet', { start: 0, end: 3 }),
            frameRate: 4, repeat: -1
        });
        this.anims.create({
            key: 'anim_laser',
            frames: this.anims.generateFrameNumbers('enemy_laser_sheet', { start: 0, end: 3 }),
            frameRate: 5, repeat: -1
        });
        this.anims.create({
            key: 'anim_carrier',
            frames: this.anims.generateFrameNumbers('enemy_carrier_sheet', { start: 0, end: 3 }),
            frameRate: 3, repeat: -1
        });
        this.anims.create({
            key: 'anim_hivemind',
            frames: this.anims.generateFrameNumbers('enemy_hivemind_sheet', { start: 0, end: 3 }),
            frameRate: 4, repeat: -1
        });
        this.anims.create({
            key: 'anim_mothership',
            frames: this.anims.generateFrameNumbers('enemy_mothership_sheet', { start: 0, end: 3 }),
            frameRate: 3, repeat: -1
        });
        this.anims.create({
            key: 'anim_destroyer',
            frames: this.anims.generateFrameNumbers('enemy_destroyer_sheet', { start: 0, end: 3 }),
            frameRate: 4, repeat: -1
        });
        this.anims.create({
            key: 'anim_charger',
            frames: this.anims.generateFrameNumbers('enemy_charger_sheet', { start: 0, end: 0 }),
            frameRate: 8, repeat: -1
        });
        this.anims.create({
            key: 'anim_protector',
            frames: this.anims.generateFrameNumbers('enemy_protector_sheet', { start: 0, end: 0 }),
            frameRate: 6, repeat: -1
        });

        // Mascot Animations
        this.anims.create({
            key: 'mascot_idle',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 0, end: 6 }),
            frameRate: 8, repeat: -1
        });
        this.anims.create({
            key: 'mascot_dance',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 7, end: 13 }),
            frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: 'mascot_prank',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 14, end: 20 }),
            frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: 'mascot_float',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 21, end: 27 }),
            frameRate: 8, repeat: -1
        });
        this.anims.create({
            key: 'mascot_purr',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 28, end: 34 }),
            frameRate: 8, repeat: -1
        });
        this.anims.create({
            key: 'mascot_neon',
            frames: this.anims.generateFrameNumbers('mascot_sheet', { start: 35, end: 41 }),
            frameRate: 10, repeat: -1
        });

        // NPC Animations
        this.anims.create({ key: 'anim_jergeric', frames: this.anims.generateFrameNumbers('npc_jergeric', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'anim_sparkles', frames: this.anims.generateFrameNumbers('npc_sparkles', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'anim_nyx', frames: this.anims.generateFrameNumbers('npc_nyx', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });

        // ─────────────────── SCENE TRANSITION ───────────────────

        // Check if the player has seen the intro before to skip it if desired
        if (localStorage.getItem('neon_intro_seen')) {
            this.scene.start('MenuScene');
        } else {
            this.scene.start('IntroScene');
        }
    }
}



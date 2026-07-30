/**
 * @file MenuScene.js
 * @description The main menu of the Neon Space Defender game. Sets up the visual background,
 * manages the mascot animation, starts menu music, and wires up HTML-based UI buttons to scene transitions.
 * @module MenuScene
 */

import Phaser from 'phaser';
import AudioSystem from '../systems/AudioSystem.js';
import { getMetaUpgrades } from '../systems/MetaUpgrades.js';

/**
 * @class MenuScene
 * @extends Phaser.Scene
 * @description Handles the main menu logic, HTML DOM button bindings, and transitions to other game scenes.
 */
export default class MenuScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the MenuScene with its unique scene key.
     */
    constructor() { 
        super('MenuScene'); 
    }

    /**
     * @method create
     * @description Prepares the visual layout (background, particles, mascot), initializes audio,
     * displays the highscore, and wires up the DOM-based menu layer.
     * @returns {void}
     */
    create() {
        // ─────────────────── AUDIO SETUP ───────────────────
        
        // Initialize global AudioSystem if it doesn't exist yet
        if (!this.game.audioSys) {
            this.game.audioSys = new AudioSystem(this);
        }
        this.game.audioSys.scene = this;
        this.game.audioSys.playMusic('menu');
        
        const cw = this.scale.width, ch = this.scale.height;

        // ─────────────────── BACKGROUND & VISUALS ───────────────────
        
        // 1. Deep Space Background
        const bg = this.add.image(cw/2, ch/2, 'title_bg').setAlpha(0.85);
        const scaleBg = Math.max(cw / bg.width, ch / bg.height) * 1.05;
        bg.setScale(scaleBg);
        
        // Slow pan effect for the background
        this.tweens.add({
            targets: bg, 
            x: bg.x - 25, y: bg.y + 15,
            duration: 15000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // 2. Deco Planet (Foreground element on the left)
        const planet = this.add.image(cw * 0.2, ch * 0.7, 'deco_planet')
            .setBlendMode(Phaser.BlendModes.SCREEN) // Removes the black background
            .setAlpha(0.8)
            .setScale(0.8);
            
        this.tweens.add({
            targets: planet,
            y: planet.y - 20,
            duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // 3. Title Logo (Graffiti Text on the right)
        const logo = this.add.image(cw * 0.65, ch * 0.4, 'title_logo')
            .setBlendMode(Phaser.BlendModes.ADD) // Additive blending makes the neon text pop against the background
            .setScale(0.75);
            
        // Subtle floating and pulsing for the logo
        this.tweens.add({
            targets: logo,
            y: logo.y - 15,
            scale: 0.77,
            duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Floating dust particles (very calm, sci-fi atmosphere)
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0x00ffff, 1); 
        gfx.fillCircle(2, 2, 2);
        gfx.generateTexture('m_dust', 4, 4); 
        gfx.destroy();

        this.add.particles(0, 0, 'm_dust', {
            x: { min: 0, max: cw }, y: { min: 0, max: ch },
            speedY: { min: -5, max: -15 }, speedX: { min: -5, max: 5 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.3, end: 0 },
            blendMode: 'ADD', lifespan: 6000, frequency: 400
        });

        // ─────────────────── MASCOT RENDERING ───────────────────

        // Pick a random animation for the mascot pet on the main menu
        const mascotAnims = ['mascot_idle', 'mascot_dance', 'mascot_prank', 'mascot_float', 'mascot_purr', 'mascot_neon'];
        const anim = Phaser.Utils.Array.GetRandom(mascotAnims);
        
        const mascot = this.add.sprite(cw - 120, ch - 120, 'mascot_sheet')
            .setScale(1.5)
            .setDepth(5)
            .setBlendMode(Phaser.BlendModes.ADD);
            
        mascot.play(anim);
        
        // Gentle hover effect for the mascot
        this.tweens.add({
            targets: mascot,
            y: '-=20',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ─────────────────── UI LOGIC ───────────────────

        // Load and display highscore in menu from local storage
        const hs = localStorage.getItem('neon_highscore') || '0';
        // Note: hs_wave is loaded but currently not displayed directly on the main menu overlay
        const hs_wave = localStorage.getItem('neon_hs_wave') || '0';

        // Show HTML menu layer
        const menuLayer = document.getElementById('menu-layer');
        if (menuLayer) menuLayer.style.display = 'flex';

        // Update highscore display in HTML if element exists
        const goHs = document.getElementById('menu-highscore');
        if (goHs) goHs.textContent = `BEST: ${parseInt(hs).toLocaleString()}`;

        // Wire up buttons with DOM listeners
        this._wireBtns(menuLayer);

        // Fade in the camera nicely when scene starts
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    /**
     * @method _wireBtns
     * @description Binds click event listeners to the HTML buttons overlaying the canvas.
     * Handles transitions to different scenes. Uses cloneNode to clear out old listeners.
     * @param {HTMLElement} menuLayer - The DOM element containing the menu UI.
     * @private
     * @returns {void}
     */
    _wireBtns(menuLayer) {
        // New Game → transitions directly to ShipSelectScene
        const btnNew = document.getElementById('btn-newgame');
        if (btnNew) {
            // Clone the button to safely remove any previously attached event listeners
            const fresh = btnNew.cloneNode(true);
            btnNew.parentNode.replaceChild(fresh, btnNew);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('ShipSelectScene');
                });
            });
        }

        // Tech Tree → Opens HTML Tech Tree UI defined globally
        const btnTechTree = document.getElementById('btn-techtree');
        if (btnTechTree) {
            const freshTT = btnTechTree.cloneNode(true);
            btnTechTree.parentNode.replaceChild(freshTT, btnTechTree);
            freshTT.addEventListener('click', () => {
                if (window.openTechTree) {
                    window.openTechTree();
                }
            });
        }

        // Shop → transitions to ShopScene
        const btnShop = document.getElementById('btn-shop');
        if (btnShop) {
            const freshShop = btnShop.cloneNode(true);
            btnShop.parentNode.replaceChild(freshShop, btnShop);
            freshShop.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('ShopScene');
                });
            });
        }

        // Achievements → transitions to AchievementScene
        const btnAchievements = document.getElementById('btn-achievements');
        if (btnAchievements) {
            const fresh = btnAchievements.cloneNode(true);
            btnAchievements.parentNode.replaceChild(fresh, btnAchievements);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('AchievementScene');
                });
            });
        }

        // Highscores → transitions to HighscoreScene
        const btnHighscores = document.getElementById('btn-highscores');
        if (btnHighscores) {
            const fresh = btnHighscores.cloneNode(true);
            btnHighscores.parentNode.replaceChild(fresh, btnHighscores);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('HighscoreScene');
                });
            });
        }

        // Story → transitions to IntroScene
        const btnStory = document.getElementById('btn-story');
        if (btnStory) {
            const fresh = btnStory.cloneNode(true);
            btnStory.parentNode.replaceChild(fresh, btnStory);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(600, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('IntroScene');
                });
            });
        }

        // Settings -> transitions to SettingsScene
        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            const fresh = btnSettings.cloneNode(true);
            btnSettings.parentNode.replaceChild(fresh, btnSettings);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('SettingsScene');
                });
            });
        }

        // Credits -> transitions to CreditsScene
        const btnCredits = document.getElementById('btn-credits');
        if (btnCredits) {
            const fresh = btnCredits.cloneNode(true);
            btnCredits.parentNode.replaceChild(fresh, btnCredits);
            fresh.addEventListener('click', () => {
                menuLayer.style.display = 'none';
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('CreditsScene');
                });
            });
        }
    }
}

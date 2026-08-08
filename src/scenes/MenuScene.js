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
        
        // Ensure HUD is hidden when we are in the menu
        const htmlHud = document.getElementById('html-hud');
        if (htmlHud) htmlHud.style.display = 'none';
        
        // Initialize global AudioSystem if it doesn't exist yet
        if (!this.game.audioSys) {
            this.game.audioSys = new AudioSystem(this);
        }
        this.game.audioSys.scene = this;
        this.game.audioSys.playMusic('menu');
        
        const cw = this.scale.width, ch = this.scale.height;
        const isMobile = cw < 768;

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
        const planet = this.add.image(cw * (isMobile ? -0.1 : 0.2), ch * 0.7, 'deco_planet')
            .setBlendMode(Phaser.BlendModes.SCREEN) // Removes the black background
            .setAlpha(0.8)
            .setScale(isMobile ? 0.5 : 0.8);
            
        this.tweens.add({
            targets: planet,
            y: planet.y - 20,
            duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // 3. Title Logo (Graffiti Text on the right)
        const logoScale = isMobile ? 0.45 : 0.75;
        const logo = this.add.image(cw * (isMobile ? 0.5 : 0.65), ch * (isMobile ? 0.15 : 0.4), 'title_logo')
            .setScale(logoScale);
        if(isMobile) logo.setDepth(30);
            
        // Subtle floating and pulsing for the logo
        this.tweens.add({
            targets: logo,
            y: logo.y - 15,
            scale: logoScale * 1.05,
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
        
        // Two cats! One on the right, one mirrored on the left.
        const mascotScale = isMobile ? 0.13 : 0.28;
        const mascotY = ch - (isMobile ? 90 : 160);
        const mascotOffset = isMobile ? 90 : 180;
        
        const mascotRight = this.add.image(cw - mascotOffset, mascotY, 'mascot_center')
            .setScale(mascotScale)
            .setDepth(5);
            
        const mascotLeft = this.add.image(mascotOffset, mascotY, 'mascot_center')
            .setScale(mascotScale)
            .setFlipX(true) // Mirror the cat so it raises the opposite paw
            .setDepth(5);
        
        // Gentle hover effect for both mascots
// Gentle hover effect for both mascots
        this.tweens.add({
            targets: [mascotRight, mascotLeft],
            y: '-=20',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ─────────────────── UI LOGIC ───────────────────

        // Load and display highscore in menu from local storage
        let bestName = 'NONE';
        let bestScore = 0;
        let bestWave = 0;
        try {
            this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10) || 0;
            const hsData = JSON.parse(localStorage.getItem('neon_highscores'));
            if (hsData && hsData.length > 0) {
                bestName = hsData[0].name;
                bestScore = hsData[0].score;
                bestWave = hsData[0].wave;
            }
        } catch (e) { }

        // Show HTML menu layer
        const menuLayer = document.getElementById('menu-layer');
        if (menuLayer) menuLayer.style.display = 'flex';

        // Update highscore display in HTML if element exists
        const goHs = document.getElementById('menu-highscore');
        if (goHs) {
            goHs.textContent = bestScore > 0 
                ? `BEST: ${bestName} - ${parseInt(bestScore).toLocaleString()} (WAVE ${bestWave})` 
                : 'BEST: 0';
        }

        // Wire up buttons with DOM listeners
        this._wireBtns(menuLayer);
        // Unlock WebAudio on first click anywhere
        const unlockAudio = () => {
            if (this.game.audioSys && this.game.audioSys.ctx.state === 'suspended') {
                this.game.audioSys.ctx.resume();
            }
            document.removeEventListener('click', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        this.events.once('shutdown', () => document.removeEventListener('click', unlockAudio));


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
        const buttons = [
            { id: 'btn-newgame', scene: 'ShipSelectScene' },
            { id: 'btn-techtree', scene: 'TechTreeScene' },
            { id: 'btn-shop', scene: 'ShopScene' },
            { id: 'btn-achievements', scene: 'AchievementScene' },
            { id: 'btn-highscores', scene: 'HighscoreScene' },
            { id: 'btn-story', scene: 'IntroScene', fade: 600 },
            { id: 'btn-settings', scene: 'SettingsScene' },
            { id: 'btn-credits', scene: 'CreditsScene' }
        ];

        // 1. Generic Scene Transition Buttons
        buttons.forEach(b => {
            const btn = document.getElementById(b.id);
            if (btn) {
                const fresh = btn.cloneNode(true);
                btn.parentNode.replaceChild(fresh, btn);
                
                fresh.addEventListener('mouseenter', () => {
                    if (this.game.audioSys) this.game.audioSys.playHover();
                });
                
                fresh.addEventListener('click', () => {
                    if (this.game.audioSys) this.game.audioSys.playClick();
                    menuLayer.style.display = 'none';
                    this.cameras.main.fadeOut(b.fade || 500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.start(b.scene);
                    });
                });
            }
        });
    }
}

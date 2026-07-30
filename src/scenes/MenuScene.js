import Phaser from 'phaser';
import AudioSystem from '../systems/AudioSystem.js';
import { getMetaUpgrades } from '../systems/MetaUpgrades.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        if (!this.game.audioSys) {
            this.game.audioSys = new AudioSystem(this);
        }
        this.game.audioSys.scene = this;
        this.game.audioSys.playMusic('menu');
        
        const cw = this.scale.width, ch = this.scale.height;

        // Subtle background with slow pan
        const bg = this.add.image(cw/2, ch/2, 'bg')
            .setDisplaySize(cw * 1.08, ch * 1.08)
            .setAlpha(0.18);
        this.tweens.add({
            targets: bg, x: cw/2 + 20, duration: 22000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Floating dust particles (very calm)
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0x00ffff, 1); gfx.fillCircle(2, 2, 2);
        gfx.generateTexture('m_dust', 4, 4); gfx.destroy();

        this.add.particles(0, 0, 'm_dust', {
            x: { min: 0, max: cw }, y: { min: 0, max: ch },
            speedY: { min: -5, max: -15 }, speedX: { min: -5, max: 5 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.3, end: 0 },
            blendMode: 'ADD', lifespan: 6000, frequency: 400
        });

        // Mascot Pet on Menu
        const mascotAnims = ['mascot_idle', 'mascot_dance', 'mascot_prank', 'mascot_float', 'mascot_purr', 'mascot_neon'];
        const anim = Phaser.Utils.Array.GetRandom(mascotAnims);
        const mascot = this.add.sprite(cw - 120, ch - 120, 'mascot_sheet')
            .setScale(1.5)
            .setDepth(5)
            .setBlendMode(Phaser.BlendModes.ADD);
        mascot.play(anim);
        this.tweens.add({
            targets: mascot,
            y: '-=20',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Load and display highscore in menu
        const hs = localStorage.getItem('neon_highscore') || '0';
        const hs_wave = localStorage.getItem('neon_hs_wave') || '0';

        // Show HTML menu layer
        const menuLayer = document.getElementById('menu-layer');
        if (menuLayer) menuLayer.style.display = 'flex';

        // Update highscore display in HTML if element exists
        const goHs = document.getElementById('menu-highscore');
        if (goHs) goHs.textContent = `BEST: ${parseInt(hs).toLocaleString()}`;

        // Wire up buttons
        this._wireBtns(menuLayer);

        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    _wireBtns(menuLayer) {
        // New Game → directly to ShipSelectScene
        const btnNew = document.getElementById('btn-newgame');
        if (btnNew) {
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

        // Tech Tree
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

        // Shop
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

        // Achievements
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

        // Highscores
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

        // Story → IntroScene
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

        // Settings -> SettingsScene
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

        // Credits -> CreditsScene
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

/**
 * @file AchievementScene.js
 * @description Renders a grid-based achievements menu displaying unlocked and locked trophies.
 * Connects to the global AchievementSystem to check the player's progress.
 * @module AchievementScene
 */

import Phaser from 'phaser';
import AchievementSystem from '../systems/AchievementSystem.js';

/**
 * @class AchievementScene
 * @extends Phaser.Scene
 * @description Manages the layout and rendering of all game achievements in a dynamic grid,
 * applying visual styles based on their unlock status.
 */
export default class AchievementScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the AchievementScene with its unique scene key.
     */
    constructor() {
        super('AchievementScene');
    }

    /**
     * @method create
     * @description Constructs the scene by rendering a cyberpunk background grid, fetching data 
     * from the AchievementSystem, generating the achievement cards layout dynamically, 
     * and binding interactivity for the back button.
     * @returns {void}
     */
    create() {
        const cw = this.scale.width;
        const ch = this.scale.height;

        // ─────────────────── BACKGROUND ───────────────────
        
        // Deep space / dark cyberpunk background base
        this.add.rectangle(0, 0, cw, ch, 0x02020e).setOrigin(0, 0);
        
        // Synthwave-style perspective grid overlay
        this.add.grid(cw/2, ch/2, cw, ch, 64, 64, 0x000000, 0, 0xff00ff, 0.05);

        // ─────────────────── TITLE ───────────────────
        
        // Arcane/Cyberpunk Glowing Title at the top
        this.add.text(cw/2, 80, 'ACHIEVEMENTS', {
            fontFamily: 'Orbitron',
            fontSize: '48px',
            fontStyle: '900',
            color: '#fff',
            shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 25, stroke: true, fill: true }
        }).setOrigin(0.5);

        // ─────────────────── ACHIEVEMENT DATA ───────────────────
        
        // Instantiate the logic system to get current state of all achievements
        const sys = new AchievementSystem();
        const achievements = sys.getAll();

        // ─────────────────── GRID LAYOUT CALCULATION ───────────────────
        
        const startY = 180;
        const spacing = 110;
        // Determine column width based on available screen space
        const colWidth = cw > 900 ? 400 : 320;
        
        let cols = Math.floor(cw / colWidth);
        if (cols < 1) cols = 1; // Ensure at least 1 column on very narrow screens
        
        // Center the entire grid block horizontally
        const startX = (cw - (cols * colWidth)) / 2 + colWidth / 2;

        // ─────────────────── RENDER ACHIEVEMENT CARDS ───────────────────
        
        achievements.forEach((ach, index) => {
            // Calculate grid position (row, col)
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            // Absolute pixel coordinates for the center of this card
            const x = startX + col * colWidth;
            const y = startY + row * spacing;

            const bg = this.add.graphics();
            const w = colWidth - 40;
            const h = 90;
            const rx = x - w / 2;
            const ry = y - h / 2;
            
            if (ach.unlocked) {
                // Style for UNLOCKED achievements: bright neon cyan glow
                bg.lineStyle(3, 0x00ffff, 1);
                bg.fillStyle(0x00ffff, 0.1);
                bg.strokeRoundedRect(rx, ry, w, h, 12);
                bg.fillRoundedRect(rx, ry, w, h, 12);
                
                // Show actual title
                this.add.text(x, y - 15, ach.name, {
                    fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 'bold', color: '#00ffff',
                    shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
                }).setOrigin(0.5);

                // Show actual description
                this.add.text(x, y + 15, ach.desc, {
                    fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#ffffff'
                }).setOrigin(0.5);
            } else {
                // Style for LOCKED achievements: muted, grayed out outline
                bg.lineStyle(2, 0x333333, 1);
                bg.fillStyle(0x111111, 0.8);
                bg.strokeRoundedRect(rx, ry, w, h, 12);
                bg.fillRoundedRect(rx, ry, w, h, 12);
                
                // Obscure the title
                this.add.text(x, y - 15, '???', {
                    fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 'bold', color: '#555555'
                }).setOrigin(0.5);

                // Obscure the description
                this.add.text(x, y + 15, 'Locked', {
                    fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#444444'
                }).setOrigin(0.5);
            }
        });

        // ─────────────────── BACK BUTTON ───────────────────
        
        // Shiny Back Button allowing the user to return to the main menu
        const backBtn = this.add.text(cw/2, ch - 80, 'BACK TO MENU', {
            fontFamily: 'Orbitron', fontSize: '24px', fontStyle: '900', color: '#fff'
        }).setOrigin(0.5).setInteractive();

        // Hover visual effects (turns magenta and gets a glow)
        backBtn.on('pointerover', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playHover();
            backBtn.setColor('#ff00ff');
            backBtn.setShadow(0, 0, '#ff00ff', 20, true, true);
            this.input.setDefaultCursor('pointer');
        });

        // Return to standard state
        backBtn.on('pointerout', () => {
            backBtn.setColor('#fff');
            backBtn.setShadow(0, 0, 'rgba(0,0,0,0)', 0, false, false);
            this.input.setDefaultCursor('default');
        });

        // On click transition logic
        backBtn.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
            this.input.setDefaultCursor('default');
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        // Smooth entry fade
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
}

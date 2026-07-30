/**
 * @file HighscoreScene.js
 * @description Displays the "Hall of Fame" leaderboard for the Neon Space Defender game.
 * Reads saved highscores from localStorage and renders them in a formatted table layout.
 * @module HighscoreScene
 */

import Phaser from 'phaser';

/**
 * @class HighscoreScene
 * @extends Phaser.Scene
 * @description Renders a screen showing the top players, their scores, survived waves, and the ship they used.
 */
export default class HighscoreScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the HighscoreScene with its unique scene key.
     */
    constructor() {
        super({ key: 'HighscoreScene' });
    }

    /**
     * @method create
     * @description Constructs the UI layout, loads highscore data from local storage,
     * builds the data table, and wires the back button.
     * @returns {void}
     */
    create() {
        const { width: cw, height: ch } = this.scale;

        // ─────────────────── BACKGROUND ───────────────────
        
        // Setup background image with a subtle tint for atmosphere
        this.add.image(cw/2, ch/2, 'bg')
            .setDisplaySize(cw * 1.05, ch * 1.05)
            .setAlpha(0.3)
            .setTint(0x00ffff);

        // Container to hold all the text elements centrally
        const container = this.add.container(cw / 2, 100);

        // ─────────────────── TITLE ───────────────────
        
        const mainTitle = this.add.text(0, 0, 'HALL OF FAME', {
            fontFamily: 'Orbitron', fontSize: '64px', color: '#00ffff', fontStyle: 'bold', 
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 20, fill: true }
        }).setOrigin(0.5);
        container.add(mainTitle);

        // ─────────────────── LOAD DATA ───────────────────
        
        let highscores = [];
        try {
            // Retrieve and parse highscores from localStorage
            highscores = JSON.parse(localStorage.getItem('neon_highscores')) || [];
        } catch (e) {
            // Fallback in case of corrupted JSON
            highscores = [];
        }

        let currentY = 120;

        // Typography styles for table headers and entry rows
        const headerStyle = { fontFamily: 'Orbitron', fontSize: '24px', color: '#ffaa00', fontStyle: 'bold' };
        const entryStyle = { fontFamily: 'Share Tech Mono', fontSize: '28px', color: '#ffffff' };

        // X-offsets for table columns relative to the center
        const cols = { rank: -400, name: -250, score: 50, wave: 250, ship: 400 };

        // ─────────────────── BUILD TABLE ───────────────────

        if (highscores.length > 0) {
            // Draw table headers
            container.add([
                this.add.text(cols.rank, currentY, 'RANK', headerStyle).setOrigin(0.5),
                this.add.text(cols.name, currentY, 'PILOT', headerStyle).setOrigin(0.5),
                this.add.text(cols.score, currentY, 'SCORE', headerStyle).setOrigin(0.5),
                this.add.text(cols.wave, currentY, 'WAVE', headerStyle).setOrigin(0.5),
                this.add.text(cols.ship, currentY, 'SHIP', headerStyle).setOrigin(0.5)
            ]);
            currentY += 60;

            // Iterate and draw each highscore entry
            highscores.forEach((entry, i) => {
                let color = '#ffffff';
                
                // Color coding for top 3 ranks
                if (i === 0) color = '#ffff00';      // Gold
                else if (i === 1) color = '#cccccc'; // Silver
                else if (i === 2) color = '#cd7f32'; // Bronze

                const style = { ...entryStyle, color: color, shadow: { offsetX: 0, offsetY: 0, color: color, blur: 5, fill: true } };

                container.add([
                    this.add.text(cols.rank, currentY, `#${i + 1}`, style).setOrigin(0.5),
                    this.add.text(cols.name, currentY, entry.name || 'UNKNOWN', style).setOrigin(0.5),
                    this.add.text(cols.score, currentY, entry.score.toLocaleString(), style).setOrigin(0.5),
                    this.add.text(cols.wave, currentY, entry.wave ? entry.wave.toString() : '-', style).setOrigin(0.5),
                    this.add.text(cols.ship, currentY, entry.ship || 'BASIC', style).setOrigin(0.5)
                ]);
                currentY += 50; // Increment Y for the next row
            });
        } else {
            // Displayed when no scores exist yet
            const noData = this.add.text(0, currentY + 100, 'NO RECORDS FOUND.\nGO MAKE HISTORY!', {
                fontFamily: 'Orbitron', fontSize: '32px', color: '#ff0044', align: 'center', 
                shadow: { offsetX: 0, offsetY: 0, color: '#ff0044', blur: 15, fill: true }
            }).setOrigin(0.5);
            container.add(noData);
        }

        // ─────────────────── NAVIGATION ───────────────────

        const btnStyle = {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#fff', blur: 10, fill: true }
        };

        // Back button to return to MenuScene
        const backBtn = this.add.text(40, 40, '◀ MAIN MENU', btnStyle)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backBtn.setTint(0x00ffff))
            .on('pointerout', () => backBtn.clearTint())
            .on('pointerdown', () => this._goBack());

        // Initial fade-in for smooth transition
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    /**
     * @method _goBack
     * @description Handles transitioning back to the main MenuScene with a fade out effect.
     * Includes a guard flag to prevent multiple clicks during transition.
     * @private
     * @returns {void}
     */
    _goBack() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}

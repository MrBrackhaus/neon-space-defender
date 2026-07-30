import Phaser from 'phaser';

/**
 * @file SettingsScene.js
 * @description Implements the configuration menu where players can adjust system
 * settings such as Music Volume, SFX Volume, and Screen Shake toggle. Changes
 * are instantly saved to localStorage and can dynamically update active game instances.
 * @module scenes/SettingsScene
 */

/**
 * @class SettingsScene
 * @extends Phaser.Scene
 * @description Handles the visualization and interaction logic for the game's settings menu.
 */
export default class SettingsScene extends Phaser.Scene {
    
    /**
     * @constructor
     * @description Initializes the scene with the key 'SettingsScene'.
     */
    constructor() {
        super({ key: 'SettingsScene' });
    }

    // ─────────────────── LIFECYCLE METHODS ───────────────────

    /**
     * @method create
     * @description Constructs the UI for the settings scene, loads saved configurations
     * from local storage, and binds interactive elements to adjust and persist those settings.
     */
    create() {
        const { width: cw, height: ch } = this.scale;

        // --- CYBERPUNK BACKGROUND ---
        // Dark, semi-transparent base layer
        this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x050510, 0.95);

        // Decorative background elements (grid/scanlines) for the tech aesthetic
        const bgGraphics = this.add.graphics();
        bgGraphics.lineStyle(1, 0x00ffff, 0.05);
        for (let i = 0; i < cw; i += 40) bgGraphics.moveTo(i, 0).lineTo(i, ch);
        for (let j = 0; j < ch; j += 40) bgGraphics.moveTo(0, j).lineTo(cw, j);
        bgGraphics.strokePath();

        // Glowing central panel to contain the settings
        const panelWidth = Math.min(cw * 0.8, 800);
        const panelHeight = Math.min(ch * 0.8, 600);
        this.add.rectangle(cw / 2, ch / 2, panelWidth, panelHeight, 0x0a0a1a, 0.85)
            .setStrokeStyle(3, 0x00ffff, 0.4);
        
        // Inner magenta border
        this.add.rectangle(cw / 2, ch / 2, panelWidth - 16, panelHeight - 16, 0x000000, 0)
            .setStrokeStyle(1, 0xff00ff, 0.3);

        // --- TITLE ---
        this.add.text(cw / 2, ch / 2 - panelHeight / 2 + 50, 'SYSTEM CONFIG', {
            fontFamily: 'Orbitron',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        // Subtitle flavor text
        this.add.text(cw / 2, ch / 2 - panelHeight / 2 + 90, '- OVERRIDE PROTOCOLS ACTIVE -', {
            fontFamily: 'Orbitron',
            fontSize: '14px',
            color: '#ff00ff'
        }).setOrigin(0.5).setAlpha(0.8);

        // --- LOAD SETTINGS ---
        // Retrieve saved settings or apply defaults
        let volMusic = parseFloat(localStorage.getItem('neon_vol_music') ?? '0.5');
        let volSfx = parseFloat(localStorage.getItem('neon_vol_sfx') ?? '0.8');
        let shakeOn = (localStorage.getItem('neon_shake') ?? 'true') === 'true';

        // ─────────────────── UI HELPERS ───────────────────

        /**
         * @function createSettingRow
         * @description Generates an interactive row for adjusting numeric settings via left/right arrows.
         * @param {number} y - The Y coordinate of the row.
         * @param {string} labelText - The descriptive label for the setting.
         * @param {string} initialValue - The formatted initial value to display.
         * @param {number} colorHex - The hex color code for interactive elements.
         * @param {string} colorStr - The string color code for text elements.
         * @param {function} onLeft - Callback invoked when the left arrow is clicked.
         * @param {function} onRight - Callback invoked when the right arrow is clicked.
         */
        const createSettingRow = (y, labelText, initialValue, colorHex, colorStr, onLeft, onRight) => {
            // Setting label
            this.add.text(cw / 2 - 200, y, labelText, {
                fontFamily: 'Orbitron', fontSize: '24px', color: '#ffffff',
                shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 8, fill: true }
            }).setOrigin(0, 0.5);

            // Display of current value
            const valDisplay = this.add.text(cw / 2 + 80, y, initialValue, {
                fontFamily: 'Orbitron', fontSize: '24px', color: colorStr,
                shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 8, fill: true }
            }).setOrigin(0.5);

            // Left arrow (Decrement)
            const btnLeft = this.add.text(cw / 2 - 20, y, '◀', { fontFamily: 'Orbitron', fontSize: '28px', color: colorStr })
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            btnLeft.on('pointerover', () => btnLeft.setScale(1.2).setTint(0xffffff));
            btnLeft.on('pointerout', () => btnLeft.setScale(1).clearTint());
            btnLeft.on('pointerdown', () => onLeft(valDisplay));

            // Right arrow (Increment)
            const btnRight = this.add.text(cw / 2 + 180, y, '▶', { fontFamily: 'Orbitron', fontSize: '28px', color: colorStr })
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            btnRight.on('pointerover', () => btnRight.setScale(1.2).setTint(0xffffff));
            btnRight.on('pointerout', () => btnRight.setScale(1).clearTint());
            btnRight.on('pointerdown', () => onRight(valDisplay));
        };

        /**
         * @function createToggleRow
         * @description Generates an interactive row for toggling boolean settings (e.g., ENABLED/DISABLED).
         * @param {number} y - The Y coordinate of the row.
         * @param {string} labelText - The descriptive label for the setting.
         * @param {string} initialValue - The initial string value (e.g. 'ENABLED').
         * @param {number} colorHex - The hex color code for borders.
         * @param {string} colorStr - The string color code for text elements.
         * @param {function} onToggle - Callback invoked when the toggle area is clicked.
         */
        const createToggleRow = (y, labelText, initialValue, colorHex, colorStr, onToggle) => {
            this.add.text(cw / 2 - 200, y, labelText, {
                fontFamily: 'Orbitron', fontSize: '24px', color: '#ffffff',
                shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 8, fill: true }
            }).setOrigin(0, 0.5);

            // Interactive clickable background block
            const toggleBg = this.add.rectangle(cw / 2 + 80, y, 160, 40, 0x000000, 0.6)
                .setStrokeStyle(2, colorHex, 0.8)
                .setInteractive({ useHandCursor: true });

            const valDisplay = this.add.text(cw / 2 + 80, y, initialValue, {
                fontFamily: 'Orbitron', fontSize: '22px', color: colorStr,
                shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 8, fill: true }
            }).setOrigin(0.5);

            // Hover and click logic
            toggleBg.on('pointerover', () => { toggleBg.fillAlpha = 0.3; toggleBg.fillColor = colorHex; valDisplay.setScale(1.1); });
            toggleBg.on('pointerout', () => { toggleBg.fillAlpha = 0.6; toggleBg.fillColor = 0x000000; valDisplay.setScale(1); });
            toggleBg.on('pointerdown', () => onToggle(valDisplay));
        };

        /**
         * @function createNeonButton
         * @description Generates a wide, styled button used for main actions like returning to the menu.
         */
        const createNeonButton = (x, y, text, colorHex, colorStr, callback) => {
            const btnBg = this.add.rectangle(x, y, 260, 50, 0x000000, 0.6)
                .setStrokeStyle(2, colorHex, 0.8)
                .setInteractive({ useHandCursor: true });

            const btnText = this.add.text(x, y, text, {
                fontFamily: 'Orbitron', fontSize: '22px', color: colorStr,
                shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 5, fill: true }
            }).setOrigin(0.5);

            btnBg.on('pointerover', () => {
                btnBg.setStrokeStyle(2, 0xffffff, 1);
                btnBg.fillColor = colorHex;
                btnBg.fillAlpha = 0.2;
                btnText.setTint(0xffffff).setScale(1.05);
            });
            btnBg.on('pointerout', () => {
                btnBg.setStrokeStyle(2, colorHex, 0.8);
                btnBg.fillColor = 0x000000;
                btnBg.fillAlpha = 0.6;
                btnText.clearTint().setScale(1);
            });
            btnBg.on('pointerdown', () => { btnBg.fillAlpha = 0.4; callback(); });
            btnBg.on('pointerup', () => { btnBg.fillAlpha = 0.2; });
        };

        // ─────────────────── SETTING IMPLEMENTATIONS ───────────────────

        // ── MUSIC VOLUME ──
        createSettingRow(ch / 2 - 80, 'MUSIC VOLUME', `${Math.round(volMusic * 100)}%`, 0x00ffff, '#00ffff', 
            (display) => {
                // Decrement logic: Ensure value doesn't drop below 0
                volMusic = Phaser.Math.Clamp(volMusic - 0.1, 0, 1);
                localStorage.setItem('neon_vol_music', volMusic.toString());
                display.setText(`${Math.round(volMusic * 100)}%`);
                // Dynamically update audio system if GameScene is running
                if (this.scene.get('GameScene') && this.scene.get('GameScene').audioSys) {
                    this.scene.get('GameScene').audioSys.updateVolumes();
                }
            },
            (display) => {
                // Increment logic: Ensure value doesn't exceed 1 (100%)
                volMusic = Phaser.Math.Clamp(volMusic + 0.1, 0, 1);
                localStorage.setItem('neon_vol_music', volMusic.toString());
                display.setText(`${Math.round(volMusic * 100)}%`);
                if (this.scene.get('GameScene') && this.scene.get('GameScene').audioSys) {
                    this.scene.get('GameScene').audioSys.updateVolumes();
                }
            }
        );

        // ── SFX VOLUME ──
        createSettingRow(ch / 2, 'SFX VOLUME', `${Math.round(volSfx * 100)}%`, 0xff00ff, '#ff00ff', 
            (display) => {
                volSfx = Phaser.Math.Clamp(volSfx - 0.1, 0, 1);
                localStorage.setItem('neon_vol_sfx', volSfx.toString());
                display.setText(`${Math.round(volSfx * 100)}%`);
                if (this.scene.get('GameScene') && this.scene.get('GameScene').audioSys) {
                    this.scene.get('GameScene').audioSys.updateVolumes();
                }
            },
            (display) => {
                volSfx = Phaser.Math.Clamp(volSfx + 0.1, 0, 1);
                localStorage.setItem('neon_vol_sfx', volSfx.toString());
                display.setText(`${Math.round(volSfx * 100)}%`);
                if (this.scene.get('GameScene') && this.scene.get('GameScene').audioSys) {
                    this.scene.get('GameScene').audioSys.updateVolumes();
                }
            }
        );

        // ── SCREEN SHAKE ──
        createToggleRow(ch / 2 + 80, 'SCREEN SHAKE', shakeOn ? 'ENABLED' : 'DISABLED', 0xffff00, '#ffff00', 
            (display) => {
                // Invert current boolean state and persist
                shakeOn = !shakeOn;
                localStorage.setItem('neon_shake', shakeOn ? 'true' : 'false');
                display.setText(shakeOn ? 'ENABLED' : 'DISABLED');
            }
        );

        // ── BACK BUTTON ──
        createNeonButton(cw / 2, ch / 2 + panelHeight / 2 - 60, 'RETURN TO MAIN', 0x00ffff, '#00ffff', () => {
            // Fade out the scene cleanly before transitioning back to the menu
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        // Initialize scene with a fade-in effect
        this.cameras.main.fadeIn(300, 0, 0, 0);
    }
}

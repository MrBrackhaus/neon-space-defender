import Phaser from 'phaser';

/**
 * @file PauseScene.js
 * @description Implements the game's pause menu overlay. It handles dimming the screen,
 * switching to pause music, and providing options to resume the game, adjust settings,
 * or quit to the main menu.
 * @module scenes/PauseScene
 */

/**
 * @class PauseScene
 * @extends Phaser.Scene
 * @description A lightweight UI scene designed to run on top of an active GameScene.
 * It manages execution flow, input intercepts (ESC key), and audio state transitions.
 */
export default class PauseScene extends Phaser.Scene {
    
    /**
     * @constructor
     * @description Initializes the scene with the key 'PauseScene'.
     */
    constructor() {
        super({ key: 'PauseScene' });
    }

    // ─────────────────── LIFECYCLE METHODS ───────────────────

    /**
     * @method create
     * @description Sets up the overlay visuals, intercepts input to allow resuming,
     * switches audio contexts, and creates interactive menu buttons.
     */
    create() {
        const { width: cw, height: ch } = this.scale;

        // Remember the currently playing track so we can restore it when resuming.
        // Default to 'std_1' if no track is registered (fallback).
        this.previousTrack = this.game.audioSys ? this.game.audioSys.currentTrack : 'std_1';
        
        // Switch to the dedicated pause menu music track
        if (this.game.audioSys) {
            this.game.audioSys.playMusic('pause');
        }

        // Dim the background to obscure but not completely hide the GameScene underneath
        this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x000000, 0.7);

        // Render the main "PAUSED" title
        this.add.text(cw / 2, ch * 0.2, 'PAUSED', {
            fontFamily: 'Orbitron',
            fontSize: '64px',
            color: '#0ff',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#0ff', blur: 20, fill: true }
        }).setOrigin(0.5);

        /**
         * @constant {Object} btnStyle
         * @description Base text styling configuration applied to all pause menu buttons.
         */
        const btnStyle = {
            fontFamily: 'Orbitron', fontSize: '32px', color: '#fff',
            stroke: '#000', strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#fff', blur: 10, fill: true }
        };

        /**
         * @function createButton
         * @description Helper function to instantiate standardized, interactive text buttons.
         * @param {number} y - The vertical Y position for the button.
         * @param {string} text - The display text of the button.
         * @param {function} callback - The callback executed upon clicking the button.
         * @returns {Phaser.GameObjects.Text} The created text button object.
         */
        const createButton = (y, text, callback) => {
            const btn = this.add.text(cw / 2, y, text, btnStyle)
                .setOrigin(0.5).setInteractive({ useHandCursor: true })
                .on('pointerover', () => { btn.setTint(0xff00ff); if(this.game.audioSys) this.game.audioSys.playHover(); })
                .on('pointerout', () => btn.clearTint())
                .on('pointerdown', () => { if(this.game.audioSys) this.game.audioSys.playClick(); callback(); });
            return btn;
        };

        /**
         * @function resumeGame
         * @description Routine to handle transitioning back to the active gameplay.
         * Restores audio and tells the Phaser Scene Manager to resume the GameScene.
         */
        const resumeGame = () => {
            if (this.game.audioSys) {
                // Restore the original combat/background music
                this.game.audioSys.playMusic(this.previousTrack);
            }
            this.scene.resume('GameScene');
            this.scene.stop();
        };

        // Instantiate Resume button
        createButton(ch * 0.4, 'RESUME', resumeGame);

        // Allow players to resume the game quickly using the Escape key
        this.input.keyboard.on('keydown-ESC', resumeGame);

        // Instantiate Settings button
        createButton(ch * 0.6, 'SETTINGS', () => {
            // Note: Launching SettingsScene here halts the game entirely.
            // If the player goes to Settings, the current run is abandoned, as 
            // returning from settings defaults to the main menu.
            this.scene.stop('GameScene');
            this.scene.stop();
            this.scene.start('SettingsScene');
        });

        // Instantiate Quit button
        createButton(ch * 0.8, 'QUIT TO MENU', () => {
            // Terminate the active game session and return to the main menu
            this.scene.stop('GameScene');
            this.scene.stop();
            this.scene.start('MenuScene');
        });
    }
}

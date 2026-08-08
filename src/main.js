/**
 * @file main.js
 * @description Main entry point for the Neon Space Defender Phaser game.
 * Initializes the Phaser Game instance, configures the engine, and registers all game scenes.
 */

import Phaser from 'phaser';

// Import all scenes
import BootScene from './scenes/BootScene.js';
import IntroScene from './scenes/IntroScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import PauseScene from './scenes/PauseScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import ShipSelectScene from './scenes/ShipSelectScene.js';
import InGameShopScene from './scenes/InGameShopScene.js';
import AchievementScene from './scenes/AchievementScene.js';
import HighscoreScene from './scenes/HighscoreScene.js';
import TechTreeScene from './scenes/TechTreeScene.js';

/**
 * @constant {Phaser.Types.Core.GameConfig} config
 * @description The core configuration object for the Phaser engine.
 */
const config = {
    type: Phaser.WEBGL, // Force WebGL for best performance
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container', // The DOM element ID to mount the game canvas
    backgroundColor: '#05050f', // Deep dark space background color
    render: {
        antialias: false,        // Disable anti-aliasing for pixel-perfect sprites & perf
        roundPixels: true,       // Snap to whole pixels to avoid sub-pixel rendering cost
        powerPreference: 'high-performance', // Request discrete GPU on dual-GPU systems
        batchSize: 4096,         // Larger batch = fewer draw calls for sprite-heavy scenes
        maxLights: 0             // We don't use Phaser's light pipeline
    },
    fps: {
        target: 60,
        forceSetTimeOut: false   // Use rAF, not setTimeout
    },
    physics: {
        default: 'arcade',
        arcade: { 
            debug: false, // Set to true to see hitboxes for debugging
            fps: 60,
            tileBias: 16
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE, // Automatically resize the canvas when window changes
        autoCenter: Phaser.Scale.CENTER_BOTH // Keep canvas centered
    },
    input: {
        gamepad: true // Enable gamepad support globally
    },
    banner: false, // Suppress Phaser boot banner in console
    // Array of scenes, ordered such that BootScene starts first
    scene: [
        BootScene, 
        IntroScene, 
        MenuScene, 
        HighscoreScene, 
        ShipSelectScene, 
        ShopScene, 
        GameScene, 
        InGameShopScene, 
        PauseScene, 
        SettingsScene, 
        CreditsScene, 
        AchievementScene,
        TechTreeScene
    ]
};

// Initialize the Phaser game instance
const game = new Phaser.Game(config);

// Bind game instance to the global window object for easy debugging and external access
window._phaserGame = game;

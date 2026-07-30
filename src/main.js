import Phaser from 'phaser';
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

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#05050f',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true
    },
    scene: [BootScene, IntroScene, MenuScene, HighscoreScene, ShipSelectScene, ShopScene, GameScene, InGameShopScene, PauseScene, SettingsScene, CreditsScene, AchievementScene]
};

const game = new Phaser.Game(config);

import Phaser from 'phaser';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        const { width: cw, height: ch } = this.scale;

        this.previousTrack = this.game.audioSys ? this.game.audioSys.currentTrack : 'std_1';
        if (this.game.audioSys) {
            this.game.audioSys.playMusic('pause');
        }

        // Dim the background
        this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x000000, 0.7);

        // PAUSED title
        this.add.text(cw / 2, ch * 0.2, 'PAUSED', {
            fontFamily: 'Orbitron',
            fontSize: '64px',
            color: '#0ff',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#0ff', blur: 20, fill: true }
        }).setOrigin(0.5);

        const btnStyle = {
            fontFamily: 'Orbitron', fontSize: '32px', color: '#fff',
            stroke: '#000', strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#fff', blur: 10, fill: true }
        };

        const createButton = (y, text, callback) => {
            const btn = this.add.text(cw / 2, y, text, btnStyle)
                .setOrigin(0.5).setInteractive({ useHandCursor: true })
                .on('pointerover', () => btn.setTint(0xff00ff))
                .on('pointerout', () => btn.clearTint())
                .on('pointerdown', callback);
            return btn;
        };

        const resumeGame = () => {
            if (this.game.audioSys) {
                this.game.audioSys.playMusic(this.previousTrack);
            }
            this.scene.resume('GameScene');
            this.scene.stop();
        };

        createButton(ch * 0.4, 'RESUME', resumeGame);

        this.input.keyboard.on('keydown-ESC', resumeGame);

        createButton(ch * 0.6, 'SETTINGS', () => {
            // Note: SettingsScene could be launched here, but we will simplify
            // the menu structure. We already have settings in the main menu.
            this.scene.stop('GameScene');
            this.scene.stop();
            this.scene.start('SettingsScene');
        });

        createButton(ch * 0.8, 'QUIT TO MENU', () => {
            this.scene.stop('GameScene');
            this.scene.stop();
            this.scene.start('MenuScene');
        });
    }
}

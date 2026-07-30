import Phaser from 'phaser';

export default class HighscoreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HighscoreScene' });
    }

    create() {
        const { width: cw, height: ch } = this.scale;

        // Background
        this.add.image(cw/2, ch/2, 'bg')
            .setDisplaySize(cw * 1.05, ch * 1.05)
            .setAlpha(0.3)
            .setTint(0x00ffff);

        const container = this.add.container(cw / 2, 100);

        // Title
        const mainTitle = this.add.text(0, 0, 'HALL OF FAME', {
            fontFamily: 'Orbitron', fontSize: '64px', color: '#00ffff', fontStyle: 'bold', shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 20, fill: true }
        }).setOrigin(0.5);
        container.add(mainTitle);

        // Load Highscores
        let highscores = [];
        try {
            highscores = JSON.parse(localStorage.getItem('neon_highscores')) || [];
        } catch (e) {
            highscores = [];
        }

        let currentY = 120;

        const headerStyle = { fontFamily: 'Orbitron', fontSize: '24px', color: '#ffaa00', fontStyle: 'bold' };
        const entryStyle = { fontFamily: 'Share Tech Mono', fontSize: '28px', color: '#ffffff' };

        // Headers
        const cols = { rank: -400, name: -250, score: 50, wave: 250, ship: 400 };

        if (highscores.length > 0) {
            container.add([
                this.add.text(cols.rank, currentY, 'RANK', headerStyle).setOrigin(0.5),
                this.add.text(cols.name, currentY, 'PILOT', headerStyle).setOrigin(0.5),
                this.add.text(cols.score, currentY, 'SCORE', headerStyle).setOrigin(0.5),
                this.add.text(cols.wave, currentY, 'WAVE', headerStyle).setOrigin(0.5),
                this.add.text(cols.ship, currentY, 'SHIP', headerStyle).setOrigin(0.5)
            ]);
            currentY += 60;

            highscores.forEach((entry, i) => {
                let color = '#ffffff';
                if (i === 0) color = '#ffff00'; // Gold
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
                currentY += 50;
            });
        } else {
            const noData = this.add.text(0, currentY + 100, 'NO RECORDS FOUND.\nGO MAKE HISTORY!', {
                fontFamily: 'Orbitron', fontSize: '32px', color: '#ff0044', align: 'center', shadow: { offsetX: 0, offsetY: 0, color: '#ff0044', blur: 15, fill: true }
            }).setOrigin(0.5);
            container.add(noData);
        }

        const btnStyle = {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#fff', blur: 10, fill: true }
        };

        const backBtn = this.add.text(40, 40, '◀ MAIN MENU', btnStyle)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backBtn.setTint(0x00ffff))
            .on('pointerout', () => backBtn.clearTint())
            .on('pointerdown', () => this._goBack());

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    _goBack() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}

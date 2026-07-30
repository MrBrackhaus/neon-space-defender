import Phaser from 'phaser';
import AchievementSystem from '../systems/AchievementSystem.js';

export default class AchievementScene extends Phaser.Scene {
    constructor() {
        super('AchievementScene');
    }

    create() {
        const cw = this.scale.width;
        const ch = this.scale.height;

        // Cyberpunk Background
        this.add.rectangle(0, 0, cw, ch, 0x02020e).setOrigin(0, 0);
        this.add.grid(cw/2, ch/2, cw, ch, 64, 64, 0x000000, 0, 0xff00ff, 0.05);

        // Arcane/Cyberpunk Glowing Title
        this.add.text(cw/2, 80, 'ACHIEVEMENTS', {
            fontFamily: 'Orbitron',
            fontSize: '48px',
            fontStyle: '900',
            color: '#fff',
            shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 25, stroke: true, fill: true }
        }).setOrigin(0.5);

        const sys = new AchievementSystem();
        const achievements = sys.getAll();

        const startY = 180;
        const spacing = 110;
        const colWidth = cw > 900 ? 400 : 320;
        
        let cols = Math.floor(cw / colWidth);
        if (cols < 1) cols = 1;
        const startX = (cw - (cols * colWidth)) / 2 + colWidth / 2;

        achievements.forEach((ach, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + col * colWidth;
            const y = startY + row * spacing;

            const bg = this.add.graphics();
            const w = colWidth - 40;
            const h = 90;
            const rx = x - w / 2;
            const ry = y - h / 2;
            
            if (ach.unlocked) {
                // Neon glow for unlocked
                bg.lineStyle(3, 0x00ffff, 1);
                bg.fillStyle(0x00ffff, 0.1);
                bg.strokeRoundedRect(rx, ry, w, h, 12);
                bg.fillRoundedRect(rx, ry, w, h, 12);
                
                this.add.text(x, y - 15, ach.name, {
                    fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 'bold', color: '#00ffff',
                    shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
                }).setOrigin(0.5);

                this.add.text(x, y + 15, ach.desc, {
                    fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#ffffff'
                }).setOrigin(0.5);
            } else {
                // Grayed out for locked
                bg.lineStyle(2, 0x333333, 1);
                bg.fillStyle(0x111111, 0.8);
                bg.strokeRoundedRect(rx, ry, w, h, 12);
                bg.fillRoundedRect(rx, ry, w, h, 12);
                
                this.add.text(x, y - 15, '???', {
                    fontFamily: 'Orbitron', fontSize: '20px', fontWeight: 'bold', color: '#555555'
                }).setOrigin(0.5);

                this.add.text(x, y + 15, 'Locked', {
                    fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#444444'
                }).setOrigin(0.5);
            }
        });

        // Shiny Back Button
        const backBtn = this.add.text(cw/2, ch - 80, 'BACK TO MENU', {
            fontFamily: 'Orbitron', fontSize: '24px', fontStyle: '900', color: '#fff'
        }).setOrigin(0.5).setInteractive();

        backBtn.on('pointerover', () => {
            backBtn.setColor('#ff00ff');
            backBtn.setShadow(0, 0, '#ff00ff', 20, true, true);
            this.input.setDefaultCursor('pointer');
        });

        backBtn.on('pointerout', () => {
            backBtn.setColor('#fff');
            backBtn.setShadow(0, 0, 'rgba(0,0,0,0)', 0, false, false);
            this.input.setDefaultCursor('default');
        });

        backBtn.on('pointerdown', () => {
            this.input.setDefaultCursor('default');
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
}

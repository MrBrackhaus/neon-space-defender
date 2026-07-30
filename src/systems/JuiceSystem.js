import Phaser from 'phaser';

export default class JuiceSystem {
    constructor(scene) {
        this.scene = scene;
        this.scrapDrops = [];
        this.sparks = [];
        
        // Create a simple graphics texture for scrap pieces if not exists
        if (!scene.textures.exists('tex_scrap_gear')) {
            const g = scene.add.graphics();
            g.fillStyle(0xaaaaaa); g.fillCircle(4, 4, 4);
            g.fillStyle(0x444444); g.fillCircle(4, 4, 2);
            g.generateTexture('tex_scrap_gear', 8, 8);
            g.destroy();
            
            const s = scene.add.graphics();
            s.fillStyle(0xccaa00); s.fillRect(0, 0, 6, 6);
            s.fillStyle(0x886600); s.fillRect(1, 1, 4, 4);
            s.generateTexture('tex_scrap_cube', 6, 6);
            s.destroy();
        }
    }

    spawnScrap(x, y, amount) {
        const types = ['tex_scrap_gear', 'tex_scrap_cube'];
        for (let i = 0; i < amount; i++) {
            const tex = Phaser.Utils.Array.GetRandom(types);
            const drop = this.scene.add.image(x, y, tex);
            drop.setDepth(4);
            
            // Random explosion burst velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            
            this.scrapDrops.push({
                sprite: drop,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                magnetized: false,
                value: 1 // 1 scrap per piece
            });
        }
    }

    spawnCritSparks(x, y) {
        // Dramatic screen shake for crit
        this.scene.cameras.main.shake(100, 0.015);
        
        // Spawn sparks
        for (let i = 0; i < 8; i++) {
            const spark = this.scene.add.rectangle(x, y, 2, 8, 0xffcc00);
            spark.setDepth(9);
            const angle = Math.random() * Math.PI * 2;
            spark.setRotation(angle + Math.PI/2);
            
            const speed = 200 + Math.random() * 300;
            this.sparks.push({
                sprite: spark,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0
            });
        }
    }

    update(time, delta) {
        const dt = delta / 1000;
        const player = this.scene.player;
        const magnetRadius = 150 + (this.scene.pd.magnetRadius || 0);

        // Update physical scrap
        for (let i = this.scrapDrops.length - 1; i >= 0; i--) {
            const drop = this.scrapDrops[i];
            drop.life += dt;
            
            // Apply friction to the initial explosion burst
            drop.vx *= 0.92;
            drop.vy *= 0.92;
            
            // Rotate visually
            drop.sprite.rotation += 0.1;
            
            // Magnet pull
            const dist = Phaser.Math.Distance.Between(drop.sprite.x, drop.sprite.y, player.x, player.y);
            if (dist < magnetRadius || drop.magnetized) {
                drop.magnetized = true;
                const angle = Phaser.Math.Angle.Between(drop.sprite.x, drop.sprite.y, player.x, player.y);
                const pullSpeed = 1200;
                drop.vx = Math.cos(angle) * pullSpeed;
                drop.vy = Math.sin(angle) * pullSpeed;
                drop.sprite.setAlpha(0.6);
            }
            
            drop.sprite.x += drop.vx * dt;
            drop.sprite.y += drop.vy * dt;
            
            // Collection
            if (dist < 30) {
                this.scene.pd.scrap += drop.value;
                if (this.scene.pd.scrap % 100 === 0 && this.scene.eventSys) {
                    this.scene.eventSys.triggerWrenchComment('scrap_milestone');
                }
                if (this.scene.audioSys) this.scene.audioSys.playHit(); // small blip sound
                drop.sprite.destroy();
                this.scrapDrops.splice(i, 1);
            }
        }
        
        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.sprite.x += spark.vx * dt;
            spark.sprite.y += spark.vy * dt;
            spark.sprite.alpha = spark.life;
            spark.life -= dt * 3; // die quickly
            
            if (spark.life <= 0) {
                spark.sprite.destroy();
                this.sparks.splice(i, 1);
            }
        }
    }
}

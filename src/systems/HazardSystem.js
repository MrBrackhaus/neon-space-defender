import Phaser from 'phaser';

export default class HazardSystem {
    constructor(scene) {
        this.scene = scene;
        this.asteroids = this.scene.physics.add.group();
        this.nextSpawnTime = 0; // Will spawn immediately on first update, or you can add offset
    }

    update(time, delta) {
        if (time >= this.nextSpawnTime) {
            this.spawnAsteroidField();
            // Schedule next spawn in 20-30 seconds
            this.nextSpawnTime = time + Phaser.Math.Between(20000, 30000);
        }
    }

    spawnAsteroidField() {
        const numAsteroids = Phaser.Math.Between(5, 12);
        
        // Spawn them gradually over time (every 1 to 2.5 seconds)
        const spawnDelay = Phaser.Math.Between(1000, 2500);

        this.scene.time.addEvent({
            delay: spawnDelay,
            repeat: numAsteroids - 1,
            callback: () => {
                const width = this.scene.scale ? this.scene.scale.width : 800;
                const x = Phaser.Math.Between(0, width);
                const y = -150;
                
                const radius = Phaser.Math.Between(20, 70);
                const texKey = 'asteroid_' + Phaser.Math.Between(1, 3);
                
                const asteroidVisual = this.scene.physics.add.sprite(x, y, texKey);
                asteroidVisual.setScale((radius * 2) / 512);
                
                this.asteroids.add(asteroidVisual);
                
                asteroidVisual.body.setCircle(256);
                
                const speedX = Phaser.Math.Between(-50, 50);
                const speedY = Phaser.Math.Between(100, 250);
                asteroidVisual.setVelocity(speedX, speedY);
                
                const spin = Phaser.Math.FloatBetween(-0.05, 0.05);
                asteroidVisual.setAngularVelocity(spin * 1000); 
    
                this.scene.time.delayedCall(15000, () => {
                    if (asteroidVisual && asteroidVisual.active) {
                        asteroidVisual.destroy();
                    }
                });
            }
        });
    }
}

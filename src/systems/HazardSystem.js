/**
 * @file HazardSystem.js
 * @description Manages environmental hazards such as asteroid fields that periodically sweep across the screen.
 * @module HazardSystem
 */

import Phaser from 'phaser';

export default class HazardSystem {
    /**
     * @class HazardSystem
     * @description Handles spawning and managing dangerous neutral physics bodies.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        this.scene = scene;
        this.asteroids = this.scene.physics.add.group();
        this.nextSpawnTime = 0; 
    }

    update(time, delta) {
        if (time >= this.nextSpawnTime) {
            this.spawnAsteroidField();
            this.nextSpawnTime = time + Phaser.Math.Between(20000, 30000);
        }
    }

    spawnAsteroidField() {
        const numAsteroids = Phaser.Math.Between(5, 12);
        const spawnDelay = Phaser.Math.Between(1000, 2500);

        this.scene.time.addEvent({
            delay: spawnDelay,
            repeat: numAsteroids - 1,
            callback: () => {
                const width = this.scene.scale ? this.scene.scale.width : 800;
                const x = Phaser.Math.Between(0, width);
                const y = -150;
                
                const speedX = Phaser.Math.Between(-50, 50);
                const speedY = Phaser.Math.Between(100, 250);
                const isOre = Math.random() < 0.25; // 25% chance to be glowing ore
                
                this.createAsteroid(x, y, 3, speedX, speedY, isOre);
            }
        });
    }

    /**
     * @description Creates a single asteroid of a given size tier.
     */
    createAsteroid(x, y, sizeTier, speedX, speedY, isOre) {
        // Radius based on size tier (3 = large, 2 = medium, 1 = small)
        let radius;
        if (sizeTier === 3) radius = Phaser.Math.Between(50, 70);
        else if (sizeTier === 2) radius = Phaser.Math.Between(25, 40);
        else radius = Phaser.Math.Between(10, 20);

        const texKey = 'asteroid_' + Phaser.Math.Between(1, 3);
        const asteroidVisual = this.scene.physics.add.sprite(x, y, texKey);
        asteroidVisual.setScale((radius * 2) / 512);
        
        this.asteroids.add(asteroidVisual);
        asteroidVisual.body.setCircle(256);
        
        // Custom properties
        asteroidVisual.sizeTier = sizeTier;
        asteroidVisual.isOre = isOre;
        asteroidVisual.hp = isOre ? sizeTier * 100 : sizeTier * 50; // Ore has more HP
        
        if (isOre) {
            asteroidVisual.setTint(0x00ffff); // Glowing cyan tint
            if (this.scene.add.particles) { // Add a small glow effect if possible
                // (Omitted complex particles here to keep it simple, tint is usually enough)
            }
        }
        
        asteroidVisual.setVelocity(speedX, speedY);
        asteroidVisual.setAngularVelocity(Phaser.Math.FloatBetween(-50, 50)); 

        this.scene.time.delayedCall(15000, () => {
            if (asteroidVisual && asteroidVisual.active) asteroidVisual.destroy();
        });
        
        return asteroidVisual;
    }

    splitAsteroid(asteroid) {
        if (!asteroid || !asteroid.active) return;
        
        if (asteroid.sizeTier > 1) {
            const newTier = asteroid.sizeTier - 1;
            // Spawn 2 smaller asteroids
            for (let i = 0; i < 2; i++) {
                const angleOffset = (i === 0 ? -1 : 1) * Phaser.Math.Between(20, 45) * Phaser.Math.DEG_TO_RAD;
                const currentAngle = Math.atan2(asteroid.body.velocity.y, asteroid.body.velocity.x);
                const newAngle = currentAngle + angleOffset;
                const speed = asteroid.body.velocity.length() * 1.2; // Move slightly faster
                
                this.createAsteroid(
                    asteroid.x + (i===0 ? -15 : 15), 
                    asteroid.y, 
                    newTier, 
                    Math.cos(newAngle) * speed, 
                    Math.sin(newAngle) * speed, 
                    false // Fragments are not ore
                );
            }
        }
        
        if (this.scene.audioSys) this.scene.audioSys.playExplosion();
        this.scene.spawnDeathFX(asteroid.x, asteroid.y, 0x888888);
        asteroid.destroy();
    }

    explodeAsteroid(asteroid) {
        if (!asteroid || !asteroid.active) return;
        
        // Massive explosion!
        if (this.scene.audioSys) this.scene.audioSys.playExplosion();
        
        // Visuals
        const blast = this.scene.add.circle(asteroid.x, asteroid.y, 10, 0x00ffff, 0.8);
        this.scene.tweens.add({
            targets: blast,
            scale: 25,
            alpha: 0,
            duration: 500,
            onComplete: () => blast.destroy()
        });
        this.scene.cameras.main.shake(150, 0.015);
        this.scene.spawnDeathFX(asteroid.x, asteroid.y, 0x00ffff);
        
        // Damage enemies in radius
        const explosionRadius = 250;
        const explosionDamage = 400; // High damage
        
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(e => {
                if (e.active && !e.isDying && !e.isHitZone) {
                    const dist = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, e.x, e.y);
                    if (dist < explosionRadius) {
                        e.hp -= explosionDamage;
                        this.scene.showDmgNum(e.x, e.y, explosionDamage);
                        if (e.hp <= 0) this.scene.killEnemy(e);
                    }
                }
            });
        }
        
        // Check player damage
        if (this.scene.player && this.scene.player.active) {
            const distP = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, this.scene.player.x, this.scene.player.y);
            if (distP < explosionRadius) {
                this.scene.damagePlayer(40); // Moderate damage to player
            }
        }
        
        asteroid.destroy();
    }
}

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
        /** @type {Phaser.Scene} Reference to the active scene */
        this.scene = scene;
        
        /** @type {Phaser.Physics.Arcade.Group} Physics group for asteroid collision detection */
        this.asteroids = this.scene.physics.add.group();
        
        /** @type {number} Timestamp determining when the next wave should spawn */
        this.nextSpawnTime = 0; // Will spawn immediately on first update
    }

    // ─────────────────── UPDATE LOOP ───────────────────

    /**
     * @description Periodically triggers hazard spawns based on internal timers.
     * @param {number} time - Current scene time.
     * @param {number} delta - Delta time since last frame.
     * @returns {void}
     */
    update(time, delta) {
        if (time >= this.nextSpawnTime) {
            this.spawnAsteroidField();
            // Schedule next spawn in 20-30 seconds to space out hazard events
            this.nextSpawnTime = time + Phaser.Math.Between(20000, 30000);
        }
    }

    // ─────────────────── SPAWNING ───────────────────

    /**
     * @description Spawns a field of asteroids falling from the top of the screen at staggered intervals.
     * @returns {void}
     */
    spawnAsteroidField() {
        const numAsteroids = Phaser.Math.Between(5, 12);
        
        // Spawn them gradually over time (every 1 to 2.5 seconds) so they don't all drop in a single line
        const spawnDelay = Phaser.Math.Between(1000, 2500);

        this.scene.time.addEvent({
            delay: spawnDelay,
            repeat: numAsteroids - 1,
            callback: () => {
                const width = this.scene.scale ? this.scene.scale.width : 800;
                
                // Spawn above the screen bounds
                const x = Phaser.Math.Between(0, width);
                const y = -150;
                
                // Determine randomized scale based on target radius (assuming base texture is 512x512)
                const radius = Phaser.Math.Between(20, 70);
                const texKey = 'asteroid_' + Phaser.Math.Between(1, 3);
                
                const asteroidVisual = this.scene.physics.add.sprite(x, y, texKey);
                asteroidVisual.setScale((radius * 2) / 512);
                
                this.asteroids.add(asteroidVisual);
                
                // Match the physics body circle exactly to the visual scaling
                asteroidVisual.body.setCircle(256);
                
                // Apply randomized movement trajectory
                const speedX = Phaser.Math.Between(-50, 50);
                const speedY = Phaser.Math.Between(100, 250);
                asteroidVisual.setVelocity(speedX, speedY);
                
                // Apply randomized rotation speed
                const spin = Phaser.Math.FloatBetween(-0.05, 0.05);
                asteroidVisual.setAngularVelocity(spin * 1000); 
    
                // Clean up automatically after 15 seconds to prevent memory leaks if it misses boundaries
                this.scene.time.delayedCall(15000, () => {
                    if (asteroidVisual && asteroidVisual.active) {
                        asteroidVisual.destroy();
                    }
                });
            }
        });
    }
}

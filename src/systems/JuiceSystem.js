/**
 * @file JuiceSystem.js
 * @description Responsible for visual "juice" - spawning physical scrap drops and critical hit sparks.
 * Uses a manual particle-like system for objects that need custom physics or interactions (like magnetism).
 * @module JuiceSystem
 */

import Phaser from 'phaser';

export default class JuiceSystem {
    /**
     * @class JuiceSystem
     * @description Manages interactive particle effects and collectables.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} Reference to the active scene */
        this.scene = scene;
        /** @type {Array<Object>} List of active scrap drop entities */
        this.scrapDrops = [];
        /** @type {Array<Object>} List of active critical hit spark entities */
        this.sparks = [];
        
        // Create a simple graphics texture for scrap pieces if it does not already exist
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

    // ─────────────────── SPAWNING ───────────────────

    /**
     * @description Spawns an explosion of scrap particles at a given location.
     * @param {number} x - The x-coordinate of the origin.
     * @param {number} y - The y-coordinate of the origin.
     * @param {number} amount - Number of scrap pieces to spawn.
     * @returns {void}
     */
    spawnScrap(x, y, amount) {
        const types = ['tex_scrap_gear', 'tex_scrap_cube'];
        for (let i = 0; i < amount; i++) {
            const tex = Phaser.Utils.Array.GetRandom(types);
            const drop = this.scene.add.image(x, y, tex);
            drop.setDepth(4);
            
            // Random explosion burst velocity using radial math
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            
            this.scrapDrops.push({
                sprite: drop,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                magnetized: false,
                value: 1 // Base value: 1 scrap per piece
            });
        }
    }

    /**
     * @description Spawns visual sparks to emphasize critical hits, combined with a screen shake.
     * @param {number} x - The x-coordinate of the hit.
     * @param {number} y - The y-coordinate of the hit.
     * @returns {void}
     */
    spawnCritSparks(x, y) {
        // Dramatic screen shake for crit impact
        this.scene.cameras.main.shake(100, 0.015);
        
        // Spawn sparks radiating outward
        for (let i = 0; i < 8; i++) {
            const spark = this.scene.add.rectangle(x, y, 2, 8, 0xffcc00);
            spark.setDepth(9);
            const angle = Math.random() * Math.PI * 2;
            spark.setRotation(angle + Math.PI/2); // Align rectangle length with movement vector
            
            const speed = 200 + Math.random() * 300;
            this.sparks.push({
                sprite: spark,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0
            });
        }
    }

    // ─────────────────── UPDATE LOOP ───────────────────

    /**
     * @description Processes physics, magnetism, and collection logic for scrap and sparks.
     * @param {number} time - Current scene time.
     * @param {number} delta - Delta time since last frame.
     * @returns {void}
     */
    update(time, delta) {
        const dt = delta / 1000; // Convert to seconds
        const player = this.scene.player;
        const magnetRadius = 150 + (this.scene.pd.magnetRadius || 0);

        // Update physical scrap drops (iterating backward for safe removal)
        for (let i = this.scrapDrops.length - 1; i >= 0; i--) {
            const drop = this.scrapDrops[i];
            drop.life += dt;
            
            // Apply friction to the initial explosion burst to slow them down
            drop.vx *= 0.92;
            drop.vy *= 0.92;
            
            // Rotate visually for a tumbling effect
            drop.sprite.rotation += 0.1;
            
            // Magnet pull logic
            const dist = Phaser.Math.Distance.Between(drop.sprite.x, drop.sprite.y, player.x, player.y);
            if (dist < magnetRadius || drop.magnetized) {
                drop.magnetized = true; // Once magnetized, it stays magnetized
                const angle = Phaser.Math.Angle.Between(drop.sprite.x, drop.sprite.y, player.x, player.y);
                const pullSpeed = 1200;
                
                // Override velocity to rush towards the player
                drop.vx = Math.cos(angle) * pullSpeed;
                drop.vy = Math.sin(angle) * pullSpeed;
                drop.sprite.setAlpha(0.6); // Visual feedback that it's being collected
            }
            
            drop.sprite.x += drop.vx * dt;
            drop.sprite.y += drop.vy * dt;
            
            // Collection detection
            if (dist < 30) {
                this.scene.pd.scrap += drop.value;
                // Trigger event comment every 100 scrap
                if (this.scene.pd.scrap % 100 === 0 && this.scene.eventSys) {
                    this.scene.eventSys.triggerWrenchComment('scrap_milestone');
                }
                if (this.scene.audioSys) this.scene.audioSys.playHit(); // small blip sound
                
                drop.sprite.destroy();
                this.scrapDrops.splice(i, 1);
            }
        }
        
        // Update temporary critical hit sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.sprite.x += spark.vx * dt;
            spark.sprite.y += spark.vy * dt;
            spark.sprite.alpha = spark.life;
            
            // Fade out rapidly
            spark.life -= dt * 3; 
            
            if (spark.life <= 0) {
                spark.sprite.destroy();
                this.sparks.splice(i, 1);
            }
        }
    }
}

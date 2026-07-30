/**
 * @file EnvironmentSystem.js
 * @description Manages dynamic background elements like procedural nebulae and multi-layered parallax stars
 * to give the illusion of deep space travel.
 * @module EnvironmentSystem
 */

import Phaser from 'phaser';

export default class EnvironmentSystem {
    /**
     * @class EnvironmentSystem
     * @description Background rendering controller.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} Reference to the active scene */
        this.scene = scene;
        /** @type {Array<Object>} Array storing tileSprites for star layers */
        this.starLayers = [];
        /** @type {Array<Object>} Array storing graphics objects for procedural nebulae */
        this.nebulae = [];
    }

    // ─────────────────── INITIALIZATION ───────────────────

    /**
     * @description Generates all background layers and elements during scene creation.
     * @returns {void}
     */
    create() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Create large procedural nebula clouds (deepest background layer)
        this.createNebulae(width, height);

        // Create 3 layers of parallax stars to give depth
        // Layer 1: Distant stars (slow, small, dim)
        this.createStarLayer(width, height, 200, 1, 0x666666, 0.3);
        
        // Layer 2: Midground stars (medium speed, slightly larger/brighter)
        this.createStarLayer(width, height, 100, 2, 0xaaaaaa, 0.6);

        // Layer 3: Foreground stars (fastest, brightest)
        this.createStarLayer(width, height, 40, 3, 0xffffff, 1.2);
    }

    /**
     * @description Generates procedural nebula clouds using overlapping, randomized ellipses.
     * @param {number} width - Screen width.
     * @param {number} height - Screen height.
     * @returns {void}
     */
    createNebulae(width, height) {
        // Deep space colors for nebulae
        const colors = [0x2c003e, 0x14213d, 0x001d3d, 0x1a0b2e, 0x0d3b66];
        
        for (let i = 0; i < 6; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const radiusX = Phaser.Math.Between(300, 700);
            const radiusY = Phaser.Math.Between(300, 700);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const alpha = Phaser.Math.FloatBetween(0.05, 0.15);

            const graphics = this.scene.add.graphics();
            graphics.setScrollFactor(0); // Fix to screen, we will manually scroll their positions
            
            graphics.fillStyle(color, alpha);
            
            // Draw a few overlapping ellipses to make it look cloudy and organic
            for(let j = 0; j < 3; j++) {
                const offsetX = Phaser.Math.Between(-150, 150);
                const offsetY = Phaser.Math.Between(-150, 150);
                graphics.fillEllipse(
                    offsetX, 
                    offsetY, 
                    radiusX * Phaser.Math.FloatBetween(0.6, 1.2), 
                    radiusY * Phaser.Math.FloatBetween(0.6, 1.2)
                );
            }
            
            graphics.x = x;
            graphics.y = y;

            // Apply blur if Phaser 3 renderer supports it via postFX pipeline
            if (graphics.postFX) {
                graphics.postFX.addBlur(3, 3, 1);
            }
            
            // Nebulae move very slowly
            const speed = Phaser.Math.FloatBetween(0.05, 0.15);

            this.nebulae.push({
                graphics: graphics,
                speed: speed,
                radius: Math.max(radiusX, radiusY) * 1.2 // Used for boundary wrapping check
            });
        }
    }

    /**
     * @description Creates a seamless, scrolling tileSprite layer of randomly placed stars.
     * Instead of updating hundreds of individual sprites, it paints them to a texture once.
     * @param {number} width - Screen width.
     * @param {number} height - Screen height.
     * @param {number} count - Number of stars to draw.
     * @param {number} size - Size (width/height) of each star square.
     * @param {number} color - Hex color for the stars.
     * @param {number} speed - The scroll speed multiplier for this layer.
     * @returns {void}
     */
    createStarLayer(width, height, count, size, color, speed) {
        // Generate texture for this star layer for maximum performance
        const key = 'star_layer_' + speed;
        
        if (!this.scene.textures.exists(key)) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(color, 1);
            for (let i = 0; i < count; i++) {
                const x = Phaser.Math.Between(0, width);
                const y = Phaser.Math.Between(0, height);
                graphics.fillRect(x, y, size, size);
            }
            graphics.generateTexture(key, width, height);
            graphics.destroy();
        }

        const tileSprite = this.scene.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0);
        tileSprite.setScrollFactor(0); // Fix to screen, we manually scroll the UVs
        
        this.starLayers.push({
            sprite: tileSprite,
            speed: speed
        });
    }

    // ─────────────────── UPDATE LOOP ───────────────────

    /**
     * @description Scrolls the background elements based on time delta.
     * @param {number} time - Current scene time.
     * @param {number} delta - Delta time since last frame.
     * @returns {void}
     */
    update(time, delta) {
        const height = this.scene.cameras.main.height;
        const timeScale = delta / 16.66; // Normalize to roughly 60fps for consistent speed

        // Drift downwards (simulating forward movement of the ship)
        
        // Scroll star layers by shifting the tilePosition mapping (extremely cheap operation)
        for (let i = 0; i < this.starLayers.length; i++) {
            const layer = this.starLayers[i];
            layer.sprite.tilePositionY -= layer.speed * timeScale;
        }

        // Scroll nebulae graphics downwards manually
        for (let i = 0; i < this.nebulae.length; i++) {
            const nebula = this.nebulae[i];
            nebula.graphics.y += nebula.speed * timeScale;

            // Wrap around when it moves fully off-screen at the bottom
            if (nebula.graphics.y - nebula.radius > height) {
                nebula.graphics.y = -nebula.radius;
                nebula.graphics.x = Phaser.Math.Between(0, this.scene.cameras.main.width);
            }
        }
    }
}

import Phaser from 'phaser';

export default class EnvironmentSystem {
    constructor(scene) {
        this.scene = scene;
        this.starLayers = [];
        this.nebulae = [];
    }

    create() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Create large procedural nebula clouds (deepest background)
        this.createNebulae(width, height);

        // Create 3 layers of parallax stars
        // Layer 1: Distant stars (slow, small, dim)
        this.createStarLayer(width, height, 200, 1, 0x666666, 0.3);
        
        // Layer 2: Midground stars (medium speed, slightly larger/brighter)
        this.createStarLayer(width, height, 100, 2, 0xaaaaaa, 0.6);

        // Layer 3: Foreground stars (fastest, brightest)
        this.createStarLayer(width, height, 40, 3, 0xffffff, 1.2);
    }

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
            graphics.setScrollFactor(0); // Fix to screen, we will manually scroll
            
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
                radius: Math.max(radiusX, radiusY) * 1.2 // for boundary wrapping check
            });
        }
    }

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

    update(time, delta) {
        const height = this.scene.cameras.main.height;
        const timeScale = delta / 16.66; // Normalize to roughly 60fps

        // Drift downwards (simulating forward movement)
        // Scroll star layers by shifting the tilePosition
        for (let i = 0; i < this.starLayers.length; i++) {
            const layer = this.starLayers[i];
            layer.sprite.tilePositionY -= layer.speed * timeScale;
        }

        // Scroll nebulae downwards
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

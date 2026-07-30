export default class BossSystem {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Pauses the game, shows a Borderlands-style boss intro, and presents dialogue choices.
     * @param {string} bossType - The name or type of the boss.
     * @param {function} onChoiceComplete - Callback receiving the combat modifier object once a choice is made.
     */
    showInteractiveBossIntro(bossType, onChoiceComplete) {
        // 1. Pause physics
        this.scene.physics.world.pause();

        const { width, height } = this.scene.cameras.main;

        // Create UI container for the intro
        const introContainer = this.scene.add.container(0, 0);
        introContainer.setDepth(1000);

        // Dark overlay to focus on the boss
        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        overlay.setOrigin(0, 0);
        introContainer.add(overlay);

        // Boss Name / Title (Borderlands style)
        const bossName = this.scene.add.text(width / 2, height * 0.3, bossType.toUpperCase(), {
            fontFamily: 'Impact, sans-serif',
            fontSize: '72px',
            color: '#ff0044',
            stroke: '#ffffff',
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: false, fill: true }
        }).setOrigin(0.5);
        bossName.setScale(0);
        introContainer.add(bossName);

        // Subtitle / Tagline
        const subtitle = this.scene.add.text(width / 2, height * 0.3 + 70, 'THE GALACTIC MENACE', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        subtitle.setAlpha(0);
        introContainer.add(subtitle);

        // Tween for Borderlands style splash
        this.scene.tweens.add({
            targets: bossName,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            ease: 'Back.out',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: subtitle,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.showChoices(introContainer, width, height, onChoiceComplete);
                    }
                });
            }
        });
    }

    /**
     * Internal method to display the dialogue choices.
     */
    showChoices(container, width, height, onChoiceComplete) {
        // 2. Add interactive choices
        const choice1 = this.scene.add.text(width / 2, height * 0.6, "[1] 'Dein Schiff sieht aus wie ein Toaster'", {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const choice2 = this.scene.add.text(width / 2, height * 0.7, "[2] (Schweigen)", {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        container.add(choice1);
        container.add(choice2);

        // Hover effects
        choice1.on('pointerover', () => choice1.setStyle({ color: '#ff5555', backgroundColor: '#555555' }));
        choice1.on('pointerout', () => choice1.setStyle({ color: '#ffffff', backgroundColor: '#333333' }));
        
        choice2.on('pointerover', () => choice2.setStyle({ color: '#55ffff', backgroundColor: '#555555' }));
        choice2.on('pointerout', () => choice2.setStyle({ color: '#ffffff', backgroundColor: '#333333' }));

        const resolveChoice = (modifier) => {
            // Destroy the UI
            container.destroy();
            // Resume the game
            this.scene.physics.world.resume();
            
            // 3. Pass modifier to callback
            if (onChoiceComplete) {
                onChoiceComplete(modifier);
            }
        };

        // Click handlers with respective combat modifiers
        choice1.on('pointerdown', () => {
            resolveChoice({ aggro: true, noShields: true });
        });

        choice2.on('pointerdown', () => {
            resolveChoice({ defensive: true, spawnMinions: true });
        });
    }

    /**
     * 4. Setup distinct hit zones (e.g. engines) for the boss.
     * @param {Phaser.GameObjects.Sprite} bossSprite - The main boss sprite.
     */
    setupHitZones(bossSprite) {
        bossSprite.hitZones = [];

        // Define hit zone properties (Left Engine)
        const leftEngine = this.scene.add.rectangle(0, 0, 40, 60, 0xff0000, 0); // alpha 0 for invisible hitbox
        this.scene.physics.add.existing(leftEngine);
        leftEngine.body.setAllowGravity(false);
        leftEngine.body.setImmovable(true);
        this.scene.enemies.add(leftEngine);
        leftEngine.isHitZone = true;
        leftEngine.parentBoss = bossSprite;
        leftEngine.type = 'hitzone';
        leftEngine.hp = 300;
        leftEngine.isDestroyed = false;
        leftEngine.partName = 'Left Engine';
        leftEngine.offsetX = -80; // Relative to boss center
        leftEngine.offsetY = 40;

        // Define hit zone properties (Right Engine)
        const rightEngine = this.scene.add.rectangle(0, 0, 40, 60, 0xff0000, 0);
        this.scene.physics.add.existing(rightEngine);
        rightEngine.body.setAllowGravity(false);
        rightEngine.body.setImmovable(true);
        this.scene.enemies.add(rightEngine);
        rightEngine.isHitZone = true;
        rightEngine.parentBoss = bossSprite;
        rightEngine.type = 'hitzone';
        rightEngine.hp = 300;
        rightEngine.isDestroyed = false;
        rightEngine.partName = 'Right Engine';
        rightEngine.offsetX = 80;
        rightEngine.offsetY = 40;

        bossSprite.hitZones.push(leftEngine, rightEngine);

        // Create an update function to sync hit zone positions with the boss
        bossSprite.updateHitZones = () => {
            if (!bossSprite.active) {
                leftEngine.destroy();
                rightEngine.destroy();
                return;
            }

            leftEngine.setPosition(bossSprite.x + leftEngine.offsetX, bossSprite.y + leftEngine.offsetY);
            rightEngine.setPosition(bossSprite.x + rightEngine.offsetX, bossSprite.y + rightEngine.offsetY);
        };

        // Hook into scene update event to continuously attach the hit zones
        this.scene.events.on('update', bossSprite.updateHitZones);
        
        // Cleanup when the boss is destroyed
        bossSprite.once('destroy', () => {
            this.scene.events.off('update', bossSprite.updateHitZones);
            leftEngine.destroy();
            rightEngine.destroy();
        });
    }

    /**
     * Handles damage applied specifically to a hit zone.
     * @param {Phaser.GameObjects.Rectangle} hitZone - The specific hit zone (engine).
     * @param {number} amount - Damage amount.
     * @param {Phaser.GameObjects.Sprite} bossSprite - The main boss sprite.
     */
    damageHitZone(hitZone, amount, bossSprite) {
        if (hitZone.isDestroyed) return;

        hitZone.hp -= amount;
        if (hitZone.hp <= 0) {
            hitZone.isDestroyed = true;
            
            // Disable physics body so it can't be hit anymore
            hitZone.body.enable = false;

            // Trigger visual explosion
            this.triggerPartExplosion(hitZone);

            // Trigger a state change on the boss
            if (bossSprite && bossSprite.active) {
                bossSprite.setTint(0xffaaaa); // Change tint as visual feedback
                
                // Example state change: slow down the boss
                if (bossSprite.body) {
                    bossSprite.body.maxVelocity.x *= 0.7; 
                    bossSprite.body.maxVelocity.y *= 0.7;
                }
                
                // You could emit a custom event to notify the GameScene
                this.scene.events.emit('bossPartDestroyed', hitZone.partName, bossSprite);
            }
        }
    }

    /**
     * Visual effect for when an engine is destroyed.
     */
    triggerPartExplosion(hitZone) {
        // Fallback to simple circle explosion if particle texture ('flare' or 'spark') isn't available
        const explosion = this.scene.add.circle(hitZone.x, hitZone.y, 10, 0xffaa00);
        
        this.scene.tweens.add({
            targets: explosion,
            scale: 5,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add a camera shake for extra impact
        this.scene.cameras.main.shake(150, 0.01);
    }
}

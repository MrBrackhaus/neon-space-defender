import Phaser from 'phaser';

export default class AbilitySystem {
    constructor(scene) {
        this.scene = scene;
        this.cooldown = 15000; // 15 seconds in milliseconds
        this.lastUsedTime = -15000; // Allow immediate use
        
        // Listen to SPACEBAR
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        let trigger = Phaser.Input.Keyboard.JustDown(this.spaceKey);
        
        // Gamepad Support (Button X / Square or L2)
        const pad = this.scene.input.gamepad ? this.scene.input.gamepad.pad1 : null;
        if (pad && (pad.X || pad.L2)) {
            trigger = true;
        }

        if (trigger) {
            this.triggerUltimate(time);
        }
    }

    triggerUltimate(time) {
        if (time - this.lastUsedTime < this.cooldown) {
            return; // On cooldown
        }

        // Assuming the scene's player has a shipClass property
        const shipClass = this.scene.player ? this.scene.player.shipClass : null;
        if (!shipClass) return;

        this.lastUsedTime = time;

        if (shipClass === 'bomber') {
            this.triggerBomberUltimate();
        } else if (shipClass === 'dreadnought') {
            this.triggerDreadnoughtUltimate();
        } else if (shipClass === 'phantom') {
            this.triggerPhantomUltimate();
        }
    }

    triggerBomberUltimate() {
        // Drop 10 bombs in a wide arc forward
        for (let i = 0; i < 10; i++) {
            const angle = Phaser.Math.Between(-45, 45); // Spread angle
            
            // Create a simple visual for the bomb using a graphics circle
            const bombVisual = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 8, 0xff0000);
            this.scene.physics.add.existing(bombVisual);
            bombVisual.damage = 150 + (this.scene.pd.damage * 2);
            bombVisual.pierce = true;
            this.scene.bullets.add(bombVisual);
            
            // Determine velocity based on player's rotation
            // Subtracting Math.PI/2 because 0 rotation typically points right in Phaser, but ships often point up
            const angleRad = this.scene.player.rotation - Math.PI / 2 + Phaser.Math.DegToRad(angle);
            const speed = 400;
            
            bombVisual.body.setVelocity(
                Math.cos(angleRad) * speed,
                Math.sin(angleRad) * speed
            );
            
            // Clean up bombs after 3 seconds
            this.scene.time.delayedCall(3000, () => {
                if (bombVisual && bombVisual.active) {
                    bombVisual.destroy();
                }
            });
        }
    }

    triggerDreadnoughtUltimate() {
        // Make player invincible for 4s
        this.scene.playerInvincible = true;
        this.scene.player.setTint(0xffd700); // Tint gold

        this.scene.time.delayedCall(4000, () => {
            this.scene.playerInvincible = false;
            if (this.scene.player && this.scene.player.active) {
                this.scene.player.clearTint();
            }
        });
    }

    triggerPhantomUltimate() {
        // Apply stealth (opacity 0.3) and double speed for 3s
        this.scene.player.setAlpha(0.3);
        
        // Custom flag or direct speed multiplication depending on how your movement is handled.
        // We'll set a flag that GameScene can check, or temporarily modify player.speed if it exists.
        this.scene.playerPhantomSpeedBoost = true;
        if (this.scene.player.speed) {
            this.scene.player.originalSpeed = this.scene.player.speed;
            this.scene.player.speed *= 2;
        }

        this.scene.time.delayedCall(3000, () => {
            if (this.scene.player && this.scene.player.active) {
                this.scene.player.setAlpha(1);
                this.scene.playerPhantomSpeedBoost = false;
                if (this.scene.player.originalSpeed) {
                    this.scene.player.speed = this.scene.player.originalSpeed;
                }
            }
        });
    }
}

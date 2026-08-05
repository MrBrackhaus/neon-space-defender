/**
 * @file AbilitySystem.js
 * @description Manages ship-specific ultimate abilities triggered by user input.
 * Handles cooldown logic, input detection, and the effects of abilities based on the selected ship class.
 * @module AbilitySystem
 */

import Phaser from 'phaser';

export default class AbilitySystem {
    /**
     * @class AbilitySystem
     * @description System responsible for executing player ultimate abilities.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} Reference to the active scene */
        this.scene = scene;
        
        /** @type {number} Ultimate ability cooldown in milliseconds */
        this.cooldown = 15000; // 15 seconds
        
        /** @type {number} Timestamp of the last used ultimate, initialized to allow immediate use */
        this.lastUsedTime = -15000; 
        
        /** @type {Phaser.Input.Keyboard.Key} Keyboard binding for the ability (E) */
        this.abilityKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    /**
     * @description Updates the system, checking for player input to trigger abilities.
     * @param {number} time - Current scene time.
     * @param {number} delta - Delta time since last frame.
     * @returns {void}
     */
    update(time, delta) {
        let trigger = Phaser.Input.Keyboard.JustDown(this.abilityKey);
        
        // Gamepad Support (Button X / Square or L2)
        const pad = this.scene.input.gamepad ? this.scene.input.gamepad.pad1 : null;
        if (pad && (pad.X || pad.L2)) {
            trigger = true;
        }

        if (trigger) {
            this.triggerUltimate(time);
        }
    }

    // ─────────────────── ABILITY LOGIC ───────────────────

    /**
     * @description Attempts to trigger the ultimate ability if off cooldown.
     * Determines which ability to use based on the player's ship class.
     * @param {number} time - Current scene time.
     * @returns {void}
     */
    triggerUltimate(time) {
        if (time - this.lastUsedTime < this.cooldown) {
            return; // On cooldown
        }

        // Assuming the scene's player has a shipClass property defined
        const shipClass = this.scene.player ? this.scene.player.shipClass : null;
        if (!shipClass) return;

        this.lastUsedTime = time;

        // Route to the specific ship's ultimate ability
        if (shipClass === 'bomber') {
            this.triggerBomberUltimate();
        } else if (shipClass === 'dreadnought') {
            this.triggerDreadnoughtUltimate();
        } else if (shipClass === 'phantom') {
            this.triggerPhantomUltimate();
        } else if (shipClass === 'interceptor') {
            this.triggerInterceptorUltimate();
        } else if (shipClass === 'paladin') {
            this.triggerPaladinUltimate();
        } else {
            this.triggerStandardUltimate();
        }
    }

    /**
     * @description Executes the Bomber class ultimate: Drops a wide spread of high-damage bombs forward.
     * @returns {void}
     */
    triggerBomberUltimate() {
        // Drop 10 bombs in a wide arc forward
        for (let i = 0; i < 10; i++) {
            const angle = Phaser.Math.Between(-45, 45); // Random spread angle
            
            // Create a simple visual for the bomb using a graphics circle
            const bombVisual = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 8, 0xff0000);
            this.scene.physics.add.existing(bombVisual);
            
            // Bombs do significantly more damage than normal shots and pierce enemies
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
            
            // Clean up bombs after 3 seconds to prevent memory leaks or stray hits
            this.scene.time.delayedCall(3000, () => {
                if (bombVisual && bombVisual.active) {
                    bombVisual.destroy();
                }
            });
        }
    }

    /**
     * @description Executes the Dreadnought class ultimate: Grants temporary invincibility.
     * @returns {void}
     */
    triggerDreadnoughtUltimate() {
        // Make player invincible for 4 seconds
        this.scene.playerInvincible = true;
        this.scene.player.setTint(0xffd700); // Tint gold as visual feedback

        // Remove invincibility after duration
        this.scene.time.delayedCall(4000, () => {
            this.scene.playerInvincible = false;
            if (this.scene.player && this.scene.player.active) {
                this.scene.player.clearTint();
            }
        });
    }

    /**
     * @description Executes the Phantom class ultimate: Applies stealth (opacity drop) and doubles movement speed.
     * @returns {void}
     */
    triggerPhantomUltimate() {
        // Apply stealth visual (opacity 0.3)
        this.scene.player.setAlpha(0.3);
        
        // Temporarily modify player speed and set a flag for GameScene logic
        this.scene.playerPhantomSpeedBoost = true;
        if (this.scene.player.speed) {
            this.scene.player.originalSpeed = this.scene.player.speed;
            this.scene.player.speed *= 2;
        }

        // Restore normal state after 3 seconds
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
    triggerStandardUltimate() {
        this.scene.shootTimer.delay = this.scene.pd.fireDelay / 2;
        this.scene.player.setTint(0xffaa00);
        this.scene.time.delayedCall(4000, () => {
            this.scene.shootTimer.delay = this.scene.pd.fireDelay;
            if (this.scene.player && this.scene.player.active) this.scene.player.clearTint();
        });
    }

    triggerInterceptorUltimate() {
        const speed = 2500;
        const angle = this.scene.player.rotation - Math.PI/2;
        this.scene.player.body.setVelocity(Math.cos(angle)*speed, Math.sin(angle)*speed);
        this.scene.playerInvincible = true;
        this.scene.player.setAlpha(0.5);
        this.scene.cameras.main.shake(200, 0.01);
        
        this.scene.time.delayedCall(300, () => {
            this.scene.playerInvincible = false;
            if (this.scene.player && this.scene.player.active) {
                this.scene.player.setAlpha(1);
                this.scene.player.body.setVelocity(0, 0);
            }
        });
    }

    triggerPaladinUltimate() {
        this.scene.pd.shield = 3;
        this.scene.healPlayer(50);
        const aura = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 10, 0x00ffff, 0.8);
        this.scene.tweens.add({
            targets: aura, radius: 400, alpha: 0, duration: 800,
            onComplete: () => aura.destroy()
        });
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(e => {
                if (e.active && Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, e.x, e.y) < 400) {
                    e.hp -= 200;
                    if (e.hp <= 0 && !e.isDying) this.scene.killEnemy(e);
                }
            });
        }
    }
}



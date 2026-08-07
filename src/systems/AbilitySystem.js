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
        if (this.scene.audioSys) this.scene.audioSys.playAbility();

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
        if (!this.scene.player || !this.scene.player.active) return;
        
        // Fire the magnificent rainbow laser
        this.scene.weaponSys.fireRainbowLaser(this.scene.player, this.scene.enemies, this.scene.pd.damage);
        
        if (this.scene.audioSys) {
            this.scene.audioSys.playExplosion();
        }
        
        // Speed up the RGB animation
        this.scene.player.anims.timeScale = 5.0;
        this.scene.time.delayedCall(1500, () => {
            if (this.scene.player && this.scene.player.active) {
                this.scene.player.anims.timeScale = 1.0;
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
        if (!this.scene.player || !this.scene.player.active) return;
        
        const px = this.scene.player.x;
        const py = this.scene.player.y;
        
        // Healing and Shield logic
        this.scene.pd.shield = 3;
        this.scene.healPlayer(50);
        
        if (this.scene.audioSys) {
            this.scene.audioSys.playExplosion();
        }
        
        // Camera shake
        this.scene.cameras.main.shake(400, 0.03);
        
        // --- PREMIUM NEON ENERGY WAVE VISUALS ---
        const maxRadius = 600;
        
        // 1. Multiple expanding shockwave rings
        const shockwave1 = this.scene.add.graphics().setBlendMode('ADD').setDepth(11);
        const shockwave2 = this.scene.add.graphics().setBlendMode('ADD').setDepth(11);
        const shockwave3 = this.scene.add.graphics().setBlendMode('ADD').setDepth(11);
        
        let waveRadius = 0;
        
        const waveTween = this.scene.tweens.addCounter({
            from: 0,
            to: maxRadius,
            duration: 800,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                waveRadius = tween.getValue();
                const alpha = 1 - (waveRadius / maxRadius);
                
                shockwave1.clear();
                shockwave1.lineStyle(15, 0xff00ff, alpha);
                shockwave1.strokeCircle(px, py, waveRadius);
                
                shockwave2.clear();
                shockwave2.lineStyle(8, 0x00ffff, alpha * 0.8);
                shockwave2.strokeCircle(px, py, waveRadius * 0.85);
                
                shockwave3.clear();
                shockwave3.lineStyle(4, 0xffffff, alpha);
                shockwave3.strokeCircle(px, py, waveRadius * 0.95);
            },
            onComplete: () => {
                shockwave1.destroy();
                shockwave2.destroy();
                shockwave3.destroy();
            }
        });
        
        // 2. LOTS OF GLITTER (360 degree particle explosion)
        const glitter = this.scene.add.particles(px, py, 'p_glow', {
            speed: { min: 200, max: 800 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff00ff, 0x00ffff, 0xffcc00, 0xffffff, 0x00ff00],
            lifespan: 1000,
            blendMode: 'ADD',
            quantity: 150, // Massive explosion of glitter
            gravityY: 0
        });
        glitter.setDepth(12);
        glitter.explode(150, px, py);
        this.scene.time.delayedCall(1200, () => glitter.destroy());
        
        // 3. Central Flare Flash
        const flare = this.scene.add.circle(px, py, 150, 0xffffff, 1).setBlendMode('ADD').setDepth(13);
        this.scene.tweens.add({
            targets: flare,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 400,
            onComplete: () => flare.destroy()
        });

        // --- DAMAGE LOGIC ---
        // Deal massive damage to all enemies within radius
        const enemies = this.scene.enemies ? this.scene.enemies.getChildren() : [];
        enemies.forEach(e => {
            if (e && e.active) {
                const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
                if (dist <= maxRadius) {
                    const dmg = (this.scene.pd.damage * 5) + 300;
                    if (typeof e.takeDamage === 'function') {
                        e.takeDamage(dmg);
                    } else if (e.hp !== undefined) {
                        e.hp -= dmg;
                        if (e.hp <= 0 && !e.isDying && this.scene.killEnemy) {
                            this.scene.killEnemy(e);
                        }
                    }
                }
            }
        });
    }
}

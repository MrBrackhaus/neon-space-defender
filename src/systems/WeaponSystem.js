/**
 * @file WeaponSystem.js
 * @description Handles advanced weapon attacks, visual effects, and hit logic for special weapons 
 * like Chain Lightning, Black Hole, Laser Whip, Supernova, etc.
 * @module WeaponSystem
 */

import Phaser from 'phaser';

export default class WeaponSystem {
  /**
   * @class WeaponSystem
   * @description Utility system containing specialized weapon logic that is too complex for standard bullet mechanics.
   * @param {Phaser.Scene} scene - The main game scene.
   */
  constructor(scene) {
    /** @type {Phaser.Scene} Reference to the active scene */
    this.scene = scene;
  }

  // ─────────────────── ADVANCED WEAPONS ───────────────────

  /**
   * @description Fires a chain lightning attack that jumps between enemies.
   * @param {Phaser.GameObjects.Sprite} sourceSprite - The origin of the lightning.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - The group containing active enemies.
   * @param {number} damage - Base damage to apply to each hit enemy.
   * @param {number} [level=1] - Determines the max number of jumps and damage scaling.
   * @returns {void}
   */
  fireChainLightning(sourceSprite, enemiesGroup, damage, level = 1) {
    if (!sourceSprite || !sourceSprite.active) return;
    
    // Scale max jumps and damage based on level
    const maxJumps = Math.min(10, 3 + level);
    const appliedDamage = damage * (1 + level * 0.2);
    let currentSource = sourceSprite;
    const hitEnemies = new Set();
    
    // Graphics object to render the lightning path
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0x00ffff, 1);
    
    for (let i = 0; i < maxJumps; i++) {
      // Filter out inactive enemies and ones already hit by this lightning chain
      const activeEnemies = enemiesGroup.getChildren().filter(e => e.active && !hitEnemies.has(e));
      if (activeEnemies.length === 0) break;
      
      const closest = this.scene.physics.closest(currentSource, activeEnemies);
      if (!closest) break;
      
      graphics.beginPath();
      graphics.moveTo(currentSource.x, currentSource.y);
      
      // Create a jagged lightning effect by adding a midpoint with a random offset
      let midX = (currentSource.x + closest.x) / 2;
      let midY = (currentSource.y + closest.y) / 2;
      const offset = 30; 
      midX += (Math.random() - 0.5) * offset;
      midY += (Math.random() - 0.5) * offset;
      
      graphics.lineTo(midX, midY);
      graphics.lineTo(closest.x, closest.y);
      graphics.strokePath();
      
      // Apply damage (try both method or direct property to support different enemy types)
      if (typeof closest.takeDamage === 'function') {
        closest.takeDamage(appliedDamage);
      } else if (closest.hp !== undefined) {
        closest.hp -= appliedDamage;
      }
      
      hitEnemies.add(closest);
      currentSource = closest; // Next jump originates from the hit enemy
    }
    
    // Fade out and destroy the lightning line
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        graphics.destroy();
      }
    });
  }

  /**
   * @description Spawns a black hole that pulls in enemies and deals damage over time.
   * @param {number} x - The x-coordinate for the black hole.
   * @param {number} y - The y-coordinate for the black hole.
   * @param {number} duration - Base duration in ms.
   * @param {number} pullRadius - Base pull radius.
   * @param {number} damage - Tick damage applied to enemies inside.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - The group containing active enemies.
   * @param {number} [level=1] - Determines the scaling of duration, radius, and damage.
   * @returns {void}
   */
  fireBlackHole(x, y, duration, pullRadius, damage, enemiesGroup, level = 1) {
    const actualDuration = duration + (level * 1000);
    const actualPullRadius = pullRadius + (level * 30);
    const tickDamage = damage * (1 + level * 0.2);

    const graphics = this.scene.add.graphics();
    // Dark purple swirling circle representation
    graphics.fillStyle(0x4a0072, 0.9);
    graphics.fillCircle(x, y, 40);
    
    // Simple visual pulsing effect
    this.scene.tweens.add({
      targets: graphics,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 600
    });
    
    // Target point for enemies to move towards
    const blackHolePoint = { x: x, y: y };

    // Timer that continuously applies pull physics and damage
    const pullTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= actualPullRadius) {
              // Pull enemy towards the black hole
              this.scene.physics.moveToObject(enemy, blackHolePoint, 150);
              
              // Apply tick damage
              if (typeof enemy.takeDamage === 'function') {
                enemy.takeDamage(tickDamage);
              } else if (enemy.hp !== undefined) {
                enemy.hp -= tickDamage;
              }
            }
          }
        });
      },
      loop: true
    });
    
    // Destroy the black hole when its duration ends
    this.scene.time.delayedCall(actualDuration, () => {
      pullTimer.remove();
      this.scene.tweens.add({
          targets: graphics,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 300,
          onComplete: () => {
              graphics.destroy();
          }
      });
    });
  }

  /**
   * @description Fires a chaotic laser whip that strikes multiple random enemies at once.
   * @param {Phaser.GameObjects.Sprite} sourceSprite - The origin of the whip.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - The group containing active enemies.
   * @param {number} damage - Damage applied to each struck enemy.
   * @returns {void}
   */
  fireLaserWhip(sourceSprite, enemiesGroup, damage) {
    if (!sourceSprite || !sourceSprite.active) return;
    const activeEnemies = enemiesGroup.getChildren().filter(e => e.active);
    if (activeEnemies.length === 0) return;

    // A more aggressive, chaotic chain lightning that hits multiple enemies at once
    const maxTargets = 8;
    const targets = Phaser.Utils.Array.Shuffle(activeEnemies).slice(0, maxTargets);
    
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(6, 0xff00ff, 1); // Thick magenta lightning
    
    targets.forEach(target => {
      graphics.beginPath();
      graphics.moveTo(sourceSprite.x, sourceSprite.y);
      
      // Control points for a curved "whip" effect
      let midX1 = sourceSprite.x + (target.x - sourceSprite.x) * 0.3 + (Math.random() - 0.5) * 100;
      let midY1 = sourceSprite.y + (target.y - sourceSprite.y) * 0.3 + (Math.random() - 0.5) * 100;
      
      let midX2 = sourceSprite.x + (target.x - sourceSprite.x) * 0.7 + (Math.random() - 0.5) * 100;
      let midY2 = sourceSprite.y + (target.y - sourceSprite.y) * 0.7 + (Math.random() - 0.5) * 100;
      
      // Draw bezier-like curve using strokePoints
      graphics.strokePoints([
        new Phaser.Math.Vector2(sourceSprite.x, sourceSprite.y),
        new Phaser.Math.Vector2(midX1, midY1),
        new Phaser.Math.Vector2(midX2, midY2),
        new Phaser.Math.Vector2(target.x, target.y)
      ], false, false);
      
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(damage);
      } else if (target.hp !== undefined) {
        target.hp -= damage;
      }
    });

    // Screen shake and flash for impactful feeling
    this.scene.cameras.main.shake(100, 0.01);
    
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 400,
      onComplete: () => graphics.destroy()
    });
  }

  /**
   * @description Triggers a massive AoE explosion that damages all enemies in radius.
   * @param {number} x - The x-coordinate of the supernova.
   * @param {number} y - The y-coordinate of the supernova.
   * @param {number} damage - Damage to apply.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - The group containing active enemies.
   * @returns {void}
   */
  triggerSupernova(x, y, damage, enemiesGroup) {
    const radius = 180;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(x, y, 10);
    
    // Expand and fade out
    this.scene.tweens.add({
      targets: graphics,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => graphics.destroy()
    });

    // Visual particles
    const explosionParticles = this.scene.add.particles(x, y, 'p_glow', {
        speed: { min: 200, max: 400 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xff0000, 0xff8800, 0xffff00],
        blendMode: 'ADD',
        lifespan: 500,
        quantity: 30,
    }).setDepth(15);
    this.scene.time.delayedCall(500, () => explosionParticles.destroy());

    // Hit detection
    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= radius) {
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(damage);
          } else if (enemy.hp !== undefined) {
            enemy.hp -= damage;
          }
        }
      }
    });
  }

  /**
   * @description Creates a stationary vortex that slowly damages and pulls enemies inside.
   * @param {number} x - The x-coordinate.
   * @param {number} y - The y-coordinate.
   * @param {number} damage - Damage applied continuously.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - Active enemies.
   * @returns {void}
   */
  triggerVoidVortex(x, y, damage, enemiesGroup) {
    const radius = 250;
    const duration = 3000;
    
    // Visuals
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(x, y, 40);
    graphics.lineStyle(4, 0x8800ff, 1);
    graphics.strokeCircle(x, y, 42);
    graphics.setDepth(4);

    this.scene.tweens.add({
      targets: graphics,
      angle: 360,
      duration: 1000,
      repeat: -1
    });

    // Tick logic for pull and damage
    const pullTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!graphics.active) return;
        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= radius) {
              this.scene.physics.moveTo(enemy, x, y, 150);
              enemy.hp -= damage * 0.5;
            }
          }
        });
      },
      loop: true
    });

    // Cleanup
    this.scene.time.delayedCall(duration, () => {
      pullTimer.remove();
      this.scene.tweens.add({
        targets: graphics,
        scaleX: 0, scaleY: 0, alpha: 0,
        duration: 400,
        onComplete: () => graphics.destroy()
      });
    });
  }

  /**
   * @description Activates a defensive Frost Aegis around the player, freezing nearby enemies.
   * @param {Phaser.GameObjects.Sprite} player - The player sprite.
   * @param {Phaser.Physics.Arcade.Group} enemiesGroup - Active enemies.
   * @param {number} damage - Damage applied on freeze.
   * @returns {void}
   */
  triggerFrostAegis(player, enemiesGroup, damage) {
    const radius = 120;
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(6, 0x00ffff, 0.7);
    graphics.strokeCircle(player.x, player.y, radius);
    graphics.fillStyle(0x00ffff, 0.1);
    graphics.fillCircle(player.x, player.y, radius);
    graphics.setDepth(15);

    const aegisTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        // Destroy if player dies
        if (!player.active) {
            graphics.destroy();
            aegisTimer.remove();
            return;
        }
        
        // Update position to follow player and pulse visuals
        graphics.clear();
        graphics.lineStyle(6, 0x00ffff, 0.7 + Math.sin(this.scene.time.now/100)*0.3);
        graphics.strokeCircle(player.x, player.y, radius);
        graphics.fillStyle(0x00ffff, 0.1);
        graphics.fillCircle(player.x, player.y, radius);

        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
            // Apply freeze and damage if inside radius and not already frozen
            if (dist <= radius && !enemy.isFrozen) {
              enemy.hp -= damage * 2;
              if (enemy.hp <= 0 && !enemy.isDying) {
                  this.scene.killEnemy(enemy);
              }
              enemy.isFrozen = true;
              enemy.setTint(0x00ffff);
              enemy.speed = 0;
              enemy.cryoUntil = this.scene.time.now + 1500;
            }
          }
        });
      },
      loop: true
    });

    // Cleanup after duration
    this.scene.time.delayedCall(5000, () => {
      aegisTimer.remove();
      this.scene.tweens.add({
        targets: graphics,
        alpha: 0,
        duration: 300,
        onComplete: () => graphics.destroy()
      });
    });
  }

  // ⚔️ SONIC WAVE ⚔️
  fireSonicWave(player, enemiesGroup, damage, level = 1) {
    if (!player || !player.active) return;
    const waveWidth = 300 + level * 50;
    const pushForce = 200 + level * 100;
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x00ccff, 0.4);
    gfx.fillRect(player.x - waveWidth / 2, player.y - 60, waveWidth, 20);
    gfx.setDepth(10);

    this.scene.tweens.add({
      targets: gfx, y: -400, alpha: 0, scaleX: 1.5, scaleY: 3,
      duration: 600, ease: 'Cubic.easeOut',
      onComplete: () => gfx.destroy()
    });

    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        const dx = Math.abs(enemy.x - player.x);
        if (dx <= waveWidth / 2 && enemy.y < player.y) {
          enemy.hp -= damage * (1 + level * 0.3);
          enemy.body.velocity.y = -pushForce;
          enemy.setTint(0x00ccff);
          this.scene.time.delayedCall(300, () => { if (enemy.active) enemy.clearTint(); });
        }
      }
    });
  }

  // 💣 PROXIMITY MINES 💣
  dropMine(x, y, damage, enemiesGroup, level = 1) {
    const mineRadius = 80 + level * 15;
    const mineDmg = damage * (2 + level * 0.5);
    const mine = this.scene.add.graphics();
    mine.fillStyle(0xff5500, 1);
    mine.fillCircle(0, 0, 8);
    mine.lineStyle(2, 0xff8800, 0.8);
    mine.strokeCircle(0, 0, 15);
    mine.setPosition(x, y).setDepth(3);

    this.scene.tweens.add({
      targets: mine, scaleX: 1.2, scaleY: 1.2,
      yoyo: true, repeat: -1, duration: 400
    });

    const checkTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!mine.active) return;
        const enemies = enemiesGroup.getChildren();
        for (const enemy of enemies) {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(mine.x, mine.y, enemy.x, enemy.y);
            if (dist <= 50) {
              checkTimer.remove();
              this.triggerMineExplosion(mine.x, mine.y, mineDmg, mineRadius, enemiesGroup);
              mine.destroy();
              return;
            }
          }
        }
      },
      loop: true
    });

    this.scene.time.delayedCall(15000, () => {
      if (mine.active) {
        checkTimer.remove();
        this.triggerMineExplosion(mine.x, mine.y, mineDmg, mineRadius, enemiesGroup);
        mine.destroy();
      }
    });
  }

  triggerMineExplosion(x, y, damage, radius, enemiesGroup) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xff5500, 0.8);
    gfx.fillCircle(x, y, 10);
    gfx.setDepth(15);

    this.scene.tweens.add({
      targets: gfx, scaleX: radius / 10, scaleY: radius / 10, alpha: 0,
      duration: 400, ease: 'Cubic.easeOut',
      onComplete: () => gfx.destroy()
    });

    const particles = this.scene.add.particles(x, y, 'p_glow', {
      speed: { min: 150, max: 350 }, scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xff2200, 0xff8800, 0xffcc00],
      blendMode: 'ADD', lifespan: 400, quantity: 20
    }).setDepth(15);
    this.scene.time.delayedCall(400, () => particles.destroy());

    this.scene.cameras.main.shake(100, 0.012);

    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= radius) {
          if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage);
          else if (enemy.hp !== undefined) enemy.hp -= damage;
        }
      }
    });
  }

  // 🌈 RAINBOW LASER (PHANTOM SPECIAL) 🌈
  fireRainbowLaser(player, enemiesGroup, damage) {
    if (!player || !player.active) return;
    
    // Create laser container that tracks player
    const laserContainer = this.scene.add.container(player.x, player.y - 50).setDepth(12);
    
    const lh = this.scene.scale.height * 1.5;

    // Use rectangles with origin at bottom-center (0.5, 1) so they extend upwards from the container
    const glow2 = this.scene.add.rectangle(0, 0, 70, lh, 0x00ffff).setOrigin(0.5, 1).setBlendMode('ADD').setAlpha(0.4);
    const glow1 = this.scene.add.rectangle(0, 0, 40, lh, 0xff00ff).setOrigin(0.5, 1).setBlendMode('ADD').setAlpha(0.8);
    const core = this.scene.add.rectangle(0, 0, 16, lh, 0xffffff).setOrigin(0.5, 1).setAlpha(1);
    
    laserContainer.add([glow2, glow1, core]);
    
    // Shake camera continuously
    const shakeEvent = this.scene.time.addEvent({
        delay: 100,
        callback: () => this.scene.cameras.main.shake(100, 0.015),
        loop: true
    });

    const duration = 1500; // 1.5 seconds
    const tickRate = 100; // damage every 100ms
    let elapsed = 0;
    
    // Particle emitter trailing the laser
    const particles = this.scene.add.particles(0, 0, 'p_glow', {
        x: { min: -25, max: 25 },
        y: { min: -lh, max: 0 },
        speedY: { min: -400, max: -800 },
        scale: { start: 0.8, end: 0 },
        tint: [0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0xff00ff],
        lifespan: 300,
        blendMode: 'ADD',
        frequency: 10
    });
    laserContainer.add(particles);

    const updateEvent = this.scene.time.addEvent({
        delay: tickRate,
        loop: true,
        callback: () => {
            elapsed += tickRate;
            if (!player || !player.active || elapsed >= duration) {
                shakeEvent.remove();
                updateEvent.remove();
                this.scene.tweens.add({
                    targets: laserContainer,
                    alpha: 0,
                    scaleX: 0,
                    duration: 200,
                    onComplete: () => laserContainer.destroy()
                });
                return;
            }
            
            // Move container with player, offset to horn
            laserContainer.setPosition(player.x, player.y - 50); 
            
            // Shift colors over time
            const colors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3];
            const cIdx = Math.floor(elapsed / 100) % colors.length;
            glow1.setFillStyle(colors[cIdx]);
            glow2.setFillStyle(colors[(cIdx + 3) % colors.length]);

            // Deal continuous damage
            const beamWidth = 65;
            const enemies = enemiesGroup.getChildren();
            enemies.forEach(enemy => {
                if (enemy && enemy.active) {
                    if (Math.abs(enemy.x - player.x) <= beamWidth && enemy.y < player.y) {
                        if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * 1.5);
                        else if (enemy.hp !== undefined) enemy.hp -= damage * 1.5;
                    }
                }
            });
        }
    });
  }

  // 💥 DOOM BEAM 💥
  fireDoomBeam(player, enemiesGroup, damage) {
    if (!player || !player.active) return;
    const beamWidth = 30;
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x8800ff, 0.9);
    gfx.fillRect(player.x - beamWidth / 2, 0, beamWidth, player.y);
    gfx.setDepth(10);

    const core = this.scene.add.graphics();
    core.fillStyle(0xffffff, 0.6);
    core.fillRect(player.x - 4, 0, 8, player.y);
    core.setDepth(11);

    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        if (Math.abs(enemy.x - player.x) <= beamWidth && enemy.y < player.y) {
          if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * 5);
          else if (enemy.hp !== undefined) enemy.hp -= damage * 5;
        }
      }
    });

    this.scene.cameras.main.shake(200, 0.015);
    this.scene.tweens.add({
      targets: [gfx, core], alpha: 0,
      duration: 500, onComplete: () => { gfx.destroy(); core.destroy(); }
    });
  }

  // 🛡️ MIRROR SHIELD 🛡️
  fireMirrorShieldProjectiles(player, enemiesGroup, damage) {
    if (!player || !player.active) return;
    const numProjectiles = 8;

    for (let i = 0; i < numProjectiles; i++) {
      const angle = (Math.PI * 2 / numProjectiles) * i;
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0x00ccff, 1);
      gfx.fillCircle(0, 0, 6);
      gfx.setPosition(player.x, player.y).setDepth(10);

      const speed = 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: gfx, x: gfx.x + vx, y: gfx.y + vy,
        duration: 800, ease: 'Cubic.easeOut',
        onUpdate: () => {
          const enemies = enemiesGroup.getChildren();
          enemies.forEach(enemy => {
            if (enemy && enemy.active && gfx.active) {
              const dist = Phaser.Math.Distance.Between(gfx.x, gfx.y, enemy.x, enemy.y);
              if (dist < 30) {
                if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * 2);
                else if (enemy.hp !== undefined) enemy.hp -= damage * 2;
              }
            }
          });
        },
        onComplete: () => gfx.destroy()
      });
    }
  }

  // 🔴 NEON SAWBLADES 🔴
  spawnSawblades(player, enemiesGroup, damage, level = 1) {
    const numBlades = 1 + level;
    const orbitRadius = 70;
    const bladeGraphics = [];

    for (let i = 0; i < numBlades; i++) {
      const gfx = this.scene.add.graphics();
      gfx.lineStyle(3, 0xff0088, 1);
      for (let t = 0; t < 8; t++) {
        const a = (Math.PI * 2 / 8) * t;
        gfx.moveTo(0, 0);
        gfx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      }
      gfx.strokePath();
      gfx.fillStyle(0xff0088, 0.8);
      gfx.fillCircle(0, 0, 6);
      gfx.setDepth(10);
      bladeGraphics.push({ gfx, offset: (Math.PI * 2 / numBlades) * i });
    }

    let elapsed = 0;
    const duration = 5000 + level * 1000;
    const hitCooldowns = new Map();

    const updateTimer = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        if (!player.active || elapsed >= duration) {
          updateTimer.remove();
          bladeGraphics.forEach(b => {
            this.scene.tweens.add({ targets: b.gfx, alpha: 0, scale: 0, duration: 200, onComplete: () => b.gfx.destroy() });
          });
          return;
        }

        const speed = 3 + level * 0.5;
        bladeGraphics.forEach(b => {
          const angle = (elapsed / 1000) * speed + b.offset;
          b.gfx.x = player.x + Math.cos(angle) * orbitRadius;
          b.gfx.y = player.y + Math.sin(angle) * orbitRadius;
          b.gfx.angle += 10;

          const enemies = enemiesGroup.getChildren();
          enemies.forEach(enemy => {
            if (enemy && enemy.active) {
              const dist = Phaser.Math.Distance.Between(b.gfx.x, b.gfx.y, enemy.x, enemy.y);
              if (dist < 30) {
                const key = enemy.x + '_' + enemy.y;
                const lastHit = hitCooldowns.get(key) || 0;
                if (elapsed - lastHit > 300) {
                  hitCooldowns.set(key, elapsed);
                  if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * (1 + level * 0.15));
                  else if (enemy.hp !== undefined) enemy.hp -= damage * (1 + level * 0.15);
                }
              }
            }
          });
        });
      },
      loop: true
    });
  }

  // 🔴 FOKUS-LASER 🔴
  fireFocusLaser(player, enemiesGroup, damage, level = 1) {
    if (!player || !player.active) return;
    const beamWidth = 6 + level * 2;
    const beamDuration = 1500 + level * 500;
    let elapsed = 0;

    const gfx = this.scene.add.graphics().setDepth(10);

    const timer = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        elapsed += 50;
        if (!player.active || elapsed >= beamDuration) {
          timer.remove();
          this.scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });
          return;
        }

        gfx.clear();
        gfx.fillStyle(0xff2200, 0.5);
        gfx.fillRect(player.x - beamWidth, 0, beamWidth * 2, player.y);
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillRect(player.x - 2, 0, 4, player.y);

        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active && Math.abs(enemy.x - player.x) <= beamWidth && enemy.y < player.y) {
            const tickDmg = damage * (0.5 + level * 0.3);
            if (typeof enemy.takeDamage === 'function') enemy.takeDamage(tickDmg);
            else if (enemy.hp !== undefined) enemy.hp -= tickDmg;
          }
        });
      },
      loop: true
    });
  }

  // 💛 HEAVY CANNON 💛
  fireHeavyCannon(player, enemiesGroup, damage, level = 1) {
    if (!player || !player.active) return;
    const size = 10 + level * 5;
    const cannonDmg = damage * (2 + level * 0.5);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffcc00, 0.4);
    gfx.fillCircle(0, 0, size + 6);
    gfx.fillStyle(0xffaa00, 1);
    gfx.fillCircle(0, 0, size);
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(0, 0, size * 0.4);
    gfx.setPosition(player.x, player.y - 20).setDepth(10);

    const startY = player.y - 20;
    const hitEnemies = new Set();

    this.scene.tweens.add({
      targets: gfx, y: -50,
      duration: 1200, ease: 'Linear',
      onUpdate: () => {
        if (!gfx.active) return;
        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active && !hitEnemies.has(enemy)) {
            const dist = Phaser.Math.Distance.Between(gfx.x, gfx.y, enemy.x, enemy.y);
            if (dist <= size + 15) {
              hitEnemies.add(enemy);
              if (typeof enemy.takeDamage === 'function') enemy.takeDamage(cannonDmg);
              else if (enemy.hp !== undefined) enemy.hp -= cannonDmg;
              this.scene.cameras.main.shake(80, 0.008);
            }
          }
        });
      },
      onComplete: () => gfx.destroy()
    });
  }

  // 🔥 DAMAGE AURA 🔥
  updateDamageAura(player, enemiesGroup, damage, level = 1) {
    const radius = 60 + level * 20;
    const tickDmg = damage * (0.3 + level * 0.15);

    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist <= radius) {
          if (typeof enemy.takeDamage === 'function') enemy.takeDamage(tickDmg);
          else if (enemy.hp !== undefined) enemy.hp -= tickDmg;
          enemy.setTint(0xff4400);
          this.scene.time.delayedCall(200, () => { if (enemy.active) enemy.clearTint(); });
        }
      }
    });
  }
}

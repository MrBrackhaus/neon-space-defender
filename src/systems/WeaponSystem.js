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
    
    let currentSource = sourceSprite;
    const maxJumps = 2 + level;
    let jumps = 0;
    const hitEnemies = new Set();
    let delay = 0;

    const findNextTarget = (source) => {
      let nearest = null;
      let minD = 250; // Jump radius
      const enemies = enemiesGroup.getChildren();
      for (const e of enemies) {
        if (e.active && !hitEnemies.has(e) && e.y < this.scene.scale.height) {
          const d = Phaser.Math.Distance.Between(source.x, source.y, e.x, e.y);
          if (d < minD) {
            minD = d;
            nearest = e;
          }
        }
      }
      return nearest;
    };

    const doJump = (source) => {
      if (jumps >= maxJumps) return;
      const target = findNextTarget(source);
      if (!target) return;

      hitEnemies.add(target);

      this.scene.time.delayedCall(delay, () => {
        if (!source.active && source !== sourceSprite) return;
        if (!target.active) return;

        // Draw premium jagged lightning arc
        const arc = this.scene.add.graphics().setDepth(13);
        arc.setBlendMode('ADD');
        
        const drawLightning = () => {
          arc.clear();
          arc.lineStyle(4, 0xffffff, 1);
          arc.beginPath();
          arc.moveTo(source.x, source.y);
          
          let cx = source.x;
          let cy = source.y;
          const segments = 5;
          const dx = (target.x - source.x) / segments;
          const dy = (target.y - source.y) / segments;
          
          for (let i = 1; i < segments; i++) {
              cx += dx + (Math.random() * 40 - 20);
              cy += dy + (Math.random() * 40 - 20);
              arc.lineTo(cx, cy);
          }
          arc.lineTo(target.x, target.y);
          arc.strokePath();
          
          // Outer blue glow
          arc.lineStyle(10, 0x00aaff, 0.6);
          arc.strokePath();
        };
        
        drawLightning();
        
        // Flicker effect
        this.scene.time.delayedCall(30, drawLightning);
        this.scene.time.delayedCall(60, drawLightning);

        // Flash screen slightly for each jump
        this.scene.cameras.main.shake(100, 0.005);
        
        // Retinal burn fade-out
        this.scene.tweens.add({
            targets: arc,
            alpha: 0,
            duration: 150,
            delay: 100,
            onComplete: () => arc.destroy()
        });

        // Impact spark on the target
        const spark = this.scene.add.circle(target.x, target.y, 25, 0x00ffff, 0.8).setBlendMode('ADD').setDepth(14);
        this.scene.tweens.add({ targets: spark, scale: 0, alpha: 0, duration: 200, onComplete: () => spark.destroy() });

        if (typeof target.takeDamage === 'function') target.takeDamage(damage * 1.2);
        else if (target.hp !== undefined) target.hp -= damage * 1.2;

        jumps++;
        doJump(target); // Next jump immediately queues with increased delay
      });
      delay += 80; // Delay for the cascading effect
    };

    doJump(currentSource);
  }

  fireBlackHole(x, y, duration, pullRadius, damage, enemiesGroup, level = 1) {
    const bhRadius = 20 + level * 5;
    
    // Core pitch-black circle
    const core = this.scene.add.circle(x, y, bhRadius, 0x000000).setDepth(11);
    
    // Swirling accretion disk
    const disk = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    
    let elapsed = 0;
    
    // Heavy localized camera shake upon spawning
    this.scene.cameras.main.shake(300, 0.02);

    const timer = this.scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        elapsed += 30;
        if (elapsed >= duration) {
          timer.remove();
          // Violent collapse
          this.scene.tweens.add({
              targets: core,
              scale: 0,
              duration: 300,
              ease: 'Back.easeIn',
              onComplete: () => {
                  core.destroy();
                  disk.destroy();
                  // Final explosive shockwave
                  const nova = this.scene.add.circle(x, y, 10, 0xff00ff, 1).setBlendMode('ADD').setDepth(13);
                  this.scene.tweens.add({ targets: nova, scale: 20, alpha: 0, duration: 400, onComplete: () => nova.destroy() });
              }
          });
          return;
        }

        // Rotate and pulsate accretion disk
        disk.clear();
        const numRings = 3;
        for (let r = 1; r <= numRings; r++) {
            const rot = elapsed * 0.01 * r;
            const radius = bhRadius + 15 * r + Math.sin(elapsed * 0.01) * 5;
            
            disk.lineStyle(3, r % 2 === 0 ? 0x00ffff : 0xaa00ff, 0.8 / r);
            disk.beginPath();
            disk.arc(x, y, radius, rot, rot + Math.PI * 1.5);
            disk.strokePath();
        }
        
        // Random inward-flying particles (event horizon)
        if (Math.random() < 0.5) {
            const angle = Math.random() * Math.PI * 2;
            const pDist = pullRadius;
            const px = x + Math.cos(angle) * pDist;
            const py = y + Math.sin(angle) * pDist;
            
            const p = this.scene.add.circle(px, py, 4, 0xff00ff, 1).setBlendMode('ADD').setDepth(9);
            this.scene.tweens.add({
                targets: p, x: x, y: y, alpha: 0, scale: 0.1, duration: 400,
                onComplete: () => p.destroy()
            });
        }

        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= pullRadius) {
              const pullFactor = 1 - (dist / pullRadius);
              const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, x, y);
              
              enemy.x += Math.cos(angle) * pullFactor * (5 + level);
              enemy.y += Math.sin(angle) * pullFactor * (5 + level);
              
              if (elapsed % 300 === 0) { // Tick damage every 300ms
                  const tickDmg = damage * 0.8;
                  if (typeof enemy.takeDamage === 'function') enemy.takeDamage(tickDmg);
                  else if (enemy.hp !== undefined) enemy.hp -= tickDmg;
              }
            }
          }
        });
      }
    });
  }

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
    const px = player.x;
    const py = player.y - 40;
    
    // Draw an actual curved sonic wave that travels upwards
    const arc = this.scene.add.graphics().setBlendMode('ADD').setDepth(11);
    const glow = this.scene.add.graphics().setBlendMode('ADD').setDepth(10);
    
    // Render the wave
    const renderWave = (yOffset, scale, alpha) => {
        arc.clear();
        glow.clear();
        
        arc.lineStyle(10, 0xffffff, alpha);
        arc.beginPath();
        arc.arc(px, py + yOffset + 100, waveWidth * scale, Math.PI * 1.1, Math.PI * 1.9);
        arc.strokePath();
        
        glow.lineStyle(30, 0x00ccff, alpha * 0.5);
        glow.beginPath();
        glow.arc(px, py + yOffset + 100, waveWidth * scale, Math.PI * 1.1, Math.PI * 1.9);
        glow.strokePath();
    };
    
    renderWave(0, 0.5, 1);
    
    // Animate the sonic wave flying forward (upwards)
    const waveObj = { yOffset: 0, scale: 0.5, alpha: 1 };
    
    this.scene.tweens.add({
        targets: waveObj,
        yOffset: -600,
        scale: 1.5,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
            renderWave(waveObj.yOffset, waveObj.scale, waveObj.alpha);
        },
        onComplete: () => {
            arc.destroy();
            glow.destroy();
        }
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
          
          // Small impact dust
          const dust = this.scene.add.circle(enemy.x, enemy.y, 20, 0x00ccff, 0.5).setBlendMode('ADD').setDepth(12);
          this.scene.tweens.add({ targets: dust, scale: 2, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
        }
      }
    });
  }

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
    
    const lh = this.scene.scale.height * 1.5;

    // We draw in world-space (positive height) to avoid any rendering bugs.
    const helix1 = this.scene.add.graphics().setBlendMode('ADD').setDepth(12);
    const helix2 = this.scene.add.graphics().setBlendMode('ADD').setDepth(12);
    const helix3 = this.scene.add.graphics().setBlendMode('ADD').setDepth(12);
    const core = this.scene.add.graphics().setBlendMode('ADD').setDepth(13);
    
    // Impact flare at the base of the horn
    const flareGlow = this.scene.add.circle(player.x, player.y - 50, 60, 0xff00ff, 0.7).setBlendMode('ADD').setDepth(12);
    const flareCore = this.scene.add.circle(player.x, player.y - 50, 30, 0xffffff, 1).setBlendMode('ADD').setDepth(13);
    
    // Pulse the flare
    const flareTween = this.scene.tweens.add({
        targets: [flareGlow, flareCore],
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 80,
        yoyo: true,
        repeat: -1
    });
    
    // Shake camera continuously
    const shakeEvent = this.scene.time.addEvent({
        delay: 100,
        callback: () => this.scene.cameras.main.shake(100, 0.02),
        loop: true
    });

    const duration = 1500; // 1.5 seconds
    const tickRate = 40; // High update rate for smooth helix animation
    let elapsed = 0;
    
    // High-speed upward particles
    const particles = this.scene.add.particles(player.x, player.y - 50, 'p_glow', {
        x: { min: -30, max: 30 },
        y: { min: -lh, max: 0 },
        speedY: { min: -1000, max: -2500 },
        scale: { start: 1.5, end: 0 },
        tint: [0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0xff00ff],
        lifespan: 300,
        blendMode: 'ADD',
        frequency: 10
    });
    particles.setDepth(12);

    const updateEvent = this.scene.time.addEvent({
        delay: tickRate,
        loop: true,
        callback: () => {
            elapsed += tickRate;
            if (!player || !player.active || elapsed >= duration) {
                shakeEvent.remove();
                updateEvent.remove();
                flareTween.stop();
                // ONLY fade alpha! DO NOT use scaleX: 0 here, because Graphics objects 
                // without set positions shrink towards the top-left screen corner!
                this.scene.tweens.add({
                    targets: [helix1, helix2, helix3, core, flareGlow, flareCore],
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        helix1.destroy();
                        helix2.destroy();
                        helix3.destroy();
                        core.destroy();
                        flareGlow.destroy();
                        flareCore.destroy();
                        particles.destroy();
                    }
                });
                return;
            }
            
            const startY = player.y - 50 - lh;
            const px = player.x;
            const py = player.y - 50;
            
            // Move flares and particles
            flareGlow.setPosition(px, py);
            flareCore.setPosition(px, py);
            particles.setPosition(px, py);
            
            // Shift colors rapidly
            const colors = [0xff0055, 0xffaa00, 0x00ff55, 0x00aaff, 0xaa00ff];
            const cIdx = Math.floor(elapsed / 60) % colors.length;
            const col1 = colors[cIdx];
            const col2 = colors[(cIdx + 2) % colors.length];
            const col3 = colors[(cIdx + 4) % colors.length];

            // Thin intense central core
            core.clear();
            core.fillStyle(0xffffff, 1);
            core.fillRoundedRect(px - 4, startY, 8, lh, 4);
            // Outer glow for core
            core.fillStyle(0x00ffff, 0.4);
            core.fillRoundedRect(px - 12, startY, 24, lh, 12);
            
            // Draw twisting double-helix neon beams
            helix1.clear();
            helix2.clear();
            helix3.clear();
            
            // Glow widths
            helix1.lineStyle(16, col1, 0.9);
            helix2.lineStyle(16, col2, 0.9);
            helix3.lineStyle(16, col3, 0.9);
            
            helix1.beginPath();
            helix2.beginPath();
            helix3.beginPath();
            
            // Speed of twisting
            const twistSpeed = elapsed * 0.02;
            const twistTightness = 0.025; // How tightly wound the helix is
            const beamWidth = 45; // How far the beams drift from the center
            
            for (let y = py; y >= startY; y -= 20) {
                // Calculate helix sine offsets
                // As y gets lower (closer to top of screen), the phase changes to create twists
                const phase = (py - y) * twistTightness;
                
                const off1 = Math.sin(phase - twistSpeed) * beamWidth;
                const off2 = Math.sin(phase - twistSpeed + Math.PI * 0.66) * beamWidth;
                const off3 = Math.sin(phase - twistSpeed + Math.PI * 1.33) * beamWidth;
                
                if (y === py) {
                    helix1.moveTo(px + off1, y);
                    helix2.moveTo(px + off2, y);
                    helix3.moveTo(px + off3, y);
                } else {
                    helix1.lineTo(px + off1, y);
                    helix2.lineTo(px + off2, y);
                    helix3.lineTo(px + off3, y);
                }
            }
            
            helix1.strokePath();
            helix2.strokePath();
            helix3.strokePath();
            
            flareGlow.setFillStyle(col1, 0.7);

            // Deal continuous damage (every 100ms)
            if (elapsed % 100 === 0) {
                const dmgRadius = 65;
                const enemies = enemiesGroup.getChildren();
                enemies.forEach(enemy => {
                    if (enemy && enemy.active) {
                        if (Math.abs(enemy.x - player.x) <= dmgRadius && enemy.y < player.y) {
                            if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * 1.5);
                            else if (enemy.hp !== undefined) enemy.hp -= damage * 1.5;
                        }
                    }
                });
            }
        }
    });
  }

  // 💥 DOOM BEAM 💥
  fireDoomBeam(player, enemiesGroup, damage) {
    if (!player || !player.active) return;
    
    const lh = this.scene.scale.height * 1.5;
    const px = player.x;
    
    // Core beam
    const core = this.scene.add.graphics().setBlendMode('ADD').setDepth(15);
    // Outer dark matter aura (using multiply or normal blend mode with dark colors)
    const aura = this.scene.add.graphics().setDepth(14);
    
    const beamWidth = 60;
    
    // Draw the static core
    core.fillStyle(0xffffff, 1);
    core.fillRoundedRect(px - 10, player.y - 50 - lh, 20, lh, 10);
    core.fillStyle(0x8800ff, 0.8);
    core.fillRoundedRect(px - 25, player.y - 50 - lh, 50, lh, 25);
    
    // Dark matter aura
    aura.fillStyle(0x220044, 0.7);
    aura.fillRoundedRect(px - beamWidth, player.y - 50 - lh, beamWidth * 2, lh, beamWidth);
    
    // Intense camera shake
    this.scene.cameras.main.shake(600, 0.04);
    
    // Base impact flare
    const flare = this.scene.add.circle(px, player.y - 50, 80, 0xaa00ff, 1).setBlendMode('ADD').setDepth(16);
    this.scene.tweens.add({
        targets: flare,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 300,
        yoyo: true,
        repeat: 1,
        onComplete: () => flare.destroy()
    });

    // Void particles surging UP
    const voidParticles = this.scene.add.particles(px, player.y - 50, 'p_glow', {
        x: { min: -beamWidth, max: beamWidth },
        y: { min: -lh, max: 0 },
        speedY: { min: -1500, max: -3000 },
        scale: { start: 1.2, end: 0 },
        tint: [0x8800ff, 0xff00ff, 0x440088, 0x000000],
        lifespan: 400,
        blendMode: 'ADD',
        quantity: 5
    });
    voidParticles.setDepth(15);
    
    // Deal massive damage
    const enemies = enemiesGroup.getChildren();
    enemies.forEach(enemy => {
      if (enemy && enemy.active) {
        if (Math.abs(enemy.x - player.x) <= beamWidth && enemy.y < player.y) {
          if (typeof enemy.takeDamage === 'function') enemy.takeDamage(damage * 10);
          else if (enemy.hp !== undefined) enemy.hp -= damage * 10;
        }
      }
    });

    // Fade out everything
    this.scene.tweens.add({
      targets: [core, aura],
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
          core.destroy();
          aura.destroy();
          voidParticles.destroy();
      }
    });
  }

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
    if (!player || !player.active) return;
    const numBlades = 1 + level;
    // Radius changed to 110 (just outside the 70px plasma orbitals)
    const orbitRadius = 110;
    const bladeGraphics = [];

    for (let i = 0; i < numBlades; i++) {
      const gfx = this.scene.add.graphics();
      // Draw a highly stylized circular neon sawblade
      gfx.lineStyle(4, 0xffffff, 1);
      gfx.strokeCircle(0, 0, 16);
      
      gfx.lineStyle(6, 0xff0088, 0.8);
      gfx.strokeCircle(0, 0, 20);
      
      // Draw teeth
      gfx.fillStyle(0xffffff, 1);
      for (let t = 0; t < 6; t++) {
        const a = (Math.PI * 2 / 6) * t;
        gfx.beginPath();
        gfx.moveTo(Math.cos(a)*15, Math.sin(a)*15);
        gfx.lineTo(Math.cos(a + 0.3)*28, Math.sin(a + 0.3)*28);
        gfx.lineTo(Math.cos(a + 0.6)*15, Math.sin(a + 0.6)*15);
        gfx.fillPath();
      }
      
      gfx.setBlendMode('ADD');
      gfx.setDepth(11);
      bladeGraphics.push({ gfx, offset: (Math.PI * 2 / numBlades) * i, rotation: 0 });
    }

    let elapsed = 0;
    const duration = 5000 + level * 1000;
    const hitCooldowns = new Map();

    const updateTimer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        if (!player.active || elapsed >= duration) {
          updateTimer.remove();
          bladeGraphics.forEach(bg => {
              this.scene.tweens.add({
                  targets: bg.gfx, alpha: 0, scale: 2, duration: 300,
                  onComplete: () => bg.gfx.destroy()
              });
          });
          return;
        }

        const timeInSec = elapsed / 1000;
        const orbitSpeed = 3;
        const spinSpeed = 25; // Extremely fast individual spin

        bladeGraphics.forEach(bg => {
          const currentAngle = timeInSec * orbitSpeed + bg.offset;
          const bx = player.x + Math.cos(currentAngle) * orbitRadius;
          const by = player.y + Math.sin(currentAngle) * orbitRadius;
          
          bg.gfx.setPosition(bx, by);
          bg.rotation += spinSpeed * 0.016;
          bg.gfx.setRotation(bg.rotation);
          
          // Motion blur / trail effect
          if (Math.random() < 0.3) {
              const trail = this.scene.add.circle(bx, by, 12, 0xff0088, 0.6).setBlendMode('ADD').setDepth(10);
              this.scene.tweens.add({ targets: trail, scale: 0, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
          }

          // Damage enemies
          const enemies = enemiesGroup.getChildren();
          enemies.forEach(enemy => {
            if (enemy && enemy.active) {
              const dist = Phaser.Math.Distance.Between(bx, by, enemy.x, enemy.y);
              if (dist <= 45) { // Slightly larger hit radius
                const lastHit = hitCooldowns.get(enemy) || 0;
                if (elapsed - lastHit > 200) {
                  const tickDmg = damage * 2;
                  if (typeof enemy.takeDamage === 'function') enemy.takeDamage(tickDmg);
                  else if (enemy.hp !== undefined) enemy.hp -= tickDmg;
                  hitCooldowns.set(enemy, elapsed);
                  
                  // Violent impact spark
                  const impact = this.scene.add.circle(bx, by, 35, 0xffffff, 1).setBlendMode('ADD').setDepth(15);
                  this.scene.tweens.add({ targets: impact, scale: 0, duration: 150, onComplete: () => impact.destroy() });
                }
              }
            }
          });
        });
      }
    });
  }

  fireFocusLaser(player, enemiesGroup, damage, level = 1) {
    if (!player || !player.active) return;
    
    const beamWidth = 12 + level * 3;
    const beamDuration = 1500 + level * 500;
    let elapsed = 0;

    const core = this.scene.add.graphics().setBlendMode('ADD').setDepth(12);
    const glow = this.scene.add.graphics().setBlendMode('ADD').setDepth(11);
    
    // Super intense laser start flare
    const flare = this.scene.add.circle(player.x, player.y - 40, 50, 0xffaa00, 1).setBlendMode('ADD').setDepth(13);
    this.scene.tweens.add({
        targets: flare, scaleX: 0.5, scaleY: 1.5, duration: 100, yoyo: true, repeat: -1
    });

    // Intense particles at the barrel
    const sparks = this.scene.add.particles(player.x, player.y - 30, 'p_glow', {
        speed: { min: 100, max: 400 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.8, end: 0 },
        tint: [0xffffff, 0xffcc00, 0xff2200],
        lifespan: 300,
        blendMode: 'ADD',
        frequency: 20
    });
    sparks.setDepth(13);

    const timer = this.scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        elapsed += 30;
        if (!player.active || elapsed >= beamDuration) {
          timer.remove();
          flare.destroy();
          this.scene.tweens.add({
              targets: [core, glow],
              alpha: 0,
              duration: 250,
              onComplete: () => {
                  core.destroy();
                  glow.destroy();
                  sparks.destroy();
              }
          });
          return;
        }
        
        const px = player.x;
        const py = player.y - 40;
        const lh = this.scene.scale.height * 1.5;
        const startY = py - lh;
        
        sparks.setPosition(px, py);
        flare.setPosition(px, py);

        // Core solid laser
        core.clear();
        core.fillStyle(0xffffff, 1);
        core.fillRect(px - beamWidth/3, startY, beamWidth*0.66, lh);
        
        // Multi-layered flickering glow
        glow.clear();
        glow.fillStyle(0xffffff, 0.9);
        glow.fillRect(px - beamWidth/1.5, startY, beamWidth*1.33, lh);
        
        const flickerAlpha = 0.6 + Math.random() * 0.4;
        glow.fillStyle(0xff4400, flickerAlpha);
        glow.fillRect(px - beamWidth, startY, beamWidth*2, lh);
        
        const wideFlicker = 0.3 + Math.random() * 0.3;
        glow.fillStyle(0xff0000, wideFlicker);
        glow.fillRect(px - beamWidth*2, startY, beamWidth*4, lh);
        
        // Helix wrapping around the laser
        glow.lineStyle(3, 0xffaa00, 1);
        glow.beginPath();
        for (let y = py; y >= startY; y -= 15) {
            const phase = (py - y) * 0.05 - (elapsed * 0.03);
            const off = Math.sin(phase) * beamWidth * 1.5;
            if (y === py) glow.moveTo(px + off, y);
            else glow.lineTo(px + off, y);
        }
        glow.strokePath();

        // Damage tick
        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active && Math.abs(enemy.x - px) <= beamWidth * 2 && enemy.y < py) {
            const tickDmg = damage * (1.2 + level * 0.5);
            if (typeof enemy.takeDamage === 'function') enemy.takeDamage(tickDmg);
            else if (enemy.hp !== undefined) enemy.hp -= tickDmg;
            
            // Violent impact explosions on the enemy
            if (Math.random() < 0.6) {
                const impact = this.scene.add.circle(enemy.x, enemy.y + (Math.random() * 40 - 20), 20 + Math.random() * 20, 0xffaa00, 1).setBlendMode('ADD').setDepth(15);
                this.scene.tweens.add({ targets: impact, scale: 2, alpha: 0, duration: 150, onComplete: () => impact.destroy() });
            }
          }
        });
      }
    });
  }

  fireHeavyCannon(player, enemiesGroup, damage, level = 1) {
    if (!player || !player.active) return;
    
    // Muzzle flash
    const flash = this.scene.add.circle(player.x, player.y - 40, 40, 0xffcc00, 1).setBlendMode('ADD').setDepth(13);
    this.scene.tweens.add({ targets: flash, scale: 0, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
    
    // Screen shake for heavy recoil
    this.scene.cameras.main.shake(150, 0.02);

    // Render a high-quality glowing plasma sphere
    const projectile = this.scene.add.graphics().setDepth(12);
    // Draw base shape at 0,0 and rely on positioning
    projectile.fillStyle(0xffaa00, 0.6);
    projectile.fillCircle(0, 0, 25);
    projectile.fillStyle(0xffffff, 1);
    projectile.fillCircle(0, 0, 12);
    projectile.setBlendMode('ADD');
    
    this.scene.physics.add.existing(projectile);
    projectile.body.setCircle(25, -25, -25); // Center physics body correctly
    projectile.setPosition(player.x, player.y - 40);
    projectile.body.setVelocityY(-400); // Slow but heavy
    
    // Comet trail effect
    const trailTimer = this.scene.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
            if (!projectile || !projectile.active) {
                trailTimer.remove();
                return;
            }
            const trail = this.scene.add.circle(projectile.x, projectile.y, 20, 0xffaa00, 0.6).setBlendMode('ADD').setDepth(11);
            this.scene.tweens.add({ targets: trail, scale: 0, alpha: 0, duration: 400, onComplete: () => trail.destroy() });
        }
    });

    // Custom collision handler instead of using the restrictive 'this.bullets' group
    this.scene.physics.add.overlap(projectile, enemiesGroup, (proj, enemy) => {
        const hitCooldowns = proj.hitCooldowns || (proj.hitCooldowns = new Map());
        const now = this.scene.time.now;
        const lastHit = hitCooldowns.get(enemy) || 0;
        
        // Only hit the same enemy once every 300ms (piercing logic)
        if (now - lastHit > 300) {
            hitCooldowns.set(enemy, now);
            const dmg = damage * (3 + level);
            if (typeof enemy.takeDamage === 'function') enemy.takeDamage(dmg);
            else if (enemy.hp !== undefined) enemy.hp -= dmg;
            
            // Explosive impact shockwave
            const shockwave = this.scene.add.circle(enemy.x, enemy.y, 20, 0xffffff, 0.8).setBlendMode('ADD').setDepth(14);
            this.scene.tweens.add({
                targets: shockwave,
                scale: 6,
                alpha: 0,
                duration: 300,
                onComplete: () => shockwave.destroy()
            });
        }
    });

    // Destroy when off screen
    const offScreenTimer = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
            if (!projectile.active) {
                offScreenTimer.remove();
                return;
            }
            if (projectile.y < -100) {
                projectile.destroy();
                offScreenTimer.remove();
            }
        }
    });
  }

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

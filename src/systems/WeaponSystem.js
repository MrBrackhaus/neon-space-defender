import Phaser from 'phaser';

export default class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
  }

  fireChainLightning(sourceSprite, enemiesGroup, damage, level = 1) {
    if (!sourceSprite || !sourceSprite.active) return;
    
    const maxJumps = Math.min(10, 3 + level);
    const appliedDamage = damage * (1 + level * 0.2);
    let currentSource = sourceSprite;
    const hitEnemies = new Set();
    
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
      
      // Create a jagged lightning effect by adding a midpoint with an offset
      let midX = (currentSource.x + closest.x) / 2;
      let midY = (currentSource.y + closest.y) / 2;
      const offset = 30; 
      midX += (Math.random() - 0.5) * offset;
      midY += (Math.random() - 0.5) * offset;
      
      graphics.lineTo(midX, midY);
      graphics.lineTo(closest.x, closest.y);
      graphics.strokePath();
      
      // Apply damage
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

  fireBlackHole(x, y, duration, pullRadius, damage, enemiesGroup, level = 1) {
    const actualDuration = duration + (level * 1000);
    const actualPullRadius = pullRadius + (level * 30);
    const tickDamage = damage * (1 + level * 0.2);

    const graphics = this.scene.add.graphics();
    // Dark purple swirling circle
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

    // Screen shake and flash
    this.scene.cameras.main.shake(100, 0.01);
    
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 400,
      onComplete: () => graphics.destroy()
    });
  }

  triggerSupernova(x, y, damage, enemiesGroup) {
    const radius = 180;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(x, y, 10);
    
    this.scene.tweens.add({
      targets: graphics,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => graphics.destroy()
    });

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
        if (!player.active) {
            graphics.destroy();
            aegisTimer.remove();
            return;
        }
        graphics.clear();
        graphics.lineStyle(6, 0x00ffff, 0.7 + Math.sin(this.scene.time.now/100)*0.3);
        graphics.strokeCircle(player.x, player.y, radius);
        graphics.fillStyle(0x00ffff, 0.1);
        graphics.fillCircle(player.x, player.y, radius);

        const enemies = enemiesGroup.getChildren();
        enemies.forEach(enemy => {
          if (enemy && enemy.active) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
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
}

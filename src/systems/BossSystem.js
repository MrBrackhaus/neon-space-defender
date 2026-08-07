/**
 * @file BossSystem.js
 * @description Handles interactive boss encounters, dialogue choices, and complex multi-part boss mechanics (hit zones).
 * @module BossSystem
 */

import Phaser from 'phaser';

export default class BossSystem {
    constructor(scene) {
        this.scene = scene;
    }

    // ─────────────────── CUSTOM BOSS INITIALIZATION ───────────────────
    initCustomBoss(bossSprite, type) {
        let title = "UNKNOWN ENTITY";
        let subtitle = "THE GALACTIC MENACE";
        let c1 = "[1] Attack!";
        let c2 = "[2] Defend!";
        
        if (type === 'boss') {
            title = "MECHA-GOUDA";
            subtitle = "PROTOKOLL: ZERSTÖREN. ZUTATEN: METALL & SCHMERZ.";
            c1 = "[1] 'Ich werde deine Schaltkreise schmelzen, du Blech-Brötchen!'";
            c2 = "[2] 'Lass uns das zivilisiert lösen... mit Laserfeuer!'";
        } else if (type === 'mothership') {
            title = "MOTHERSHIP";
            subtitle = "ALIEN CARRIER";
            c1 = "[1] 'Schilde durchbrechen!'";
            c2 = "[2] 'Auf Distanz bleiben!'";
        } else if (type === 'hivemind') {
            title = "HIVEMIND";
            subtitle = "THE SWARM QUEEN";
            c1 = "[1] 'Feuer konzentrieren!'";
            c2 = "[2] 'Drohnen abwehren!'";
        } else if (type === 'destroyer') {
            title = "VOID DESTROYER";
            subtitle = "END OF ALL THINGS";
            c1 = "[1] 'Alles oder Nichts!'";
            c2 = "[2] 'Schilde auf Maximum!'";
        } else if (type === 'boss_cheese') {
            title = "LORD GOUDA";
            subtitle = "DER CHOLERISCHE SCHMELZKÄSE-IMPERATOR";
            c1 = "[1] 'Dein metallischer Mantel ist gefallen! Jetzt kriegst du auf die Kruste!'";
            c2 = "[2] 'Verdammt, er mutiert! Alle laktosefreien Torpedos abfeuern!'";
        } else if (type === 'boss_irs') {
            title = "VOID I.R.S.";
            subtitle = "INTERDIMENSIONAL REVENUE SERVICE";
            c1 = "[1] 'Ich zahle keine Steuern!'";
            c2 = "[2] 'Ich habe meine Quittungen!'";
        } else if (type === 'boss_irs_p2') {
            title = "VOID I.R.S. - TRUE FORM";
            subtitle = "DER KOSMISCHE STEUER-DÄMON";
            c1 = "[1] 'Deine Frist ist abgelaufen!'";
            c2 = "[2] 'Zeit für eine Nachzahlung!'";
        } else if (type === 'boss_vacuum') {
            title = "ROOMBA-TRON 9000";
            subtitle = "THE 4D LITTER BOX";
            c1 = "[1] 'Staub saugen? Niemals!'";
            c2 = "[2] 'Katzenhaare blockieren deine Bürsten!'";
        } else if (type === 'boss_vacuum_p2') {
            title = "ROOMBA-TRON - MELTDOWN";
            subtitle = "CORE EXPOSED. CRITICAL ERROR.";
            c1 = "[1] 'System überhitzt!'";
            c2 = "[2] 'Lass ihn hochgehen!'";
        }

        this.showInteractiveBossIntro(title, subtitle, c1, c2, (modifier) => {
            bossSprite.combatModifier = modifier;
            // Apply unique boss AI logic after dialogue
            bossSprite.customType = type;
            bossSprite.nextAttack = this.scene.time.now + 2000;
            bossSprite.bossPhase = 1;
            
            // Setup base HP and zones if needed
            if (type === 'boss_irs') {
                this.setupHitZones(bossSprite); // IRS uses hitzones (tax evasion shields)
            }
            
            // Custom Update Loop for Boss Mechanics
            bossSprite.customUpdate = () => {
                if (!bossSprite.active) return;
                
                const now = this.scene.time.now;
                
                if (type === 'boss_cheese') {
                    // Lord Gouda: Shoots milk lasers (thick white beams) and spawns cheese meteorites
                    if (now > bossSprite.nextAttack) {
                        this.cheeseAttack(bossSprite, modifier);
                        bossSprite.nextAttack = now + (modifier.aggro ? 1500 : 2500);
                    }
                } else if (type.startsWith('boss_irs')) {
                    // IRS: Homing coins and heavy stamps
                    if (now > bossSprite.nextAttack) {
                        this.irsAttack(bossSprite, modifier);
                        bossSprite.nextAttack = now + 2000;
                    }
                } else if (type.startsWith('boss_vacuum')) {
                    // Roomba: Gravity well effect (sucks player in) and dust balls
                    this.vacuumGravityEffect(bossSprite);
                    if (now > bossSprite.nextAttack) {
                        this.vacuumAttack(bossSprite, modifier);
                        bossSprite.nextAttack = now + 3000;
                    }
                }
            };
            
            this.scene.events.on('update', bossSprite.customUpdate);
            bossSprite.once('destroy', () => {
                this.scene.events.off('update', bossSprite.customUpdate);
            });
        });
    }
    
    // ─────────────────── BOSS ATTACKS ───────────────────
    
    cheeseAttack(bossSprite, modifier) {
        if (!this.scene.player || !this.scene.player.active) return;
        
        // Spawn a cheese meteorite (using asteroid_2 as placeholder or normal asteroid)
        if (Math.random() > 0.5) {
            // Milk Laser (thick white projectile)
            const angle = Phaser.Math.Angle.Between(bossSprite.x, bossSprite.y, this.scene.player.x, this.scene.player.y);
            this.scene.fireEnemyBullet(bossSprite.x, bossSprite.y, angle, 400, 1.5, 'laser');
        } else {
            // Cheese meteorite (small bouncing hazard)
            if (this.scene.hazardSys) {
                this.scene.hazardSys.createAsteroid(
                    bossSprite.x + Phaser.Math.Between(-50, 50),
                    bossSprite.y + 100,
                    1,
                    Phaser.Math.Between(-150, 150),
                    Phaser.Math.Between(200, 400),
                    false
                );
            }
        }
        if(this.scene.audioSys) this.scene.audioSys.playShoot();
    }
    
    irsAttack(bossSprite, modifier) {
        if (!this.scene.player || !this.scene.player.active) return;
        
        // Homing coin
        const coin = this.scene.physics.add.sprite(bossSprite.x, bossSprite.y, 'proj_coin');
        coin.setScale(1.0);
        coin.setDepth(10);
        
        // Add overlap directly instead of polluting eBullets pool
        this.scene.physics.add.overlap(this.scene.player, coin, (player, c) => {
            if (!c.active) return;
            this.scene.damagePlayer(15);
            c.destroy();
        });
        
        // Custom update for homing
        coin.homingUpdate = () => {
            if (!coin.active || !this.scene.player || !this.scene.player.active) return;
            const angle = Phaser.Math.Angle.Between(coin.x, coin.y, this.scene.player.x, this.scene.player.y);
            this.scene.physics.velocityFromRotation(angle, 250, coin.body.velocity);
            coin.rotation += 0.1;
        };
        this.scene.events.on('update', coin.homingUpdate);
        coin.once('destroy', () => this.scene.events.off('update', coin.homingUpdate));
        
        this.scene.time.delayedCall(5000, () => { if(coin.active) coin.destroy(); });
        if(this.scene.audioSys) this.scene.audioSys.playShoot();
    }
    
    vacuumGravityEffect(bossSprite) {
        if (!this.scene.player || !this.scene.player.active) return;
        // Suck player towards boss
        const angle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, bossSprite.x, bossSprite.y);
        const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, bossSprite.x, bossSprite.y);
        
        // Stronger pull when closer
        if (distance < 600) {
            const pullForce = (600 - distance) * 0.5;
            this.scene.player.body.velocity.x += Math.cos(angle) * pullForce * 0.05;
            this.scene.player.body.velocity.y += Math.sin(angle) * pullForce * 0.05;
        }
    }
    
    vacuumAttack(bossSprite, modifier) {
        // Shoot dust balls (spread of 5 projectiles)
        for(let i=0; i<5; i++) {
            const angle = Phaser.Math.FloatBetween(Math.PI/4, Math.PI*3/4);
            const p = this.scene.physics.add.sprite(bossSprite.x, bossSprite.y + 50, 'proj_shooter').setDepth(6);
            p.setTint(0x555555); // Dust color
            p.setScale(0.8);
            
            // Add overlap directly instead of polluting eBullets pool
            this.scene.physics.add.overlap(this.scene.player, p, (player, proj) => {
                if (!proj.active) return;
                this.scene.damagePlayer(15);
                proj.destroy();
            });
            this.scene.physics.velocityFromRotation(angle, Phaser.Math.Between(150, 300), p.body.velocity);
            
            this.scene.time.delayedCall(4000, () => { if(p.active) p.destroy(); });
        }
        if(this.scene.audioSys) this.scene.audioSys.playShoot();
    }

    // ─────────────────── BOSS INTRO & DIALOGUE ───────────────────

    showInteractiveBossIntro(bossType, subtitleText, c1, c2, onChoiceComplete) {
        this.scene.physics.world.pause();

        const { width, height } = this.scene.cameras.main;

        const introContainer = this.scene.add.container(0, 0);
        introContainer.setDepth(1000);

        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        overlay.setOrigin(0, 0);
        introContainer.add(overlay);

        let portraitKey = 'jergeric_portrait'; // Fallback
        let animKey = 'anim_portrait_talk';
        
        if (bossType === "LORD GOUDA") {
            portraitKey = 'boss_cheese_portrait_anim';
            animKey = 'anim_portrait_talk';
        } else if (bossType === "MECHA-GOUDA") {
            portraitKey = 'boss_p1_portrait_anim';
            animKey = 'anim_p1_portrait_talk';
        } else if (bossType === "VOID I.R.S." || bossType === "VOID I.R.S. - TRUE FORM") {
            portraitKey = 'boss_irs_portrait_anim';
            animKey = 'anim_irs_portrait_talk';
        } else if (bossType === "ROOMBA-TRON 9000" || bossType === "ROOMBA-TRON - MELTDOWN") {
            portraitKey = 'boss_vacuum_portrait_anim';
            animKey = 'anim_vacuum_portrait_talk';
        }

        if (portraitKey) {
            const portrait = this.scene.add.sprite(width / 2, height * 0.2, portraitKey);
            if (animKey) {
                portrait.play(animKey, true);
            }
            portrait.setScale(0);
            portrait.setAlpha(0);
            introContainer.add(portrait);
            
            this.scene.tweens.add({
                targets: portrait,
                scaleX: 1.0,
                scaleY: 1.0,
                alpha: 1,
                duration: 600,
                ease: 'Back.out'
            });
        }

        const bossName = this.scene.add.text(width / 2, portraitKey ? height * 0.45 : height * 0.3, bossType.toUpperCase(), {
            fontFamily: 'Impact, sans-serif',
            fontSize: '72px',
            color: '#ff0044',
            stroke: '#ffffff',
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: false, fill: true }
        }).setOrigin(0.5);
        bossName.setScale(0); 
        introContainer.add(bossName);

        const subtitle = this.scene.add.text(width / 2, portraitKey ? height * 0.45 + 70 : height * 0.3 + 70, subtitleText, {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        subtitle.setAlpha(0);
        introContainer.add(subtitle);

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
                        this.showChoices(introContainer, width, height, c1, c2, onChoiceComplete);
                    }
                });
            }
        });
    }

    showChoices(container, width, height, c1Text, c2Text, onChoiceComplete) {
        const choice1 = this.scene.add.text(width / 2, height * 0.6, c1Text, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const choice2 = this.scene.add.text(width / 2, height * 0.7, c2Text, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        container.add(choice1);
        container.add(choice2);

        choice1.on('pointerover', () => choice1.setStyle({ color: '#ff5555', backgroundColor: '#555555' }));
        choice1.on('pointerout', () => choice1.setStyle({ color: '#ffffff', backgroundColor: '#333333' }));
        
        choice2.on('pointerover', () => choice2.setStyle({ color: '#55ffff', backgroundColor: '#555555' }));
        choice2.on('pointerout', () => choice2.setStyle({ color: '#ffffff', backgroundColor: '#333333' }));

        const resolveChoice = (modifier) => {
            container.destroy();
            this.scene.physics.world.resume();
            if (onChoiceComplete) {
                onChoiceComplete(modifier);
            }
        };

        choice1.on('pointerdown', () => {
            resolveChoice({ aggro: true, noShields: true });
        });

        choice2.on('pointerdown', () => {
            resolveChoice({ defensive: true, spawnMinions: true });
        });
    }

    // ─────────────────── BOSS HIT ZONES (from old file) ───────────────────
    setupHitZones(bossSprite) {
        bossSprite.hitZones = [];

        // Define hit zone properties (Tax Shield 1)
        const leftEngine = this.scene.add.rectangle(0, 0, 60, 80, 0xff0000, 0); 
        this.scene.physics.add.existing(leftEngine);
        leftEngine.body.setAllowGravity(false);
        leftEngine.body.setImmovable(true);
        this.scene.enemies.add(leftEngine);
        leftEngine.isHitZone = true;
        leftEngine.parentBoss = bossSprite;
        leftEngine.type = 'hitzone';
        leftEngine.hp = 800;
        leftEngine.isDestroyed = false;
        leftEngine.partName = 'Tax Shield Left';
        leftEngine.offsetX = -100; 
        leftEngine.offsetY = 40;

        // Define hit zone properties (Tax Shield 2)
        const rightEngine = this.scene.add.rectangle(0, 0, 60, 80, 0xff0000, 0);
        this.scene.physics.add.existing(rightEngine);
        rightEngine.body.setAllowGravity(false);
        rightEngine.body.setImmovable(true);
        this.scene.enemies.add(rightEngine);
        rightEngine.isHitZone = true;
        rightEngine.parentBoss = bossSprite;
        rightEngine.type = 'hitzone';
        rightEngine.hp = 800;
        rightEngine.isDestroyed = false;
        rightEngine.partName = 'Tax Shield Right';
        rightEngine.offsetX = 100;
        rightEngine.offsetY = 40;

        bossSprite.hitZones.push(leftEngine, rightEngine);

        // Make boss itself invulnerable until shields are down
        bossSprite.isInvulnerable = true;
        const shieldVisual = this.scene.add.circle(0, 0, 150, 0x00aaff, 0.2);
        shieldVisual.setStrokeStyle(4, 0x00ffff);
        shieldVisual.setDepth(10);
        
        bossSprite.updateHitZones = () => {
            if (!bossSprite.active) {
                leftEngine.destroy();
                rightEngine.destroy();
                shieldVisual.destroy();
                return;
            }

            leftEngine.setPosition(bossSprite.x + leftEngine.offsetX, bossSprite.y + leftEngine.offsetY);
            rightEngine.setPosition(bossSprite.x + rightEngine.offsetX, bossSprite.y + rightEngine.offsetY);
            shieldVisual.setPosition(bossSprite.x, bossSprite.y);
            
            if (leftEngine.isDestroyed && rightEngine.isDestroyed) {
                bossSprite.isInvulnerable = false;
                shieldVisual.setVisible(false);
            }
        };

        this.scene.events.on('update', bossSprite.updateHitZones);
        
        bossSprite.once('destroy', () => {
            this.scene.events.off('update', bossSprite.updateHitZones);
            leftEngine.destroy();
            rightEngine.destroy();
            shieldVisual.destroy();
        });
    }

    damageHitZone(hitZone, amount, bossSprite) {
        if (hitZone.isDestroyed) return;

        hitZone.hp -= amount;
        if (hitZone.hp <= 0) {
            hitZone.isDestroyed = true;
            hitZone.body.enable = false;
            this.triggerPartExplosion(hitZone);
            
            if (bossSprite && bossSprite.active) {
                bossSprite.setTint(0xffaaaa); 
                if (bossSprite.body) {
                    bossSprite.body.maxVelocity.x *= 0.7; 
                    bossSprite.body.maxVelocity.y *= 0.7;
                }
                this.scene.events.emit('bossPartDestroyed', hitZone.partName, bossSprite);
            }
        }
    }

    triggerPartExplosion(hitZone) {
        if (this.scene.audioSys) this.scene.audioSys.playExplosion();
        const blast = this.scene.add.circle(hitZone.x, hitZone.y, 40, 0xffaa00, 0.8);
        this.scene.tweens.add({
            targets: blast,
            scale: 2,
            alpha: 0,
            duration: 400,
            onComplete: () => blast.destroy()
        });
        this.scene.cameras.main.shake(100, 0.01);
    }
}

import Phaser from 'phaser';
import EventSystem from '../systems/EventSystem';

export default class TechTreeScene extends Phaser.Scene {
    constructor() {
        super('TechTreeScene');
    }

    init(data) {
        this.boughtTech = data?.boughtTech || false;
    }

    create() {
        const { width, height } = this.scale;
        this.eventSys = new EventSystem(this);
        
        if (this.boughtTech) {
            this.eventSys.triggerCompanionComment('unlock_tech');
        }

        // --- CAMERA SETTINGS ---
        this.cam = this.cameras.main;
        this.uiCam = this.cameras.add(0, 0, width, height);
        
        this.cam.fadeIn(500, 0, 0, 0);
        // The virtual world size for the tech tree
        this.cam.setBounds(-2000, -2000, 4000, 4000);
        this.cam.setZoom(0.6);

                // --- BACKGROUND ---
        this.cam.setBackgroundColor(0x010105);

        // Cyberpunk Parallax Grid (Moves with camera but slower)
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setScrollFactor(0.2);
        this.gridGraphics.lineStyle(2, 0x00aaff, 0.08); // More subtle blue
        for (let i = -3000; i < 3000; i += 150) {
            this.gridGraphics.moveTo(i, -3000).lineTo(i, 3000);
            this.gridGraphics.moveTo(-3000, i).lineTo(3000, i);
        }
        this.gridGraphics.strokePath();
        
        // Deep Space Particles
        this.particles = this.add.particles(0, 0, 'p_glow', {
            x: { min: -2000, max: 2000 },
            y: { min: -2000, max: 2000 },
            lifespan: { min: 4000, max: 10000 },
            speedX: { min: -10, max: 10 },
            speedY: { min: -10, max: 10 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            quantity: 2
        });

        // --- DATA ---
        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10) || 0;

                this.skills = [
            // ZENTRUM
            { id: 'dash', sheet: 'tech_defense', frame: 0, key: 'neon_tech_dash', name: 'Dash Modul', desc: 'Schaltet den Ausweich-Dash (Shift) frei. Der Ursprung deiner Reise.', cost: 50, x: 0, y: 0, req: null },
            
            // AST 1 (Links) - Überleben & Verteidigung
            { id: 'shield', sheet: 'tech_defense', frame: 1, key: 'neon_tech_shield', name: 'Schild Matrix', desc: 'Erlaubt regenerative Schilde als Upgrade im Level-Up Pool.', cost: 100, x: -250, y: 0, req: 'dash' },
            { id: 'revive', sheet: 'tech_defense', frame: 2, key: 'neon_tech_revive', name: 'Notfall-Reanimator', desc: 'Einmalige Wiederbelebung pro Lauf mit 30 HP.', cost: 400, x: -500, y: -150, req: 'shield' },
            { id: 'mirror_shield', sheet: 'tech_defense', frame: 3, key: 'neon_tech_mirror_shield', name: 'Reflektor-Schild', desc: 'Ersetzt normales Schild: Feuert bei Bruch Rache-Kugeln ab!', cost: 350, x: -500, y: 150, req: 'shield' },
            { id: 'aegis', sheet: 'tech_defense', frame: 4, key: 'neon_tech_aegis', name: 'Aegis-Rumpf', desc: '+50% maximale Gesundheit des Schiffs. Permanent.', cost: 300, x: -250, y: -300, req: 'shield' },
            { id: 'cryo', sheet: 'tech_weapons', frame: 0, key: 'neon_tech_cryo', name: 'Cryo-Strahl', desc: 'Schaltet dauerhaft verlangsamende Frostwaffen frei.', cost: 250, x: -500, y: -450, req: 'aegis' },
            
            // AST 2 (Oben) - Energie & Anomalie
            { id: 'tesla', sheet: 'tech_weapons', frame: 1, key: 'neon_tech_tesla', name: 'Tesla Spule', desc: 'Ermöglicht Kettenblitz-Upgrades im Spiel.', cost: 150, x: 0, y: -250, req: 'dash' },
            { id: 'singularity', sheet: 'tech_weapons', frame: 2, key: 'neon_tech_singularity', name: 'Singularität', desc: 'Schaltet Schwarze Löcher frei, die Gegner gnadenlos einsaugen.', cost: 350, x: 0, y: -500, req: 'tesla' },
            { id: 'void_shield', sheet: 'tech_defense', frame: 5, key: 'neon_tech_void_shield', name: 'Void-Antiresonanz', desc: 'Reduziert den Schaden durch Void-Feinde passiv um 15%.', cost: 400, x: -250, y: -750, req: 'singularity' },
            { id: 'fusion', sheet: 'tech_weapons', frame: 3, key: 'neon_tech_fusion', name: 'Fusion Core', desc: 'Schaltet extrem mächtige Waffen-Evolutionen beim Level-Up frei!', cost: 600, x: 250, y: -750, req: 'singularity' },
            { id: 'doom_beam', sheet: 'tech_weapons', frame: 4, key: 'neon_tech_doom_beam', name: 'Void-Giga-Laser', desc: 'Massiver, konstanter Laserstrahl direkt nach vorne.', cost: 750, x: 0, y: -1000, req: ['void_shield', 'fusion'] },
            
            // AST 3 (Rechts) - Artillerie & Helfer
            { id: 'drones', sheet: 'tech_weapons', frame: 5, key: 'neon_tech_drones', name: 'Kampfdrohnen', desc: 'Schaltet begleitende Angriffs-Drohnen frei.', cost: 150, x: 250, y: 0, req: 'dash' },
            { id: 'sonic_wave', sheet: 'tech_weapons', frame: 6, key: 'neon_tech_sonic_wave', name: 'Schall-Blaster', desc: 'Fügt eine extrem breite Druckwelle mit Knockback in den Pool ein.', cost: 300, x: 500, y: -150, req: 'drones' },
            { id: 'mines', sheet: 'tech_weapons', frame: 7, key: 'neon_tech_mines', name: 'Nova-Minenleger', desc: 'Droppt schwebende Neon-Minen hinter dir, die massiven Flächenschaden verursachen.', cost: 350, x: 750, y: -150, req: 'sonic_wave' },
            { id: 'laser_drones', sheet: 'tech_weapons', frame: 8, key: 'neon_tech_laser_drones', name: 'Laser-Drohnen', desc: 'Deine Kampfdrohnen feuern nun durchschlagende Laser statt normaler Projektile.', cost: 300, x: 500, y: 150, req: 'drones' },
            { id: 'orbitals', sheet: 'tech_weapons', frame: 9, key: 'neon_tech_orbitals', name: 'Plasma Orbitals', desc: 'Ermöglicht rotierende Nahkampf-Sägen um dein Schiff.', cost: 250, x: 250, y: 300, req: 'drones' },
            { id: 'pierce_start', sheet: 'tech_weapons', frame: 10, key: 'neon_tech_pierce_start', name: 'Durchdringer', desc: 'Startet JEDEN Lauf direkt mit einem Pierce-Buff.', cost: 350, x: 500, y: 450, req: 'orbitals' },
            { id: 'scatter', sheet: 'tech_weapons', frame: 11, key: 'neon_tech_scatter', name: 'Scatter Schiff', desc: 'Schaltet das Streuschuss-Schiff zur Auswahl frei.', cost: 500, x: 750, y: 300, req: 'pierce_start' },
            { id: 'railgun', sheet: 'tech_weapons', frame: 12, key: 'neon_tech_railgun', name: 'Railgun Schiff', desc: 'Schaltet das durchschlagende Scharfschützen-Schiff frei.', cost: 500, x: 750, y: 600, req: 'pierce_start' },
            
            // AST 4 (Rechts-Oben) - Klingen & Strahlen
            { id: 'sawblades', sheet: 'tech_weapons', frame: 13, key: 'neon_tech_sawblades', name: 'Neon-Sägeblätter', desc: 'Wirbelnde Laserklingen, die Gegner bei Kontakt zerfetzen.', cost: 200, x: 500, y: -450, req: 'drones' },
            { id: 'focus_laser', sheet: 'tech_weapons', frame: 14, key: 'neon_tech_focus_laser', name: 'Fokus-Laser', desc: 'Gebündelter Dauerstrahl. Schmilzt alles auf einer Linie.', cost: 450, x: 750, y: -600, req: 'sawblades' },
            
            // AST 5 (Unten) - Schwere Waffen & Aura
            { id: 'heavy_cannon', sheet: 'tech_weapons', frame: 15, key: 'neon_tech_heavy_cannon', name: 'Schiffskanone', desc: 'Feuert massige Neon-Kugeln ab. Langsam aber absolut brutal.', cost: 300, x: 0, y: 250, req: 'dash' },
            { id: 'damage_aura', sheet: 'tech_weapons', frame: 16, key: 'neon_tech_damage_aura', name: 'Schadensaura', desc: 'Permanenter Schadensring um dein Schiff. Vernichtet Nahkämpfer.', cost: 350, x: 0, y: 500, req: 'heavy_cannon' },
            
            // AST 6 (Links-Unten) - Ressourcen & Magneten
            { id: 'scrap_magnet', sheet: 'tech_defense', frame: 6, key: 'neon_tech_scrap_magnet', name: 'Schrott-Magnet', desc: 'Zieht Schrott und Glitzer-Cubes aus doppelter Entfernung an.', cost: 150, x: -250, y: 300, req: 'dash' },
            { id: 'cube_booster', sheet: 'tech_defense', frame: 7, key: 'neon_tech_cube_booster', name: 'Glitzer-Booster', desc: '+50% Chance auf Bonus-Cubes bei jedem Kill.', cost: 250, x: -500, y: 450, req: 'scrap_magnet' }
        ];

        this.skills.forEach(skill => {
            skill.unlocked = parseInt(localStorage.getItem(skill.key) || '0', 10) > 0;
        });

        // --- CONNECTIONS LAYER ---
        this.nodeGraphics = this.add.graphics();
        this.drawConnections();

        // --- NODES LAYER ---
        this.nodes = {};
        this.skills.forEach(skill => this.createNode(skill));

        // --- UI LAYER (Fixed to Screen) ---
        this.uiScene = this.scene.manager.getScene('TechTreeScene'); // same scene, but we use scrollFactor = 0
        this.buildFixedUI(width, height);

        // --- CAMERA CONTROLS ---
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
            if (pointer.x > width - 320 && this.sidePanel.visible) return; // Prevent drag on UI
            this.isDragging = true;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isDragging) {
                const dx = this.dragStartX - pointer.x;
                const dy = this.dragStartY - pointer.y;
                
                // Adjust drag amount by zoom level so dragging feels consistent
                this.cam.scrollX += dx / this.cam.zoom;
                this.cam.scrollY += dy / this.cam.zoom;
                
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                
                
                
                
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Zoom in or out based on deltaY
            let targetZoom = this.cam.zoom - (deltaY * 0.001);
            
            // Clamp zoom level
            targetZoom = Phaser.Math.Clamp(targetZoom, 0.4, 1.5);
            
            // Apply zoom
            this.cam.setZoom(targetZoom);
        });

        // Center camera on start
        this.cam.centerOn(0, 0);
    }

        buildFixedUI(width, height) {
        // --- HEADER BAR ---
        const headerBg = this.add.rectangle(0, 0, width, 120, 0x020205, 0.85).setOrigin(0, 0).setScrollFactor(0);
        headerBg.setStrokeStyle(2, 0x00ffff, 0.3);
        const headerGlow = this.add.rectangle(0, 120, width, 2, 0x00ffff, 0.5).setOrigin(0, 0).setScrollFactor(0);
        
        // Title
        const title = this.add.text(40, 20, 'NEON TECH NETWORK', {
            fontFamily: 'Orbitron', fontSize: '36px', color: '#00ffff', fontStyle: 'bold', letterSpacing: 6
        }).setOrigin(0, 0).setScrollFactor(0);
        title.setShadow(0, 0, '#00ffff', 15, true, true);

        // Back Button
        const backBtn = this.add.text(40, 75, '◄ RETURN TO BASE', {
            fontFamily: 'Orbitron', fontSize: '18px', color: '#ff0055', fontStyle: 'bold', letterSpacing: 2
        }).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        
        backBtn.on('pointerover', () => backBtn.setColor('#ffffff').setShadow(0,0,'#ff0055', 10, true, true));
        backBtn.on('pointerout', () => backBtn.setColor('#ff0055').setShadow(0,0,'#000', 0));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Scrap Display
        const scrapBg = this.add.rectangle(40, height - 80, 300, 60, 0x050510, 0.8).setOrigin(0, 0).setScrollFactor(0);
        scrapBg.setStrokeStyle(2, 0xffaa00, 0.5);
        this.scrapText = this.add.text(60, height - 65, `AVAILABLE SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '20px', color: '#ffaa00', fontStyle: 'bold'
        }).setOrigin(0, 0).setScrollFactor(0);
        this.scrapText.setShadow(0, 0, '#ffaa00', 10, true, true);

        // --- SIDE PANEL ---
        this.sidePanel = this.add.container(width, 0).setScrollFactor(0).setDepth(100);
        
        // Panel Background (Glassmorphism style)
        const panelBg = this.add.rectangle(0, 0, 350, height, 0x050510, 0.95).setOrigin(0, 0);
        panelBg.setStrokeStyle(4, 0x00ffff);
        panelBg.setInteractive(); // Block clicks through panel

        // Title
        this.spTitle = this.add.text(30, 80, 'SKILL NAME', {
            fontFamily: 'Orbitron', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 290 }
        });

        // Desc
        this.spDesc = this.add.text(30, 160, 'Description of the skill goes here.', {
            fontFamily: 'Share Tech Mono', fontSize: '16px', color: '#cccccc', wordWrap: { width: 290 }, lineSpacing: 6
        });

        // Cost
        this.spCost = this.add.text(30, height - 200, 'COST: 100 SCRAP', {
            fontFamily: 'Orbitron', fontSize: '20px', color: '#ffaa00', fontStyle: 'bold'
        });

        // Unlock Button
        this.spBtnBg = this.add.rectangle(175, height - 100, 290, 60, 0x334455).setInteractive({ useHandCursor: true });
        this.spBtnText = this.add.text(175, height - 100, 'UNLOCK', {
            fontFamily: 'Orbitron', fontSize: '22px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 2
        }).setOrigin(0.5);

        // Close Panel Button
        const closeBtn = this.add.text(310, 20, '✖', { fontSize: '30px', color: '#ff0055' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.hideSidePanel());

        this.sidePanel.add([panelBg, this.spTitle, this.spDesc, this.spCost, this.spBtnBg, this.spBtnText, closeBtn]);
        
        this.spBtnBg.on('pointerdown', () => this.attemptUnlock());

        this.sidePanel.x = width + 400; // Hidden initially
        this.selectedSkill = null;

        // --- CAMERA CULLING ---
        // Main camera ignores UI elements
        this.cam.ignore([headerBg, headerGlow, title, backBtn, scrapBg, this.scrapText, this.sidePanel]);
        // UI camera ignores game elements
        if (this.uiCam) {
            this.uiCam.ignore([this.gridGraphics, this.nodeGraphics, this.particles]);
        }
    }

        drawConnections() {
        this.nodeGraphics.clear();
        this.skills.forEach(skill => {
            if (skill.req) {
                const reqs = Array.isArray(skill.req) ? skill.req : [skill.req];
                reqs.forEach(reqId => {
                    const parent = this.skills.find(s => s.id === reqId);
                    if (parent) {
                        const isUnlocked = skill.unlocked;
                        const isAvailable = parent.unlocked && !skill.unlocked;
                        
                        let baseColor = 0x222233;
                        let baseAlpha = 0.5;
                        let baseThickness = 4;
                        
                        let glowColor = null;
                        
                        if (isUnlocked) {
                            baseColor = 0x00ffff;
                            baseAlpha = 1;
                            baseThickness = 4;
                            glowColor = 0x00aaff;
                        } else if (isAvailable) {
                            baseColor = 0xff00ff;
                            baseAlpha = 0.8;
                            baseThickness = 3;
                            glowColor = 0xaa00aa;
                        }

                        // Draw background glow if available
                        if (glowColor) {
                            this.nodeGraphics.lineStyle(baseThickness + 6, glowColor, 0.2);
                            this.nodeGraphics.beginPath();
                            this.nodeGraphics.moveTo(parent.x, parent.y);
                            this.nodeGraphics.lineTo(skill.x, skill.y);
                            this.nodeGraphics.strokePath();
                        }

                        // Draw main line
                        this.nodeGraphics.lineStyle(baseThickness, baseColor, baseAlpha);
                        this.nodeGraphics.beginPath();
                        this.nodeGraphics.moveTo(parent.x, parent.y);
                        this.nodeGraphics.lineTo(skill.x, skill.y);
                        this.nodeGraphics.strokePath();

                        if (isUnlocked) {
                            this.drawEnergyFlow(parent, skill);
                        }
                    }
                });
            }
        });
    }

    drawEnergyFlow(parent, skill) {
        // Simple visual polish: draw a small glowing circle moving from parent to skill
        const dot = this.add.circle(parent.x, parent.y, 4, 0xffffff).setDepth(5);
        if (this.uiCam) this.uiCam.ignore(dot);
        
        // Calculate distance to adjust duration so speed is constant
        const dist = Phaser.Math.Distance.Between(parent.x, parent.y, skill.x, skill.y);
        
        this.tweens.add({
            targets: dot,
            x: skill.x,
            y: skill.y,
            duration: dist * 8, // speed factor
            repeat: -1,
            ease: 'Linear',
            onUpdate: (tween, target) => {
                target.alpha = Math.max(0, 1 - tween.progress);
            }
        });
    }

        createNode(skill) {
        let reqsMet = true;
        if (skill.req) {
            const reqs = Array.isArray(skill.req) ? skill.req : [skill.req];
            reqs.forEach(reqId => {
                const parent = this.skills.find(s => s.id === reqId);
                if (!parent || !parent.unlocked) reqsMet = false;
            });
        }

        const isUnlocked = skill.unlocked;
        const isAvailable = !isUnlocked && reqsMet;

        let strokeColor = 0x222233;
        let fillColor = 0x05050a;
        let glow = false;

        if (isUnlocked) {
            strokeColor = 0x00ffff; // Cyan neon
            fillColor = 0x001122; // Dark cyan tint
            glow = true;
        } else if (isAvailable) {
            strokeColor = 0xff00ff; // Magenta neon
            fillColor = 0x220022; // Dark magenta tint
        }

        const container = this.add.container(skill.x, skill.y).setDepth(10);
        
        // Glassmorphism inner hex
        const hexBg = this.add.polygon(0, 0, this.getHexPoints(45), fillColor, 0.85)
            .setStrokeStyle(4, strokeColor, 1)
            .setInteractive(new Phaser.Geom.Polygon(this.getHexPoints(45)), Phaser.Geom.Polygon.Contains, { useHandCursor: true });
        
        // Glow effect behind the hex for unlocked/available
        if (glow || isAvailable) {
            const outerGlow = this.add.polygon(0, 0, this.getHexPoints(52), strokeColor, 0.15);
            container.add(outerGlow);
            
            if (glow) {
                // Breathing glow animation
                this.tweens.add({
                    targets: outerGlow,
                    scale: 1.08,
                    alpha: 0.25,
                    duration: 1500,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        }

        const iconKey = (skill.sheet || 'tech_defense') + '_' + (skill.frame || 0);
        const iconSprite = this.add.sprite(0, 0, iconKey);
        iconSprite.setOrigin(0.5, 0.5);
        iconSprite.setScale(0.45);

        if (!isUnlocked) {
            iconSprite.setTint(0x444455);
            iconSprite.setAlpha(0.4);
        } else {
            iconSprite.setTint(0xffffff);
            iconSprite.setAlpha(1.0);
        }

        container.add([hexBg, iconSprite]);
        if (this.uiCam) this.uiCam.ignore(container);

        // Hover effects
        hexBg.on('pointerover', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playHover();
            if (!this.isDragging) {
                hexBg.setStrokeStyle(6, 0xffffff, 1);
                this.tweens.add({ targets: container, scale: 1.15, duration: 200, ease: 'Back.out' });
            }
        });

        hexBg.on('pointerout', () => {
            hexBg.setStrokeStyle(4, strokeColor, 1);
            this.tweens.add({ targets: container, scale: 1.0, duration: 200, ease: 'Cubic.out' });
        });

        hexBg.on('pointerdown', (pointer) => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
            this.time.delayedCall(150, () => {
                if (!this.isDragging) {
                    this.showSidePanel(skill, isUnlocked, isAvailable);
                    this.cam.pan(skill.x, skill.y, 600, 'Cubic.easeOut');
                }
            });
        });

        this.nodes[skill.id] = container;
    }

    getHexPoints(size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            // Shift points so min is 0,0 instead of -size,-size
            // This prevents Phaser from doing weird origin offset math
            points.push(size + size * Math.cos(angle_rad));
            points.push(size + size * Math.sin(angle_rad));
        }
        return points;
    }

    showSidePanel(skill, isUnlocked, isAvailable) {
        this.selectedSkill = { skill, isUnlocked, isAvailable };
        
        this.spTitle.setText(skill.name);
        this.spDesc.setText(skill.desc);
        
        if (isUnlocked) {
            this.spTitle.setColor('#00ffff');
            this.spCost.setText('STATUS: ACQUIRED');
            this.spCost.setColor('#00ff00');
            this.spBtnBg.setFillStyle(0x334455);
            this.spBtnText.setText('UNLOCKED').setColor('#888899');
        } else {
            this.spTitle.setColor(isAvailable ? '#ff00ff' : '#aaaaaa');
            this.spCost.setText(isAvailable ? `COST: ${skill.cost} SCHROTT` : 'STATUS: LOCKED');
            this.spCost.setColor(isAvailable ? '#ffaa00' : '#ff0000');
            
            if (isAvailable && this.scrap >= skill.cost) {
                this.spBtnBg.setFillStyle(0xff00ff);
                this.spBtnText.setText('UNLOCK').setColor('#ffffff');
            } else if (isAvailable) {
                this.spBtnBg.setFillStyle(0x440000);
                this.spBtnText.setText('INSUFFICIENT FUNDS').setColor('#ffaaaa');
            } else {
                this.spBtnBg.setFillStyle(0x222222);
                this.spBtnText.setText('LOCKED').setColor('#555555');
            }
        }

        // Slide in
        if (this.sidePanel.x > this.scale.width - 350) {
            this.tweens.add({
                targets: this.sidePanel,
                x: this.scale.width - 350,
                duration: 400,
                ease: 'Cubic.out'
            });
        }
    }

    hideSidePanel() {
        this.tweens.add({
            targets: this.sidePanel,
            x: this.scale.width + 400,
            duration: 300,
            ease: 'Cubic.in'
        });
    }

    attemptUnlock() {
        if (!this.selectedSkill) return;
        const { skill, isUnlocked, isAvailable } = this.selectedSkill;
        
        if (isAvailable && this.scrap >= skill.cost) {
            // Execute Purchase
            this.scrap -= skill.cost;
            localStorage.setItem('neon_scrap', this.scrap);
            localStorage.setItem(skill.key, '1');
            
            this.hideSidePanel();
            
            // Particle Burst on node
            const emitter = this.add.particles(skill.x, skill.y, 'p_glow', {
                speed: { min: 50, max: 200 },
                scale: { start: 0.5, end: 0 },
                lifespan: 1000,
                blendMode: 'ADD',
                quantity: 30
            });
            emitter.setDepth(20);
            emitter.explode();

            // Flash Screen
            const flash = this.add.rectangle(this.cam.scrollX, this.cam.scrollY, 4000, 4000, 0xffffff, 0.4).setOrigin(0,0).setDepth(200);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 400,
                onComplete: () => { 
                    flash.destroy();
                    this.scene.restart({ boughtTech: true }); 
                }
            });
        } else if (isAvailable && this.scrap < skill.cost) {
            // Shake UI
            this.cameras.main.shake(200, 0.005);
        }
    }
}

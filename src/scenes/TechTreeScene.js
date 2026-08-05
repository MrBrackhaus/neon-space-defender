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
        this.cam.fadeIn(500, 0, 0, 0);
        // The virtual world size for the tech tree
        this.cam.setBounds(-2000, -2000, 4000, 4000);
        this.cam.setZoom(1);

        // --- BACKGROUND ---
        this.add.rectangle(-2000, -2000, 4000, 4000, 0x02020a).setOrigin(0, 0);

        // Cyberpunk Parallax Grid (Moves with camera but slower)
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(2, 0x00ffff, 0.05);
        for (let i = -2000; i < 2000; i += 100) this.gridGraphics.moveTo(i, -2000).lineTo(i, 2000);
        for (let j = -2000; j < 2000; j += 100) this.gridGraphics.moveTo(-2000, j).lineTo(2000, j);
        this.gridGraphics.strokePath();
        
        // Deep Space Particles
        this.add.particles(0, 0, 'p_glow', {
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
        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10);

        this.skills = [
            // ZENTRUM
            { id: 'dash', key: 'neon_tech_dash', name: 'Dash Modul', desc: 'Schaltet den Ausweich-Dash (Shift) frei. Der Ursprung deiner Reise.', cost: 50, x: 0, y: 0, req: null },
            
            // AST 1 (Links) - Überleben & Verteidigung
            { id: 'shield', key: 'neon_tech_shield', name: 'Schild Matrix', desc: 'Erlaubt regenerative Schilde als Upgrade im Level-Up Pool.', cost: 100, x: -200, y: 150, req: 'dash' },
            { id: 'revive', key: 'neon_tech_revive', name: 'Notfall-Reanimator', desc: 'Einmalige Wiederbelebung pro Lauf mit 30 HP.', cost: 400, x: -400, y: 150, req: 'shield' },
            { id: 'mirror_shield', key: 'neon_tech_mirror_shield', name: 'Reflektor-Schild', desc: 'Ersetzt normales Schild: Feuert bei Bruch Rache-Kugeln ab!', cost: 350, x: -400, y: 0, req: 'shield' },
            { id: 'aegis', key: 'neon_tech_aegis', name: 'Aegis-Rumpf', desc: '+50% maximale Gesundheit des Schiffs. Permanent.', cost: 300, x: -200, y: 350, req: 'shield' },
            { id: 'cryo', key: 'neon_tech_cryo', name: 'Cryo-Strahl', desc: 'Schaltet dauerhaft verlangsamende Frostwaffen frei.', cost: 250, x: -400, y: 350, req: 'aegis' },
            
            // AST 2 (Oben) - Energie & Anomalie
            { id: 'tesla', key: 'neon_tech_tesla', name: 'Tesla Spule', desc: 'Ermöglicht Kettenblitz-Upgrades im Spiel.', cost: 150, x: 0, y: -200, req: 'dash' },
            { id: 'singularity', key: 'neon_tech_singularity', name: 'Singularität', desc: 'Schaltet Schwarze Löcher frei, die Gegner gnadenlos einsaugen.', cost: 350, x: 0, y: -400, req: 'tesla' },
            { id: 'void_shield', key: 'neon_tech_void_shield', name: 'Void-Antiresonanz', desc: 'Reduziert den Schaden durch Void-Feinde passiv um 15%.', cost: 400, x: -200, y: -550, req: 'singularity' },
            { id: 'fusion', key: 'neon_tech_fusion', name: 'Fusion Core', desc: 'Schaltet extrem mächtige Waffen-Evolutionen beim Level-Up frei!', cost: 600, x: 200, y: -550, req: 'singularity' },
            { id: 'doom_beam', key: 'neon_tech_doom_beam', name: 'Void-Giga-Laser', desc: 'Massiver, konstanter Laserstrahl direkt nach vorne.', cost: 750, x: 0, y: -700, req: ['void_shield', 'fusion'] },
            
            // AST 3 (Rechts) - Artillerie & Helfer
            { id: 'drones', key: 'neon_tech_drones', name: 'Kampfdrohnen', desc: 'Schaltet begleitende Angriffs-Drohnen frei.', cost: 150, x: 200, y: 150, req: 'dash' },
            { id: 'sonic_wave', key: 'neon_tech_sonic_wave', name: 'Schall-Blaster', desc: 'Fügt eine extrem breite Druckwelle mit Knockback in den Pool ein.', cost: 300, x: 200, y: 0, req: 'drones' },
            { id: 'mines', key: 'neon_tech_mines', name: 'Nova-Minenleger', desc: 'Droppt schwebende Neon-Minen hinter dir, die massiven Flächenschaden verursachen.', cost: 350, x: 400, y: 0, req: 'sonic_wave' },
            { id: 'laser_drones', key: 'neon_tech_laser_drones', name: 'Laser-Drohnen', desc: 'Deine Kampfdrohnen feuern nun durchschlagende Laser statt normaler Projektile.', cost: 300, x: 400, y: 150, req: 'drones' },
            { id: 'orbitals', key: 'neon_tech_orbitals', name: 'Plasma Orbitals', desc: 'Ermöglicht rotierende Nahkampf-Sägen um dein Schiff.', cost: 250, x: 200, y: 350, req: 'drones' },
            { id: 'pierce_start', key: 'neon_tech_pierce_start', name: 'Durchdringer', desc: 'Startet JEDEN Lauf direkt mit einem Pierce-Buff.', cost: 350, x: 400, y: 350, req: 'orbitals' },
            { id: 'scatter', key: 'neon_tech_scatter', name: 'Scatter Schiff', desc: 'Schaltet das Streuschuss-Schiff zur Auswahl frei.', cost: 500, x: 600, y: 200, req: 'pierce_start' },
            { id: 'railgun', key: 'neon_tech_railgun', name: 'Railgun Schiff', desc: 'Schaltet das durchschlagende Scharfschützen-Schiff frei.', cost: 500, x: 600, y: 500, req: 'pierce_start' },

            // AST 4 (Rechts-Oben) - Klingen & Strahlen
            { id: 'sawblades', key: 'neon_tech_sawblades', name: 'Neon-Sägeblätter', desc: 'Wirbelnde Laserklingen, die Gegner bei Kontakt zerfetzen.', cost: 200, x: 400, y: -200, req: 'drones' },
            { id: 'focus_laser', key: 'neon_tech_focus_laser', name: 'Fokus-Laser', desc: 'Gebündelter Dauerstrahl. Schmilzt alles auf einer Linie.', cost: 450, x: 600, y: -200, req: 'sawblades' },

            // AST 5 (Unten) - Schwere Waffen & Aura
            { id: 'heavy_cannon', key: 'neon_tech_heavy_cannon', name: 'Schiffskanone', desc: 'Feuert massige Neon-Kugeln ab. Langsam aber absolut brutal.', cost: 300, x: 0, y: 200, req: 'dash' },
            { id: 'damage_aura', key: 'neon_tech_damage_aura', name: 'Schadensaura', desc: 'Permanenter Schadensring um dein Schiff. Vernichtet Nahkämpfer.', cost: 350, x: 0, y: 400, req: 'heavy_cannon' },

            // AST 6 (Links-Oben) - Ressourcen & Magneten
            { id: 'scrap_magnet', key: 'neon_tech_scrap_magnet', name: 'Schrott-Magnet', desc: 'Zieht Schrott und Glitzer-Cubes aus doppelter Entfernung an.', cost: 150, x: -200, y: -200, req: 'dash' },
            { id: 'cube_booster', key: 'neon_tech_cube_booster', name: 'Glitzer-Booster', desc: '+50% Chance auf Bonus-Cubes bei jedem Kill.', cost: 250, x: -400, y: -200, req: 'scrap_magnet' }
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
                
                // Parallax effect on grid
                this.gridGraphics.x = this.cam.scrollX * 0.2;
                this.gridGraphics.y = this.cam.scrollY * 0.2;
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
        // Title
        const title = this.add.text(40, 40, 'TECH TREE', {
            fontFamily: 'Orbitron', fontSize: '42px', color: '#00ffff', fontStyle: 'bold', letterSpacing: 4
        }).setOrigin(0, 0).setScrollFactor(0);
        title.setShadow(0, 0, '#00ffff', 20, true, true);

        // Back Button
        const backBtn = this.add.text(40, 100, '◄ MAIN MENU', {
            fontFamily: 'Orbitron', fontSize: '20px', color: '#ff0055', fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        
        backBtn.on('pointerover', () => backBtn.setColor('#ffffff').setShadow(0,0,'#ff0055', 10, true, true));
        backBtn.on('pointerout', () => backBtn.setColor('#ff0055').setShadow(0,0,'#000', 0));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Scrap Display
        this.scrapText = this.add.text(40, height - 60, `SCHROTT: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '28px', color: '#ffaa00', fontStyle: 'bold'
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
                        
                        let lineColor = 0x333344;
                        let lineAlpha = 0.4;
                        let lineThickness = 3;

                        if (isUnlocked) {
                            lineColor = 0x00ffff;
                            lineAlpha = 1;
                            lineThickness = 6;
                        } else if (isAvailable) {
                            lineColor = 0xff00ff;
                            lineAlpha = 0.8;
                            lineThickness = 4;
                        }

                        this.nodeGraphics.lineStyle(lineThickness, lineColor, lineAlpha);
                        this.nodeGraphics.beginPath();
                        this.nodeGraphics.moveTo(parent.x, parent.y);
                        this.nodeGraphics.lineTo(skill.x, skill.y);
                        this.nodeGraphics.strokePath();

                        // Draw moving energy dots on unlocked paths
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

        let strokeColor = 0x333344;
        let fillColor = 0x0a0a1a;
        let textColor = '#555566';
        let glow = false;

        if (isUnlocked) {
            strokeColor = 0x00ffff;
            fillColor = 0x003344;
            textColor = '#ffffff';
            glow = true;
        } else if (isAvailable) {
            strokeColor = 0xff00ff;
            fillColor = 0x330033;
            textColor = '#ffffff';
        }

        const container = this.add.container(skill.x, skill.y).setDepth(10);
        
        // AAA Hexagon instead of simple rotated square
        const hex = this.add.polygon(0, 0, this.getHexPoints(45), fillColor)
            .setStrokeStyle(4, strokeColor)
            .setInteractive(new Phaser.Geom.Polygon(this.getHexPoints(45)), Phaser.Geom.Polygon.Contains, { useHandCursor: true });
        
        if (glow) {
            const glowHex = this.add.polygon(0, 0, this.getHexPoints(50), 0x00ffff, 0.3);
            container.add(glowHex);
            
            // Subtle pulse
            this.tweens.add({
                targets: glowHex,
                scale: 1.1,
                alpha: 0.1,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }

        const initials = skill.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        const iconText = this.add.text(0, 0, initials, {
            fontFamily: 'Orbitron', fontSize: '30px', color: textColor, fontStyle: 'bold'
        }).setOrigin(0.5);
        if (glow) iconText.setShadow(0, 0, '#00ffff', 10, true, true);

        container.add([hex, iconText]);

        hex.on('pointerover', () => {
            if (!this.isDragging) {
                hex.setStrokeStyle(5, 0xffffff);
                this.tweens.add({ targets: container, scale: 1.1, duration: 150 });
            }
        });

        hex.on('pointerout', () => {
            hex.setStrokeStyle(4, strokeColor);
            this.tweens.add({ targets: container, scale: 1.0, duration: 150 });
        });

        hex.on('pointerdown', (pointer) => {
            // Distinguish click from drag
            this.time.delayedCall(150, () => {
                if (!this.isDragging) {
                    this.showSidePanel(skill, isUnlocked, isAvailable);
                    this.cam.pan(skill.x, skill.y, 500, 'Cubic.easeOut');
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
            points.push(size * Math.cos(angle_rad));
            points.push(size * Math.sin(angle_rad));
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

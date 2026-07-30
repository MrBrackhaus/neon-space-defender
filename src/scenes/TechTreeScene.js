import Phaser from 'phaser';

export default class TechTreeScene extends Phaser.Scene {
    constructor() {
        super('TechTreeScene');
    }

    create() {
        const { width, height } = this.scale;
        
        // --- BACKGROUND ---
        this.add.rectangle(0, 0, width, height, 0x05050f).setOrigin(0, 0);
        
        // Cyberpunk grid
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x00ffff, 0.07);
        for(let i = 0; i < width; i += 60) grid.moveTo(i, 0).lineTo(i, height);
        for(let j = 0; j < height; j += 60) grid.moveTo(0, j).lineTo(width, j);
        grid.strokePath();

        // --- TITLE ---
        const title = this.add.text(width / 2, 60, 'TECH TREE', {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '52px',
            color: '#00ffff',
            fontStyle: 'bold',
            letterSpacing: 4
        }).setOrigin(0.5);
        title.setShadow(0, 0, '#00ffff', 25, true, true);

        // --- BACK BUTTON ---
        const backBtn = this.add.text(40, 40, '◄ BACK', {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '24px',
            color: '#ff0055',
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });
        
        backBtn.on('pointerover', () => {
            backBtn.setColor('#ffffff');
            backBtn.setShadow(0, 0, '#ff0055', 15, true, true);
        });
        backBtn.on('pointerout', () => {
            backBtn.setColor('#ff0055');
            backBtn.setShadow(0, 0, '#000000', 0, false, false);
        });
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // --- DATA ---
        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10); 

        // Skill definitions
        this.skills = [
            { id: 'dash', key: 'neon_tech_dash', name: 'Dash Modul', desc: 'Schaltet den Ausweich-Dash (Shift) frei.', cost: 200, x: width/2, y: 150, req: null },
            
            { id: 'shield', key: 'neon_tech_shield', name: 'Schild Matrix', desc: 'Erlaubt regenerative Schilde als Upgrade.', cost: 400, x: width/2 - 250, y: 270, req: 'dash' },
            { id: 'cryo', key: 'neon_tech_cryo', name: 'Cryo-Strahl', desc: 'Schaltet dauerhaft verlangsamende Frostwaffen frei.', cost: 600, x: width/2 - 350, y: 390, req: 'shield' },
            { id: 'tesla', key: 'neon_tech_tesla', name: 'Tesla Spule', desc: 'Ermöglicht Kettenblitz-Upgrades im Spiel.', cost: 600, x: width/2 - 150, y: 390, req: 'shield' },
            { id: 'singularity', key: 'neon_tech_singularity', name: 'Singularität', desc: 'Schaltet Schwarze Löcher frei, die Gegner einsaugen.', cost: 1000, x: width/2 - 250, y: 510, req: 'tesla' },
            
            { id: 'drones', key: 'neon_tech_drones', name: 'Kampfdrohnen', desc: 'Schaltet begleitende Angriffs-Drohnen frei.', cost: 400, x: width/2 + 250, y: 270, req: 'dash' },
            { id: 'orbitals', key: 'neon_tech_orbitals', name: 'Plasma Orbitals', desc: 'Ermöglicht rotierende Nahkampf-Sägen.', cost: 600, x: width/2 + 250, y: 390, req: 'drones' },
            { id: 'scatter', key: 'neon_tech_scatter', name: 'Scatter Schiff', desc: 'Schaltet das Streuschuss-Schiff zur Auswahl frei.', cost: 800, x: width/2 + 150, y: 510, req: 'orbitals' },
            { id: 'railgun', key: 'neon_tech_railgun', name: 'Railgun Schiff', desc: 'Schaltet das durchschlagende Scharfschützen-Schiff frei.', cost: 800, x: width/2 + 350, y: 510, req: 'orbitals' },
            
            { id: 'fusion', key: 'neon_tech_fusion', name: 'Fusion Core', desc: 'Schaltet extrem mächtige Waffen-Evolutionen frei!', cost: 2000, x: width/2, y: 630, req: ['singularity', 'scatter'] }
        ];

        // Set unlocked status based on localStorage
        this.skills.forEach(skill => {
            skill.unlocked = parseInt(localStorage.getItem(skill.key) || '0', 10) > 0;
        });

        // --- CONNECTIONS ---
        this.nodeGraphics = this.add.graphics();
        this.drawConnections();

        // --- TOOLTIP ---
        this.createTooltip();

        // --- NODES ---
        this.nodes = {};
        this.skills.forEach(skill => {
            this.createNode(skill);
        });

        // --- CREDITS DISPLAY ---
        this.creditsText = this.add.text(width - 40, 40, `SCHROTT: ${this.scrap}`, {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '24px',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(1, 0);
        this.creditsText.setShadow(0, 0, '#ffff00', 10, true, true);
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
                        let lineAlpha = 0.5;
                        let lineThickness = 2;

                        if (isUnlocked) {
                            lineColor = 0x00ffff;
                            lineAlpha = 1;
                            lineThickness = 4;
                        } else if (isAvailable) {
                            lineColor = 0xff00ff;
                            lineAlpha = 0.8;
                            lineThickness = 2;
                        }

                        this.nodeGraphics.lineStyle(lineThickness, lineColor, lineAlpha);
                        this.nodeGraphics.beginPath();
                        this.nodeGraphics.moveTo(parent.x, parent.y);
                        this.nodeGraphics.lineTo(skill.x, skill.y);
                        this.nodeGraphics.strokePath();
                    }
                });
            }
        });
    }

    createTooltip() {
        this.tooltip = this.add.container(0, 0).setDepth(100).setVisible(false);
        
        const tooltipBg = this.add.rectangle(0, 0, 280, 130, 0x0a0a1a, 0.95)
            .setStrokeStyle(2, 0x00ffff)
            .setOrigin(0, 0);
            
        // Neon corner accents
        const tl = this.add.rectangle(0, 0, 10, 10, 0x00ffff).setOrigin(0, 0);
        const br = this.add.rectangle(280, 130, 10, 10, 0x00ffff).setOrigin(1, 1);
        
        const tooltipTitle = this.add.text(15, 15, 'Skill Name', { 
            fontFamily: '"Orbitron", sans-serif', 
            fontSize: '20px', 
            color: '#ffffff',
            fontStyle: 'bold'
        });
        
        const tooltipDesc = this.add.text(15, 45, 'Description goes here and wraps properly.', { 
            fontFamily: '"Inter", "Arial", sans-serif', 
            fontSize: '14px', 
            color: '#cccccc', 
            wordWrap: { width: 250 },
            lineSpacing: 4
        });
        
        const tooltipCost = this.add.text(15, 100, 'Cost: 100', { 
            fontFamily: '"Orbitron", sans-serif', 
            fontSize: '16px', 
            color: '#ffff00',
            fontStyle: 'bold'
        });
        
        this.tooltip.add([tooltipBg, tl, br, tooltipTitle, tooltipDesc, tooltipCost]);
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
            fillColor = 0x002233;
            textColor = '#00ffff';
            glow = true;
        } else if (isAvailable) {
            strokeColor = 0xff00ff;
            fillColor = 0x220022;
            textColor = '#ffffff';
        }

        const container = this.add.container(skill.x, skill.y);
        
        const rect = this.add.rectangle(0, 0, 70, 70, fillColor)
            .setStrokeStyle(3, strokeColor)
            .setInteractive({ useHandCursor: isAvailable });
        rect.setAngle(45);

        if (glow && isUnlocked) {
            rect.isStroked = true;
            const glowRect = this.add.rectangle(0, 0, 74, 74, 0x00ffff, 0.2).setAngle(45);
            container.add(glowRect);
        }

        const initials = skill.name.split(' ').map(n => n[0]).join('').substring(0,2);
        const iconText = this.add.text(0, 0, initials, {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '28px',
            color: textColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        if (glow) iconText.setShadow(0, 0, textColor, 10, true, true);

        container.add([rect, iconText]);

        rect.on('pointerover', () => {
            rect.setStrokeStyle(4, 0xffffff);
            if (isAvailable) rect.fillColor = 0x440044;
            else if (isUnlocked) rect.fillColor = 0x004466;

            const [bg, tl, br, tTitle, tDesc, tCost] = this.tooltip.list;
            tTitle.setText(skill.name);
            tTitle.setColor(isUnlocked ? '#00ffff' : (isAvailable ? '#ff00ff' : '#888899'));
            tDesc.setText(skill.desc);
            
            if (isUnlocked) {
                tCost.setText('STATUS: ACQUIRED');
                tCost.setColor('#00ff00');
            } else {
                tCost.setText(isAvailable ? `KOSTEN: ${skill.cost} SCHROTT` : 'STATUS: LOCKED');
                tCost.setColor(isAvailable ? '#ffff00' : '#ff0000');
            }

            let tx = skill.x + 50;
            let ty = skill.y - 65;
            if (tx + 280 > this.scale.width) tx = skill.x - 330;
            this.tooltip.setPosition(tx, ty);
            this.tooltip.setVisible(true);
        });

        rect.on('pointerout', () => {
            rect.setStrokeStyle(3, strokeColor);
            rect.fillColor = fillColor;
            this.tooltip.setVisible(false);
        });

        rect.on('pointerdown', () => {
            if (isAvailable) {
                if (this.scrap >= skill.cost) {
                    this.scrap -= skill.cost;
                    skill.unlocked = true;
                    
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem(skill.key, '1');
                    
                    const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0.3).setOrigin(0,0);
                    this.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => { flash.destroy(); this.scene.restart(); }
                    });
                } else {
                    this.cameras.main.shake(200, 0.01);
                    const errorText = this.add.text(skill.x, skill.y - 80, 'NICHT GENUG SCHROTT', {
                        fontFamily: '"Orbitron", sans-serif', fontSize: '16px', color: '#ff0000', fontStyle: 'bold'
                    }).setOrigin(0.5);
                    this.tweens.add({
                        targets: errorText, y: skill.y - 120, alpha: 0, duration: 1000,
                        onComplete: () => errorText.destroy()
                    });
                }
            } else if (!isUnlocked) {
                this.cameras.main.shake(150, 0.005);
            }
        });

        this.nodes[skill.id] = container;
    }
}

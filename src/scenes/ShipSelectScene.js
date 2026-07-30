import Phaser from 'phaser';

const WEAPONS = [
    {
        id: 'pulse',
        name: 'PULSE CANNON',
        icon: '✦',
        techKey: null,
        color: 0x00ffff,
        desc: 'Ausgewogen.\nAlterniert Kanonen.\nDMG: 100% | SHOTS: 1',
        tag: 'STANDARD',
    },
    {
        id: 'scatter',
        name: 'SCATTER SHOT',
        icon: '⚚',
        techKey: 'neon_tech_scatter',
        color: 0xff8800,
        desc: 'Schießt im Fächer.\nGut für Schwärme.\nDMG: -20% | SHOTS: 3',
        tag: 'TECH TREE',
    },
    {
        id: 'railgun',
        name: 'RAIL GUN',
        icon: '⚡',
        techKey: 'neon_tech_railgun',
        color: 0xff00ff,
        desc: 'Durchdringend.\nHoher Schaden.\nDMG: +80% | PIERCE',
        tag: 'TECH TREE',
    },
];

const SHIPS = [
    { id: 'standard', img: 'ship_standard', name: 'STANDARD', cost: 0, color: 0xffffff, scale: 0.11, hp: 1.0, dmg: 1.0, spd: 1.0, feature: 'Ausgewogen. Solider Allrounder für jede Situation.' },
    { id: 'interceptor', img: 'ship_interceptor', name: 'INTERCEPTOR', cost: 100, color: 0x00ffff, scale: 0.11, hp: 0.5, dmg: 1.2, spd: 1.5, feature: '+15% Crit Chance. Ein extrem schnelles Angriffs-Schiff.' },
    { id: 'dreadnought', img: 'ship_dreadnought', name: 'DREADNOUGHT', cost: 150, color: 0xff4400, scale: 0.13, hp: 2.5, dmg: 1.5, spd: 0.7, feature: 'Startet mit einem starken Energieschild. Sehr langsam, aber robust.' },
    { id: 'phantom', img: 'ship_phantom', name: 'PHANTOM', cost: 200, color: 0x00ffcc, scale: 0.16, hp: 0.3, dmg: 2.0, spd: 1.8, feature: 'Extremer Schaden und verbesserter Dash. Eine reine Glaskanone.' },
    { id: 'paladin', img: 'ship_paladin', name: 'PALADIN', cost: 200, color: 0xffcc00, scale: 0.16, hp: 1.5, dmg: 0.8, spd: 0.8, feature: 'Heiliger Startschild absorbiert mehrere Treffer. Perfekt für Defensive.' },
    { id: 'bomber', img: 'ship_bomber', name: 'BOMBER', cost: 200, color: 0xff00ff, scale: 0.16, hp: 1.2, dmg: 1.1, spd: 0.9, feature: 'Startet mit 3 verheerenden Nova-Bomben. Perfekt für Flächenschaden.' }
];

export default class ShipSelectScene extends Phaser.Scene {
    constructor() { super('ShipSelectScene'); }

    create() {
        const { width: cw, height: ch } = this.scale;
        this.cw = cw; this.ch = ch;
        
        // --- 1. Background & Atmosphere ---
        this.add.image(cw / 2, ch / 2, 'bg').setAlpha(0.3).setDepth(0);
        
        // Drifting neon particles
        const particles = this.add.particles(0, 0, 'p_glow', {
            x: { min: 0, max: cw },
            y: { min: ch, max: ch + 50 },
            lifespan: { min: 4000, max: 8000 },
            speedY: { min: -10, max: -40 },
            speedX: { min: -15, max: 15 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            frequency: 150
        });
        particles.setDepth(0);

        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10);
        this.unlockedShips = JSON.parse(localStorage.getItem('neon_unlocked_ships') || '["standard"]');

        this.selectedShip = localStorage.getItem('neon_selected_ship') || 'standard';
        this.selectedWeapon = localStorage.getItem('neon_selected_weapon') || 'pulse';
        
        this.previewShipId = this.selectedShip;

        // --- TITLE ---
        this.add.text(cw / 2, 40, 'Holo-Hangar & Waffenkammer', {
            fontFamily: 'Orbitron', fontSize: '28px', fontStyle: 'bold',
            color: '#00ffff', stroke: '#0033ff', strokeThickness: 4, shadow: { blur: 15, color: '#00ffff', fill: true }
        }).setOrigin(0.5);

        this.scrapText = this.add.text(cw / 2, 80, `SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ffaa00', fontStyle: 'bold', shadow: { blur: 10, color: '#ffaa00', fill: true }
        }).setOrigin(0.5);

        // --- LAYOUT BUILDERS ---
        this.leftX = cw * 0.25;
        this.rightX = cw * 0.65;
        
        this.buildShipList();
        this.buildInfoCard();
        this.buildWeaponTabs();
        this.updateInfoCard();
        
        // --- LAUNCH BUTTON ---
        const launchBtn = this.add.container(cw / 2, ch - 50);
        const lBg = this.add.rectangle(0, 0, 240, 60, 0x00ffcc)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffffff);
        
        this.tweens.add({ targets: lBg, alpha: 0.8, duration: 1000, yoyo: true, repeat: -1 });

        const lText = this.add.text(0, 0, '▶ MISSION START ◀', {
            fontFamily: 'Orbitron', fontSize: '18px', fontStyle: 'bold', color: '#000000'
        }).setOrigin(0.5);
        
        launchBtn.add([lBg, lText]);

        lBg.on('pointerover', () => {
            this.tweens.add({ targets: launchBtn, scale: 1.1, duration: 150 });
            lBg.setFillStyle(0xffffff);
        });
        lBg.on('pointerout', () => {
            this.tweens.add({ targets: launchBtn, scale: 1.0, duration: 150 });
            lBg.setFillStyle(0x00ffcc);
        });
        lBg.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('GameScene', {
                    shipClass: this.selectedShip,
                    weaponClass: this.selectedWeapon
                });
            });
        });

        // --- BACK BUTTON ---
        const btnBack = this.add.text(80, ch - 50, '◀ MENU', {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        btnBack.on('pointerdown', () => this.scene.start('MenuScene'));
        btnBack.on('pointerover', () => btnBack.setColor('#ff00ff'));
        btnBack.on('pointerout', () => btnBack.setColor('#ffffff'));
    }

    buildShipList() {
        const startY = this.ch * 0.25;
        const spacing = 75;
        
        this.add.text(this.leftX, startY - 50, 'VERFÜGBARE SCHIFFE', {
            fontFamily: 'Orbitron', fontSize: '14px', color: '#888899', letterSpacing: 4
        }).setOrigin(0.5);

        this.listItems = [];

        SHIPS.forEach((s, i) => {
            const y = startY + i * spacing;
            const isUnlocked = this.unlockedShips.includes(s.id);
            const isSelected = this.selectedShip === s.id;
            
            const item = this.add.container(this.leftX, y);
            const bg = this.add.rectangle(0, 0, 260, 60, isSelected ? 0x112244 : 0x0a0a1a, 0.8)
                .setStrokeStyle(isSelected ? 2 : 1, isSelected ? s.color : 0x334455)
                .setInteractive({ useHandCursor: true });
                
            const icon = this.add.image(-90, 0, s.img).setScale(s.scale * 0.6);
            if (!isUnlocked) icon.setTint(0x444444);
            
            const nameTxt = this.add.text(-40, 0, s.name, {
                fontFamily: 'Orbitron', fontSize: '16px', color: isUnlocked ? '#ffffff' : '#666666', fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            item.add([bg, icon, nameTxt]);
            
            if (isSelected) {
                const activeTag = this.add.text(100, 0, 'AKTIV', { fontFamily: 'Orbitron', fontSize: '10px', color: '#00ff88' }).setOrigin(0.5, 0.5);
                item.add(activeTag);
            } else if (!isUnlocked) {
                const lockTag = this.add.text(100, 0, 'LOCKED', { fontFamily: 'Orbitron', fontSize: '10px', color: '#ff4444' }).setOrigin(0.5, 0.5);
                item.add(lockTag);
            }
            
            bg.on('pointerover', () => {
                if (this.previewShipId !== s.id) {
                    this.previewShipId = s.id;
                    this.updateInfoCard();
                }
                bg.setFillStyle(0x223355, 0.9);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(isSelected ? 0x112244 : 0x0a0a1a, 0.8);
            });
            bg.on('pointerdown', () => {
                if (isUnlocked) {
                    localStorage.setItem('neon_selected_ship', s.id);
                    this.scene.restart();
                } else if (this.scrap >= s.cost) {
                    this.scrap -= s.cost;
                    this.unlockedShips.push(s.id);
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem('neon_unlocked_ships', JSON.stringify(this.unlockedShips));
                    localStorage.setItem('neon_selected_ship', s.id);
                    this.scene.restart();
                } else {
                    this.cameras.main.shake(200, 0.01);
                }
            });
            
            this.listItems.push(item);
        });
    }

    buildInfoCard() {
        this.cardContainer = this.add.container(this.rightX, this.ch * 0.45);
        
        // Card BG
        const bg = this.add.rectangle(0, 0, 400, 480, 0x050510, 0.95)
            .setStrokeStyle(2, 0x00ffff);
        this.cardContainer.add(bg);
        this.cardBg = bg;

        // Portrait Placeholder Box
        const pBox = this.add.rectangle(0, -110, 360, 200, 0x000000).setStrokeStyle(1, 0x00ffff, 0.5);
        this.cardContainer.add(pBox);
        
        // Fallback large sprite
        this.cardSprite = this.add.image(0, -110, 'ship_standard').setScale(0.5);
        this.cardContainer.add(this.cardSprite);

        // Name
        this.cardName = this.add.text(0, 20, 'SHIP NAME', {
            fontFamily: 'Orbitron', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.cardContainer.add(this.cardName);

        // Stats Container
        this.statsContainer = this.add.container(-150, 60);
        this.cardContainer.add(this.statsContainer);
        
        // Description
        this.cardDesc = this.add.text(0, 160, 'Description goes here.', {
            fontFamily: 'Orbitron', fontSize: '13px', color: '#aaaaaa', wordWrap: { width: 340 }, align: 'center', lineHeight: 1.5
        }).setOrigin(0.5);
        this.cardContainer.add(this.cardDesc);
        
        // Action Button
        this.cardBtnBg = this.add.rectangle(0, 210, 200, 40, 0x334455).setInteractive({ useHandCursor: true });
        this.cardBtnText = this.add.text(0, 210, 'AKTION', { fontFamily: 'Orbitron', fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.cardContainer.add([this.cardBtnBg, this.cardBtnText]);
        
        this.cardBtnBg.on('pointerdown', () => {
            const s = SHIPS.find(x => x.id === this.previewShipId);
            const isUnlocked = this.unlockedShips.includes(s.id);
            if (isUnlocked) {
                localStorage.setItem('neon_selected_ship', s.id);
                this.scene.restart();
            } else if (this.scrap >= s.cost) {
                this.scrap -= s.cost;
                this.unlockedShips.push(s.id);
                localStorage.setItem('neon_scrap', this.scrap);
                localStorage.setItem('neon_unlocked_ships', JSON.stringify(this.unlockedShips));
                localStorage.setItem('neon_selected_ship', s.id);
                this.scene.restart();
            } else {
                this.cameras.main.shake(200, 0.01);
            }
        });
    }

    updateInfoCard() {
        const s = SHIPS.find(x => x.id === this.previewShipId);
        if (!s) return;

        const isUnlocked = this.unlockedShips.includes(s.id);
        const isSelected = this.selectedShip === s.id;

        // Slide Animation
        this.tweens.add({
            targets: this.cardContainer,
            x: this.rightX + 20,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            onYoyo: () => {
                this.cardBg.setStrokeStyle(2, s.color);
                
                // Eventually we check if 'portrait_' + s.id exists, for now use fallback
                this.cardSprite.setTexture(s.img);
                this.cardSprite.setScale(s.scale * 3);
                if (!isUnlocked) this.cardSprite.setTint(0x333333);
                else this.cardSprite.clearTint();

                this.cardName.setText(s.name);
                this.cardName.setColor(Phaser.Display.Color.IntegerToColor(s.color).rgba);
                
                this.cardDesc.setText(s.feature);
                
                // Draw Stats
                this.statsContainer.removeAll(true);
                this.drawStatBar(this.statsContainer, 0, 0, 'HULL', s.hp, 2.5, s.color);
                this.drawStatBar(this.statsContainer, 0, 25, 'DMG', s.dmg, 2.0, s.color);
                this.drawStatBar(this.statsContainer, 0, 50, 'SPD', s.spd, 2.0, s.color);
                
                // Update Button
                if (isSelected) {
                    this.cardBtnBg.setFillStyle(0x00ff88);
                    this.cardBtnText.setText('AKTIV');
                    this.cardBtnText.setColor('#000000');
                } else if (isUnlocked) {
                    this.cardBtnBg.setFillStyle(0x334455);
                    this.cardBtnText.setText('SCHIFF WÄHLEN');
                    this.cardBtnText.setColor('#ffffff');
                } else {
                    this.cardBtnBg.setFillStyle(this.scrap >= s.cost ? 0xffaa00 : 0x442200);
                    this.cardBtnText.setText(`KAUFEN: ${s.cost} SCRAP`);
                    this.cardBtnText.setColor('#ffffff');
                }
            }
        });
    }

    drawStatBar(container, x, y, label, value, maxVal, color) {
        container.add(this.add.text(x, y, label, { fontFamily: 'Orbitron', fontSize: '12px', color: '#aaaaaa' }).setOrigin(0, 0.5));
        const barW = 200;
        const barH = 10;
        container.add(this.add.rectangle(x + 50, y, barW, barH, 0x222222).setOrigin(0, 0.5));
        
        const fillW = Math.min(barW, barW * (value / maxVal));
        const fillBar = this.add.rectangle(x + 50, y, 0, barH, color).setOrigin(0, 0.5);
        container.add(fillBar);
        
        // Animate the bar filling up
        this.tweens.add({
            targets: fillBar,
            width: fillW,
            duration: 400,
            ease: 'Cubic.out',
            delay: 100
        });
    }

    buildWeaponTabs() {
        const startX = this.rightX - 180;
        const startY = this.ch * 0.82;
        
        this.add.text(this.rightX, startY - 30, 'WAFFENSYSTEM', {
            fontFamily: 'Orbitron', fontSize: '12px', color: '#888899', letterSpacing: 2
        }).setOrigin(0.5);

        WEAPONS.forEach((w, i) => {
            const isUnlocked = !w.techKey || parseInt(localStorage.getItem(w.techKey) || '0') > 0;
            const isSelected = this.selectedWeapon === w.id;
            
            const tab = this.add.container(startX + i * 180, startY);
            
            const bg = this.add.rectangle(0, 0, 160, 60, isSelected ? 0x220022 : 0x0a0a1a, 0.9)
                .setStrokeStyle(isSelected ? 2 : 1, isSelected ? w.color : 0x334455)
                .setInteractive({ useHandCursor: true });
            tab.add(bg);
            
            tab.add(this.add.text(-60, 0, w.icon, { fontSize: '24px' }).setOrigin(0, 0.5));
            tab.add(this.add.text(-20, -10, w.name, { fontFamily: 'Orbitron', fontSize: '12px', color: isUnlocked ? '#ffffff' : '#555555', fontStyle: 'bold' }).setOrigin(0, 0.5));
            
            let status = 'GESPERRT (Tech Tree)';
            let sCol = '#ff4444';
            if (isSelected) { status = 'AKTIV'; sCol = '#00ff88'; }
            else if (isUnlocked) { status = 'WÄHLEN'; sCol = '#aaaaaa'; }
            
            tab.add(this.add.text(-20, 10, status, { fontFamily: 'Orbitron', fontSize: '9px', color: sCol }).setOrigin(0, 0.5));
            
            bg.on('pointerdown', () => {
                if (isUnlocked) {
                    localStorage.setItem('neon_selected_weapon', w.id);
                    this.scene.restart();
                } else {
                    this.cameras.main.shake(200, 0.015);
                }
            });
        });
    }

    showHint(x, y, msg) {
        const t = this.add.text(x, y, msg, {
            fontFamily: 'Orbitron', fontSize: '11px', color: '#ff6600', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }
}

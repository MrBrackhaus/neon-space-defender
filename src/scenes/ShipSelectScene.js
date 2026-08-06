/**
 * @file ShipSelectScene.js
 * @description The ship selection and weapon loadout screen for the Neon Space Defender game.
 * Allows players to spend scrap to unlock new ships, preview ship stats, select active weapons
 * unlocked via the Tech Tree, and finally launch into the main GameScene.
 * @module ShipSelectScene
 */

import Phaser from 'phaser';
import EventSystem from '../systems/EventSystem';

/**
 * @constant {Array<Object>} WEAPONS
 * @description Configuration array defining all available primary weapons.
 * Includes unlock requirements (techKey), visual styles, and descriptions (in German).
 */
const WEAPONS = [
    {
        id: 'pulse',
        name: 'PULSE CANNON',
        icon: '✦',
        techKey: null, // Always unlocked
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

/**
 * @constant {Array<Object>} SHIPS
 * @description Configuration array defining all playable ships in the game.
 * Includes base stats (hp, dmg, spd) which act as multipliers in the GameScene,
 * cost to unlock, and feature descriptions.
 */
const SHIPS = [
    { id: 'standard', img: 'ship_pizza_flitzer_portrait', animSheet: 'ship_pizza_flitzer_sheet', name: 'PIZZA-FLITZER', cost: 0, color: 0xffffff, scale: 0.22, hp: 1.0, dmg: 1.0, spd: 1.0, feature: 'Dein treuer Begleiter, verkrustet mit einem gigantischen Fett-Schild. (Ausgewogen)' },
    { id: 'interceptor', img: 'ship_neon_flamingo', name: 'NEON-FLAMINGO', cost: 100, color: 0xff44aa, scale: 0.14, hp: 0.5, dmg: 1.2, spd: 1.5, feature: '+15% Crit Chance. Abgerockter Mecha-Flamingo aus dem Freizeitpark. Triebwerke mit Panzertape. Extrem fragil.' },
    { id: 'dreadnought', img: 'ship_arcade_kapsel', name: 'ARCADE-KAPSEL', cost: 150, color: 0x00ff00, scale: 0.16, hp: 2.5, dmg: 1.5, spd: 0.7, feature: 'Startet mit 2 Schild-Aufladungen. Eine fliegende Retro-Spielhalle mit Plasma-Reaktor. Einwurf: 1 Vierteldollar.' },
    { id: 'phantom', img: 'ship_phantom', name: 'LASER-EINHORN', cost: 200, color: 0x00ffcc, scale: 0.16, hp: 0.3, dmg: 2.0, spd: 1.8, feature: 'Dual-Aim. Plastik-Karussell-Tierchen mit Antimaterie-Hörnern. Sparkles ist sehr stolz.' },
    { id: 'paladin', img: 'ship_paladin', name: 'OKTOHORNCAT', cost: 200, color: 0xffcc00, scale: 0.16, hp: 1.5, dmg: 0.8, spd: 0.8, feature: 'Heilt sich. Plüschiges Maskottchen, von innen mit Titanplatten verstärkt. Sehr flauschig.' },
    { id: 'bomber', img: 'ship_bomber', name: 'NEON-GALEONE', cost: 200, color: 0xff00ff, scale: 0.16, hp: 1.2, dmg: 1.1, spd: 0.9, feature: 'Bomben-Spezialist. Ein gigantischer Haufen aus glühendem Neon-Schrott, zusammengehalten von Panzertape.' }
];

/**
 * @class ShipSelectScene
 * @extends Phaser.Scene
 * @description Provides the UI for players to manage their ship and weapon selection before starting a run.
 */
export default class ShipSelectScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the ShipSelectScene with its unique scene key.
     */
    constructor() { 
        super('ShipSelectScene'); 
    }

    init(data) {
        this.boughtShip = data?.boughtShip || false;
    }

    /**
     * @method create
     * @description Builds the entire UI for the Hangar scene, reading unlocked state
     * from localStorage and rendering the background, ship list, info card, and weapons tabs.
     * @returns {void}
     */
    create() {
        const { width: cw, height: ch } = this.scale;
        this.cw = cw; 
        this.ch = ch;
        
        this.eventSys = new EventSystem(this);

        if (this.boughtShip) {
            this.eventSys.triggerCompanionComment('unlock_ship');
        }
        
        // ─────────────────── BACKGROUND & ATMOSPHERE ───────────────────
        const htmlHud = document.getElementById('html-hud');
        if (htmlHud) htmlHud.style.display = 'none';
        
        this.add.image(cw / 2, ch / 2, 'bg').setAlpha(0.3).setDepth(0);
        
        // Drifting neon particles to give a hangar atmosphere
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

        // ─────────────────── STATE MANAGEMENT ───────────────────

        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10);
        this.unlockedShips = JSON.parse(localStorage.getItem('neon_unlocked_ships') || '["standard"]');

        this.selectedShip = localStorage.getItem('neon_selected_ship') || 'standard';
        this.selectedWeapon = localStorage.getItem('neon_selected_weapon') || 'pulse';
        
        this.previewShipId = this.selectedShip;

        // ─────────────────── UI HEADER ───────────────────
        
        this.add.text(cw / 2, 40, 'Holo-Hangar & Waffenkammer', {
            fontFamily: 'Orbitron', fontSize: '28px', fontStyle: 'bold',
            color: '#00ffff', stroke: '#0033ff', strokeThickness: 4, shadow: { blur: 15, color: '#00ffff', fill: true }
        }).setOrigin(0.5);

        this.scrapText = this.add.text(cw / 2, 80, `SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ffaa00', fontStyle: 'bold', shadow: { blur: 10, color: '#ffaa00', fill: true }
        }).setOrigin(0.5);

        // ─────────────────── LAYOUT BUILDERS ───────────────────
        
        this.leftX = cw * 0.25;
        this.rightX = cw * 0.65;
        
        this.buildShipList();
        this.buildInfoCard();
        this.buildWeaponTabs();
        this.updateInfoCard();
        
        // ─────────────────── LAUNCH BUTTON ───────────────────
        
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
            if(this.game && this.game.audioSys) this.game.audioSys.playHover();
            this.tweens.add({ targets: launchBtn, scale: 1.1, duration: 150 });
            lBg.setFillStyle(0xffffff);
        });
        lBg.on('pointerout', () => {
            this.tweens.add({ targets: launchBtn, scale: 1.0, duration: 150 });
            lBg.setFillStyle(0x00ffcc);
        });
        lBg.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Pass selected loadout to the GameScene
                this.scene.start('GameScene', {
                    shipClass: this.selectedShip,
                    weaponClass: this.selectedWeapon
                });
            });
        });

        // ─────────────────── BACK BUTTON ───────────────────
        
        const btnBack = this.add.text(80, ch - 50, '◀ MENU', {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        btnBack.on('pointerdown', () => this.scene.start('MenuScene'));
        btnBack.on('pointerover', () => btnBack.setColor('#ff00ff'));
        btnBack.on('pointerout', () => btnBack.setColor('#ffffff'));
    }

    /**
     * @method buildShipList
     * @description Generates the scrollable/clickable list of ships on the left side of the screen.
     * Indicates unlock status, active status, and handles unlocking ships via Scrap.
     * @returns {void}
     */
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
            
            // Background box for the list item
            const bg = this.add.rectangle(0, 0, 260, 60, isSelected ? 0x112244 : 0x0a0a1a, 0.8)
                .setStrokeStyle(isSelected ? 2 : 1, isSelected ? s.color : 0x334455)
                .setInteractive({ useHandCursor: true });
                
            // Ship preview icon
            const listScale = s.id === 'standard' ? 0.066 : s.scale * 0.6;
            const icon = this.add.image(-90, 0, s.img).setScale(listScale);
            if (!isUnlocked) icon.setTint(0x444444);
            
            // Ship Name
            const nameTxt = this.add.text(-40, 0, s.name, {
                fontFamily: 'Orbitron', fontSize: '16px', color: isUnlocked ? '#ffffff' : '#666666', fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            item.add([bg, icon, nameTxt]);
            
            // Status Tags
            if (isSelected) {
                const activeTag = this.add.text(100, 0, 'AKTIV', { fontFamily: 'Orbitron', fontSize: '10px', color: '#00ff88' }).setOrigin(0.5, 0.5);
                item.add(activeTag);
            } else if (!isUnlocked) {
                const lockTag = this.add.text(100, 0, 'LOCKED', { fontFamily: 'Orbitron', fontSize: '10px', color: '#ff4444' }).setOrigin(0.5, 0.5);
                item.add(lockTag);
            }
            
            // Interaction logic
            bg.on('pointerover', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playHover();
                if (this.previewShipId !== s.id) {
                    this.previewShipId = s.id;
                    this.updateInfoCard(); // Update the right-side panel
                }
                bg.setFillStyle(0x223355, 0.9);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(isSelected ? 0x112244 : 0x0a0a1a, 0.8);
            });
            bg.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
                if (isUnlocked) {
                    // Equip ship
                    localStorage.setItem('neon_selected_ship', s.id);
                    this.scene.restart();
                } else if (this.scrap >= s.cost) {
                    // Buy and unlock ship
                    this.scrap -= s.cost;
                    this.unlockedShips.push(s.id);
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem('neon_unlocked_ships', JSON.stringify(this.unlockedShips));
                    localStorage.setItem('neon_selected_ship', s.id);
                    this.scene.restart({ boughtShip: true }); // Refresh the UI completely
                } else {
                    // Not enough scrap feedback
                    this.cameras.main.shake(200, 0.01);
                }
            });
            
            this.listItems.push(item);
        });
    }

    /**
     * @method buildInfoCard
     * @description Creates the initial structure for the detailed ship info card on the right.
     * Contains the large ship sprite, name, description, stat bars container, and action button.
     * @returns {void}
     */
    buildInfoCard() {
        this.cardContainer = this.add.container(this.rightX, this.ch * 0.45);
        
        // Main Card BG
        const bg = this.add.rectangle(0, 0, 400, 480, 0x050510, 0.95)
            .setStrokeStyle(2, 0x00ffff);
        this.cardContainer.add(bg);
        this.cardBg = bg;

        // Portrait Placeholder Box
        const pBox = this.add.rectangle(0, -110, 360, 200, 0x000000).setStrokeStyle(1, 0x00ffff, 0.5);
        this.cardContainer.add(pBox);
        
        // Fallback large sprite
        const initialShip = SHIPS.find(x => x.id === this.previewShipId) || SHIPS[0];
        const initScale = initialShip.id === 'standard' ? 0.33 : initialShip.scale * 3;
        this.cardSprite = this.add.image(0, -110, initialShip.img).setScale(initScale);
        this.cardContainer.add(this.cardSprite);

        // Ship Name Display
        this.cardName = this.add.text(0, 20, 'SHIP NAME', {
            fontFamily: 'Orbitron', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.cardContainer.add(this.cardName);

        // Stats Container (dynamic bars injected here)
        this.statsContainer = this.add.container(-150, 60);
        this.cardContainer.add(this.statsContainer);
        
        // Ship Feature Description
        this.cardDesc = this.add.text(0, 160, 'Description goes here.', {
            fontFamily: 'Orbitron', fontSize: '13px', color: '#aaaaaa', wordWrap: { width: 340 }, align: 'center', lineHeight: 1.5
        }).setOrigin(0.5);
        this.cardContainer.add(this.cardDesc);
        
        // Context Action Button (Equip / Buy)
        this.cardBtnBg = this.add.rectangle(0, 210, 200, 40, 0x334455).setInteractive({ useHandCursor: true });
        this.cardBtnText = this.add.text(0, 210, 'AKTION', { fontFamily: 'Orbitron', fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.cardContainer.add([this.cardBtnBg, this.cardBtnText]);
        
        // Similar logic as list clicks, but via the big button
        this.cardBtnBg.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
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
                this.scene.restart({ boughtShip: true });
            } else {
                this.cameras.main.shake(200, 0.01);
            }
        });
    }

    /**
     * @method updateInfoCard
     * @description Refreshes the right-side info card with data for the currently hovered ship (`previewShipId`).
     * Animates stat bars and updates colors.
     * @returns {void}
     */
    updateInfoCard() {
        const s = SHIPS.find(x => x.id === this.previewShipId);
        if (!s) return;

        const isUnlocked = this.unlockedShips.includes(s.id);
        const isSelected = this.selectedShip === s.id;

        // Slide Animation to make UI feel responsive
        this.tweens.add({
            targets: this.cardContainer,
            x: this.rightX + 20,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            onYoyo: () => {
                this.cardBg.setStrokeStyle(2, s.color);
                
                // Set the ship preview image
                this.cardSprite.setTexture(s.img);
                const animScale = s.id === 'standard' ? 0.33 : s.scale * 3;
                this.cardSprite.setScale(animScale);
                if (!isUnlocked) this.cardSprite.setTint(0x333333);
                else this.cardSprite.clearTint();

                // Update text and colors
                this.cardName.setText(s.name);
                this.cardName.setColor(Phaser.Display.Color.IntegerToColor(s.color).rgba);
                
                this.cardDesc.setText(s.feature);
                
                // Draw Stats bars dynamically
                this.statsContainer.removeAll(true);
                this.drawStatBar(this.statsContainer, 0, 0, 'HULL', s.hp, 2.5, s.color);
                this.drawStatBar(this.statsContainer, 0, 25, 'DMG', s.dmg, 2.0, s.color);
                this.drawStatBar(this.statsContainer, 0, 50, 'SPD', s.spd, 2.0, s.color);
                
                // Update Context Button state
                if (isSelected) {
                    this.cardBtnBg.setFillStyle(0x00ff88);
                    this.cardBtnText.setText('AKTIV');
                    this.cardBtnText.setColor('#000000');
                } else if (isUnlocked) {
                    this.cardBtnBg.setFillStyle(0x334455);
                    this.cardBtnText.setText('SCHIFF WÄHLEN');
                    this.cardBtnText.setColor('#ffffff');
                } else {
                    // Check if player has enough scrap
                    this.cardBtnBg.setFillStyle(this.scrap >= s.cost ? 0xffaa00 : 0x442200);
                    this.cardBtnText.setText(`KAUFEN: ${s.cost} SCRAP`);
                    this.cardBtnText.setColor('#ffffff');
                }
            }
        });
    }

    /**
     * @method drawStatBar
     * @description Helper to draw animated progress bars representing ship statistics.
     * @param {Phaser.GameObjects.Container} container - Target container for the bar.
     * @param {number} x - Local X coordinate.
     * @param {number} y - Local Y coordinate.
     * @param {string} label - The stat abbreviation (e.g., 'DMG').
     * @param {number} value - The actual stat multiplier value.
     * @param {number} maxVal - The theoretical maximum value used to normalize the bar width.
     * @param {number} color - Hex color for the filled portion of the bar.
     * @returns {void}
     */
    drawStatBar(container, x, y, label, value, maxVal, color) {
        // Label Text
        container.add(this.add.text(x, y, label, { fontFamily: 'Orbitron', fontSize: '12px', color: '#aaaaaa' }).setOrigin(0, 0.5));
        const barW = 200;
        const barH = 10;
        
        // Background track for the bar
        container.add(this.add.rectangle(x + 50, y, barW, barH, 0x222222).setOrigin(0, 0.5));
        
        // Fill width proportional to maxVal
        const fillW = Math.min(barW, barW * (value / maxVal));
        const fillBar = this.add.rectangle(x + 50, y, 0, barH, color).setOrigin(0, 0.5);
        container.add(fillBar);
        
        // Animate the bar filling up smoothly
        this.tweens.add({
            targets: fillBar,
            width: fillW,
            duration: 400,
            ease: 'Cubic.out',
            delay: 100
        });
    }

    /**
     * @method buildWeaponTabs
     * @description Generates the weapon selection tabs at the bottom right.
     * Checks localStorage for Tech Tree unlock keys (e.g., 'neon_tech_scatter').
     * @returns {void}
     */
    buildWeaponTabs() {
        const startX = this.rightX - 180;
        const startY = this.ch * 0.82;
        
        this.add.text(this.rightX, startY - 30, 'WAFFENSYSTEM', {
            fontFamily: 'Orbitron', fontSize: '12px', color: '#888899', letterSpacing: 2
        }).setOrigin(0.5);

        WEAPONS.forEach((w, i) => {
            // Unlocked if it has no tech key requirement OR if the specific tech tree node is active
            const isUnlocked = !w.techKey || parseInt(localStorage.getItem(w.techKey) || '0') > 0;
            const isSelected = this.selectedWeapon === w.id;
            
            const tab = this.add.container(startX + i * 180, startY);
            
            // Tab Background
            const bg = this.add.rectangle(0, 0, 160, 60, isSelected ? 0x220022 : 0x0a0a1a, 0.9)
                .setStrokeStyle(isSelected ? 2 : 1, isSelected ? w.color : 0x334455)
                .setInteractive({ useHandCursor: true });
            tab.add(bg);
            
            // Tab Content (Icon & Name)
            tab.add(this.add.text(-60, 0, w.icon, { fontSize: '24px' }).setOrigin(0, 0.5));
            tab.add(this.add.text(-20, -10, w.name, { fontFamily: 'Orbitron', fontSize: '12px', color: isUnlocked ? '#ffffff' : '#555555', fontStyle: 'bold' }).setOrigin(0, 0.5));
            
            // Status text logic
            let status = 'GESPERRT (Tech Tree)';
            let sCol = '#ff4444';
            if (isSelected) { status = 'AKTIV'; sCol = '#00ff88'; }
            else if (isUnlocked) { status = 'WÄHLEN'; sCol = '#aaaaaa'; }
            
            tab.add(this.add.text(-20, 10, status, { fontFamily: 'Orbitron', fontSize: '9px', color: sCol }).setOrigin(0, 0.5));
            
            // Allow selection only if unlocked
            bg.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
                if (isUnlocked) {
                    localStorage.setItem('neon_selected_weapon', w.id);
                    this.scene.restart(); // Refresh UI completely
                } else {
                    this.cameras.main.shake(200, 0.015); // visual denial
                }
            });
        });
    }

    /**
     * @method showHint
     * @description Utility to spawn floating text hints that fade upwards (e.g. error messages).
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {string} msg - The message to display.
     * @returns {void}
     */
    showHint(x, y, msg) {
        const t = this.add.text(x, y, msg, {
            fontFamily: 'Orbitron', fontSize: '11px', color: '#ff6600', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);
        
        // Float up and fade out
        this.tweens.add({ 
            targets: t, 
            y: y - 30, 
            alpha: 0, 
            duration: 1500, 
            onComplete: () => t.destroy() 
        });
    }
}

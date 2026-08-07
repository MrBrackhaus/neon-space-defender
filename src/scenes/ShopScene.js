import Phaser from 'phaser';

/**
 * @file ShopScene.js
 * @description Professional overhaul of the Scrap Shop.
 */

const SHOP_UPGRADES = [
    { id: 'base_hp', name: 'PANZERTAPE & SPUCKE', desc: '+20 Basis-HP', baseCost: 15, max: 10, unit: '+20 HP', icon: '❤️' },
    { id: 'base_dmg', name: 'ILLEGALE FEUERWERKSKÖRPER', desc: '+15% Basis-Schaden', baseCost: 20, max: 10, unit: '+15% DMG', icon: '💥' },
    { id: 'base_speed', name: 'ROSTIGE RAKETEN-BOOSTER', desc: '+5% Basis-Speed', baseCost: 15, max: 8, unit: '+5% SPD', icon: '🚀' },
    { id: 'magnet', name: 'MAGNETISCHER MÜLL-SAUGER', desc: '+40px XP & Scrap Radius', baseCost: 15, max: 10, unit: '+40px', icon: '🧲' },
    { id: 'start_novas', name: 'VERFALLENE PLUTONIUM-BOMBE', desc: '+1 Nova-Bombe (Start)', baseCost: 100, max: 5, unit: '+1 NOVA', icon: '☢️' },
    { id: 'start_shields', name: 'ALUFOLIEN-SCHILD-PAKET', desc: '+1 Schild-Ladung (Start)', baseCost: 80, max: 3, unit: '+1 SHIELD', icon: '🛡️' },
];

const DIALOGS = [
    '"Oh, du lebst noch? Schade, ich hatte deine Reste schon an einen Toaster-Fabrikanten verkauft."',
    '"Wrench liebt Schrott! Genau wie meine Mutter, aber die hat Sterne gefressen."',
    '"Nicht genug Schrott! Geh sterben und komm mit Beute zurück, du Schnorrer!"',
    '"Das ist hochwertigstes Weltraummüll-Engineering. Gib mir Ihr Geld."',
    '"Sonderangebot! Bezahle mit deiner Lebenserwartung. Oh, die haben wir nicht auf Lager."',
    '"Normalerweise grinse ich. Aber seit du Penner meinen Lieblings-KI-Toaster zerschossen hast, gibt es hier nur böse Blicke, Majestät!"',
];

export default class ShopScene extends Phaser.Scene {
    constructor() { 
        super('ShopScene'); 
    }

    create() {
        const { width: cw, height: ch } = this.scale;

        // ── Background & Atmosphere ──
        this.bg = this.add.image(cw/2, ch/2, 'title_bg').setOrigin(0.5).setTint(0x333344);
        
        // Subtle slow pan effect for background
        this.tweens.add({
            targets: this.bg,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 30000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Dust particles
        const particles = this.add.particles(0, 0, 'asteroid_1', {
            x: { min: 0, max: cw },
            y: { min: 0, max: ch },
            lifespan: 10000,
            speedY: { min: -10, max: -30 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.05, end: 0 },
            alpha: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            frequency: 500
        });

        // ── Merchant ──
        this.merchant = this.add.image(cw * 0.22, ch * 0.45, 'scrap_merchant')
            .setOrigin(0.5)
            .setDisplaySize(ch * 0.8, ch * 0.8)
            .setAlpha(0.95);
            
        // Floating animation for merchant
        this.tweens.add({
            targets: this.merchant,
            y: this.merchant.y - 15,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10) || 0;

        const uiCenterX = cw * 0.68;

        // ── Header UI ──
        // Title banner
        const titleBg = this.add.graphics();
        titleBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
        titleBg.fillRect(uiCenterX - 350, 20, 700, 110);
        
        // Top border line
        titleBg.lineStyle(2, 0xffaa00, 1);
        titleBg.beginPath();
        titleBg.moveTo(uiCenterX - 350, 20);
        titleBg.lineTo(uiCenterX + 350, 20);
        titleBg.strokePath();

        this.add.text(uiCenterX, 50, "WRENCH'S SCHROTT-IMPERIUM", {
            fontFamily: 'Orbitron', fontSize: '32px', fontStyle: 'bold',
            color: '#ffcc00', shadow: { offsetX: 2, offsetY: 2, color: '#000', fill: true }
        }).setOrigin(0.5);

        this.add.text(uiCenterX, 85, 'PERMANENTE SYSTEM-UPGRADES', {
            fontFamily: 'Orbitron', fontSize: '14px', color: '#00ffcc', letterSpacing: 4
        }).setOrigin(0.5);

        // Scrap Display Box
        const scrapBox = this.add.graphics();
        scrapBox.lineStyle(2, 0xffaa00, 0.8);
        scrapBox.fillStyle(0x1a1a00, 0.7);
        scrapBox.strokeRoundedRect(uiCenterX - 100, 115, 200, 36, 6);
        scrapBox.fillRoundedRect(uiCenterX - 100, 115, 200, 36, 6);

        this.scrapText = this.add.text(uiCenterX, 133, `SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // ── Dialog Box (Bottom Left) ──
        this.add.graphics()
            .fillStyle(0x000000, 0.75)
            .lineStyle(2, 0x444455, 1)
            .fillRoundedRect(cw * 0.05, ch - 120, cw * 0.35, 90, 8)
            .strokeRoundedRect(cw * 0.05, ch - 120, cw * 0.35, 90, 8);
            
        this.dialogText = this.add.text(cw * 0.225, ch - 75, DIALOGS[Phaser.Math.Between(0, DIALOGS.length - 1)], {
            fontFamily: 'Orbitron', fontSize: '15px', color: '#ffaa00',
            fontStyle: 'italic', align: 'center', wordWrap: { width: cw * 0.32 }, lineSpacing: 5
        }).setOrigin(0.5);

        // ── Build List ──
        this._buildList(cw, ch, uiCenterX);

        // ── Back Button ──
        const btnBackBg = this.add.graphics();
        btnBackBg.lineStyle(2, 0x00ffcc, 0.8);
        btnBackBg.fillStyle(0x003333, 0.8);
        btnBackBg.strokeRoundedRect(20, 20, 200, 45, 8);
        btnBackBg.fillRoundedRect(20, 20, 200, 45, 8);

        const btnBack = this.add.text(120, 42.5, '◂ HAUPTMENÜ', {
            fontFamily: 'Orbitron', fontSize: '18px', color: '#00ffcc', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const backZone = this.add.zone(120, 42.5, 200, 45).setInteractive({ useHandCursor: true });
        
        backZone.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
            this.scene.start('MenuScene');
        });
        backZone.on('pointerover', () => btnBack.setColor('#ffffff'));
        backZone.on('pointerout', () => btnBack.setColor('#00ffcc'));
    }

    _buildList(cw, ch, uiCenterX) {
        const startY = 185;
        const rowH = 75;
        const listWidth = 620;

        // Container background for the list
        const listBg = this.add.graphics();
        listBg.fillStyle(0x000000, 0.6);
        listBg.lineStyle(1, 0x333344, 1);
        listBg.fillRoundedRect(uiCenterX - listWidth/2 - 10, startY - 10, listWidth + 20, (SHOP_UPGRADES.length * rowH) + 10, 10);
        listBg.strokeRoundedRect(uiCenterX - listWidth/2 - 10, startY - 10, listWidth + 20, (SHOP_UPGRADES.length * rowH) + 10, 10);

        SHOP_UPGRADES.forEach((upg, i) => {
            const level = parseInt(localStorage.getItem(`neon_upg_${upg.id}`) || '0', 10);
            const isMaxed = upg.max && level >= upg.max;
            const cost = upg.baseCost + (level * Math.floor(upg.baseCost * 0.5));
            const canAfford = this.scrap >= cost && !isMaxed;

            const y = startY + i * rowH;
            
            // Row Box
            const rowGraphics = this.add.graphics();
            const rowColor = isMaxed ? 0x003311 : (canAfford ? 0x332200 : 0x11111a);
            const rowStroke = isMaxed ? 0x00ff66 : (canAfford ? 0xffaa00 : 0x333344);
            
            rowGraphics.fillStyle(rowColor, 0.85);
            rowGraphics.lineStyle(1, rowStroke, 0.8);
            rowGraphics.fillRoundedRect(uiCenterX - listWidth/2, y, listWidth, rowH - 10, 6);
            rowGraphics.strokeRoundedRect(uiCenterX - listWidth/2, y, listWidth, rowH - 10, 6);

            // Icon
            this.add.text(uiCenterX - listWidth/2 + 25, y + (rowH-10)/2, upg.icon, {
                fontSize: '24px'
            }).setOrigin(0.5);

            // Texts
            this.add.text(uiCenterX - listWidth/2 + 55, y + 18, upg.name, {
                fontFamily: 'Orbitron', fontSize: '15px', color: isMaxed ? '#00ff66' : '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            
            this.add.text(uiCenterX - listWidth/2 + 55, y + 42, upg.desc, {
                fontFamily: 'Orbitron', fontSize: '12px', color: '#99aabb'
            }).setOrigin(0, 0.5);

            // Value / Unit
            this.add.text(uiCenterX + 30, y + (rowH-10)/2, upg.unit, {
                fontFamily: 'Orbitron', fontSize: '14px', color: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Level Pips or Text
            const lvlText = isMaxed ? 'MAXIMUM' : `Level ${level}/${upg.max}`;
            this.add.text(uiCenterX + 120, y + (rowH-10)/2, lvlText, {
                fontFamily: 'Orbitron', fontSize: '13px', color: isMaxed ? '#00ff66' : '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Buy Button
            const btnW = 130, btnH = 42;
            const btnX = uiCenterX + listWidth/2 - btnW/2 - 15;
            const btnY = y + (rowH-10)/2;
            
            const btnBg = this.add.graphics();
            const btnColor = isMaxed ? 0x004422 : (canAfford ? 0xffaa00 : 0x2a2a35);
            const btnStroke = isMaxed ? 0x00ff66 : (canAfford ? 0xffcc00 : 0x444455);
            
            btnBg.fillStyle(btnColor, 0.9);
            btnBg.lineStyle(2, btnStroke, 1);
            btnBg.fillRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);
            btnBg.strokeRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);

            const btnLabel = isMaxed ? 'MAXED' : (canAfford ? `KAUFEN (${cost})` : `${cost} SCRAP`);
            const btnTxtColor = isMaxed ? '#00ffaa' : (canAfford ? '#000000' : '#888899');
            
            const btnText = this.add.text(btnX, btnY, btnLabel, {
                fontFamily: 'Orbitron', fontSize: '13px', color: btnTxtColor, fontStyle: 'bold'
            }).setOrigin(0.5);

            if (canAfford) {
                const zone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
                
                zone.on('pointerover', () => {
                    btnBg.clear();
                    btnBg.fillStyle(0xffcc00, 1);
                    btnBg.lineStyle(2, 0xffffff, 1);
                    btnBg.fillRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);
                    btnBg.strokeRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);
                    btnText.setScale(1.05);
                });
                
                zone.on('pointerout', () => {
                    btnBg.clear();
                    btnBg.fillStyle(btnColor, 0.9);
                    btnBg.lineStyle(2, btnStroke, 1);
                    btnBg.fillRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);
                    btnBg.strokeRoundedRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH, 6);
                    btnText.setScale(1);
                });
                
                zone.on('pointerdown', () => {
                    if(this.game && this.game.audioSys) {
                        this.game.audioSys.playClick();
                        this.game.audioSys.playBuy();
                    }
                    this.scrap -= cost;
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem(`neon_upg_${upg.id}`, level + 1);
                    this.scene.restart();
                });
            }
        });
    }
}

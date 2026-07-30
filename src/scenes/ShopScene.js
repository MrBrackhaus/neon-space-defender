import Phaser from 'phaser';

// ─── KLAR DEFINIERTE ZUSTÄNDIGKEITEN ───────────────────────────────────────
// SCRAP SHOP (Wrench): Permanente STAT-Boosts (HP, DMG, SPD, MAG).
//                        Diese skalieren mit dem Level → teure investition.
// TECH TREE:             Einmalige SYSTEM-Freischaltungen (Dash, Waffen,
//                        Schild-Pool, Evolutionen, etc.)
// INGAME LEVEL-UP:       Taktische Waffen & Upgrades pro Runde. Nur verfügbar
//                        wenn via Tech-Tree freigeschaltet.
// ───────────────────────────────────────────────────────────────────────────

const SHOP_UPGRADES = [
    {
        id: 'base_hp',
        name: '🩹 PANZERTAPE & SPUCKE',
        desc: '+20 Basis-HP — Hält Schiff und Träume zusammen',
        baseCost: 15,
        max: 10,
        unit: '+20 HP',
    },
    {
        id: 'base_dmg',
        name: '💥 ILLEGALE FEUERWERKSKÖRPER',
        desc: '+15% Basis-Schaden — Nicht fragen, woher die kommen',
        baseCost: 20,
        max: 10,
        unit: '+15% DMG',
    },
    {
        id: 'base_speed',
        name: '🚀 ROSTIGE RAKETEN-BOOSTER',
        desc: '+5% Basis-Speed — Explosionsgefahr: Ja',
        baseCost: 15,
        max: 8,
        unit: '+5% SPD',
    },
    {
        id: 'magnet',
        name: '🧲 MAGNETISCHER MÜLL-SAUGER',
        desc: '+40px XP & Scrap Anziehungsradius',
        baseCost: 15,
        max: 10,
        unit: '+40px',
    },
    {
        id: 'start_novas',
        name: '☢️ VERFALLENE PLUTONIUM-BOMBE',
        desc: '+1 Nova-Bombe zu Spielbeginn — Nicht lecken!',
        baseCost: 100,
        max: 5,
        unit: '+1 NOVA',
    },
    {
        id: 'start_shields',
        name: '🛡️ ALUFOLIEN-SCHILD-PAKET',
        desc: '+1 Schild-Ladung zu Spielbeginn — Nur gegen Nebenwirkungen',
        baseCost: 80,
        max: 3,
        unit: '+1 SHIELD',
    },
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
    constructor() { super('ShopScene'); }

    create() {
        const { width: cw, height: ch } = this.scale;

        // Background & Wrench
        this.add.rectangle(0, 0, cw, ch, 0x0a0a1a).setOrigin(0);
        
        // Wrench on the left side
        this.add.image(cw * 0.25, ch * 0.5, 'scrap_merchant')
            .setOrigin(0.5)
            .setAlpha(0.85)
            .setDisplaySize(ch * 0.9, ch * 0.9); // scale to fit screen height

        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10);

        // Header (shifted slightly to right)
        const uiCenterX = cw * 0.65;
        
        this.add.text(uiCenterX, 36, "🔧 WRENCH' SCHROTT & PFUSCH ⚙️", {
            fontFamily: 'Orbitron', fontSize: '28px', fontStyle: 'bold',
            color: '#ffaa00', stroke: '#552200', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(uiCenterX, 68, 'PERMANENTE STAT-BOOSTS — GÜNSTIG WIE MEIN GEWISSEN', {
            fontFamily: 'Orbitron', fontSize: '10px', color: '#ffaa0088', letterSpacing: 4
        }).setOrigin(0.5);

        this.scrapText = this.add.text(uiCenterX, 92, `SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '22px', color: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Hint
        this.add.text(uiCenterX, 120, '💡 Neue Waffen & Fähigkeiten? 👉 TECH TREE im Hauptmenü!', {
            fontFamily: 'Orbitron', fontSize: '11px', color: '#00ffcc88', align: 'center'
        }).setOrigin(0.5);

        this._buildList(cw, ch, uiCenterX);

        // Dialog box at bottom
        this.add.rectangle(cw / 2, ch - 100, cw * 0.8, 60, 0x050515, 0.9)
            .setStrokeStyle(1, 0xffaa00);
            
        this.dialogText = this.add.text(cw / 2, ch - 100, DIALOGS[Phaser.Math.Between(0, DIALOGS.length - 1)], {
            fontFamily: 'Orbitron', fontSize: '14px', color: '#ffcc00',
            fontStyle: 'italic', align: 'center', wordWrap: { width: cw * 0.75 }
        }).setOrigin(0.5);

        // Back Button
        const btnBack = this.add.text(cw / 2, ch - 40, '← ZURÜCK ZUM MENÜ', {
            fontFamily: 'Orbitron', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btnBack.on('pointerdown', () => this.scene.start('MenuScene'));
        btnBack.on('pointerover', () => btnBack.setColor('#ffaa00'));
        btnBack.on('pointerout', () => btnBack.setColor('#ffffff'));
    }

    _buildList(cw, ch, uiCenterX) {
        const startY = 160;
        const rowH = 68;
        const listWidth = 580;

        SHOP_UPGRADES.forEach((upg, i) => {
            const level = parseInt(localStorage.getItem(`neon_upg_${upg.id}`) || '0', 10);
            const isMaxed = upg.max && level >= upg.max;
            const cost = upg.baseCost + (level * Math.floor(upg.baseCost * 0.5));
            const canAfford = this.scrap >= cost && !isMaxed;

            const y = startY + i * rowH;

            // Row background
            const rowBg = this.add.rectangle(uiCenterX, y, listWidth, rowH - 8, 0x050510, 0.95)
                .setStrokeStyle(1, isMaxed ? 0x00ff66 : (canAfford ? 0xffaa00 : 0x333344));

            // Name + desc
            this.add.text(uiCenterX - listWidth/2 + 20, y - 14, upg.name, {
                fontFamily: 'Orbitron', fontSize: '14px', color: isMaxed ? '#00ff66' : '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            this.add.text(uiCenterX - listWidth/2 + 20, y + 8, upg.desc, {
                fontFamily: 'Orbitron', fontSize: '10px', color: '#8899aa'
            }).setOrigin(0, 0.5);

            // Unit label
            this.add.text(uiCenterX + 20, y, upg.unit, {
                fontFamily: 'Orbitron', fontSize: '13px', color: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Level indicator
            this.add.text(uiCenterX + 90, y, isMaxed ? '✔ MAX' : `LVL ${level}/${upg.max || '∞'}`, {
                fontFamily: 'Orbitron', fontSize: '13px', color: isMaxed ? '#00ff66' : '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Buy button
            const btnW = 120, btnH = 38;
            const btnX = uiCenterX + listWidth/2 - btnW/2 - 10;
            const btnColor = isMaxed ? 0x113322 : (canAfford ? 0xffaa00 : 0x222233);
            const btnTxtColor = isMaxed ? '#00ff66' : (canAfford ? '#000000' : '#666677');
            const btnLabel = isMaxed ? '✔ MAXED' : (canAfford ? `KAUFEN (${cost})` : `${cost} SCRAP`);

            const btn = this.add.rectangle(btnX, y, btnW, btnH, btnColor)
                .setStrokeStyle(1, isMaxed ? 0x00ff66 : (canAfford ? 0xffcc00 : 0x444455));
            this.add.text(btnX, y, btnLabel, {
                fontFamily: 'Orbitron', fontSize: '11px', color: btnTxtColor, fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5);

            if (canAfford) {
                btn.setInteractive({ useHandCursor: true });
                btn.on('pointerover', () => btn.setFillStyle(0xffcc00));
                btn.on('pointerout', () => btn.setFillStyle(0xffaa00));
                btn.on('pointerdown', () => {
                    this.scrap -= cost;
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem(`neon_upg_${upg.id}`, level + 1);
                    this.dialogText.setText(DIALOGS[Phaser.Math.Between(0, DIALOGS.length - 1)]);
                    this.scene.restart();
                });
            }
        });
    }
}

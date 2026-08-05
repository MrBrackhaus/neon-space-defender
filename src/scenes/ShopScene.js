import Phaser from 'phaser';

/**
 * @file ShopScene.js
 * @description Implements the Wrench's Scrap Shop scene where players can purchase permanent
 * stat boosts (HP, Damage, Speed, Magnet, etc.) using Scrap collected during gameplay.
 * These upgrades persist across runs and are saved in localStorage.
 * @module scenes/ShopScene
 */

// ─── KLAR DEFINIERTE ZUSTÄNDIGKEITEN ───────────────────────────────────────
// SCRAP SHOP (Wrench): Permanente STAT-Boosts (HP, DMG, SPD, MAG).
//                        Diese skalieren mit dem Level → teure investition.
// TECH TREE:             Einmalige SYSTEM-Freischaltungen (Dash, Waffen,
//                        Schild-Pool, Evolutionen, etc.)
// INGAME LEVEL-UP:       Taktische Waffen & Upgrades pro Runde. Nur verfügbar
//                        wenn via Tech-Tree freigeschaltet.
// ───────────────────────────────────────────────────────────────────────────

/**
 * @constant {Array<Object>} SHOP_UPGRADES
 * @description Configuration array defining all available permanent upgrades in the shop.
 * Defines the identifier, display name, description, cost scaling, maximum level, and unit label.
 */
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

/**
 * @constant {Array<string>} DIALOGS
 * @description Array of randomized flavor text dialogues spoken by the shopkeeper (Wrench).
 */
const DIALOGS = [
    '"Oh, du lebst noch? Schade, ich hatte deine Reste schon an einen Toaster-Fabrikanten verkauft."',
    '"Wrench liebt Schrott! Genau wie meine Mutter, aber die hat Sterne gefressen."',
    '"Nicht genug Schrott! Geh sterben und komm mit Beute zurück, du Schnorrer!"',
    '"Das ist hochwertigstes Weltraummüll-Engineering. Gib mir Ihr Geld."',
    '"Sonderangebot! Bezahle mit deiner Lebenserwartung. Oh, die haben wir nicht auf Lager."',
    '"Normalerweise grinse ich. Aber seit du Penner meinen Lieblings-KI-Toaster zerschossen hast, gibt es hier nur böse Blicke, Majestät!"',
];

/**
 * @class ShopScene
 * @extends Phaser.Scene
 * @description Represents the permanent upgrade shop. Handles UI rendering, scrap currency
 * deduction, and upgrade persistence via localStorage.
 */
export default class ShopScene extends Phaser.Scene {
    
    /**
     * @constructor
     * @description Initializes the scene with the key 'ShopScene'.
     */
    constructor() { 
        super('ShopScene'); 
    }

    // ─────────────────── LIFECYCLE METHODS ───────────────────

    /**
     * @method create
     * @description Sets up the visual elements of the shop, including the background,
     * character sprite, titles, available scrap display, and the list of upgrades.
     */
    create() {
        const { width: cw, height: ch } = this.scale;

        // Draw the dark atmospheric background
        this.add.rectangle(0, 0, cw, ch, 0x0a0a1a).setOrigin(0);
        
        // Display the shopkeeper (Wrench) portrait on the left side of the screen
        this.add.image(cw * 0.25, ch * 0.5, 'scrap_merchant')
            .setOrigin(0.5)
            .setAlpha(0.85)
            .setDisplaySize(ch * 0.9, ch * 0.9); // Scale portrait to roughly fit the screen height

        /**
         * @property {number} scrap
         * @description The player's current scrap balance, retrieved from local storage.
         */
        this.scrap = parseInt(localStorage.getItem('neon_scrap') || '0', 10) || 0;

        // Center the UI horizontally in the available right-side space
        const uiCenterX = cw * 0.65;
        
        // Render the main shop title
        this.add.text(uiCenterX, 36, "🔧 WRENCH' SCHROTT & PFUSCH ⚙️", {
            fontFamily: 'Orbitron', fontSize: '28px', fontStyle: 'bold',
            color: '#ffaa00', stroke: '#552200', strokeThickness: 4
        }).setOrigin(0.5);

        // Render the subtitle
        this.add.text(uiCenterX, 68, 'PERMANENTE STAT-BOOSTS — GÜNSTIG WIE MEIN GEWISSEN', {
            fontFamily: 'Orbitron', fontSize: '10px', color: '#ffaa0088', letterSpacing: 4
        }).setOrigin(0.5);

        // Display current available scrap currency
        this.scrapText = this.add.text(uiCenterX, 92, `SCRAP: ${this.scrap}`, {
            fontFamily: 'Orbitron', fontSize: '22px', color: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Display a hint directing players to the tech tree for non-stat unlocks
        this.add.text(uiCenterX, 120, '💡 Neue Waffen & Fähigkeiten? 👉 TECH TREE im Hauptmenü!', {
            fontFamily: 'Orbitron', fontSize: '11px', color: '#00ffcc88', align: 'center'
        }).setOrigin(0.5);

        // Construct the interactive upgrade list
        this._buildList(cw, ch, uiCenterX);

        // Render a bottom dialog box for flavor text
        this.add.rectangle(cw / 2, ch - 100, cw * 0.8, 60, 0x050515, 0.9)
            .setStrokeStyle(1, 0xffaa00);
            
        // Select and display a random flavor text dialog from Wrench
        this.dialogText = this.add.text(cw / 2, ch - 100, DIALOGS[Phaser.Math.Between(0, DIALOGS.length - 1)], {
            fontFamily: 'Orbitron', fontSize: '14px', color: '#ffcc00',
            fontStyle: 'italic', align: 'center', wordWrap: { width: cw * 0.75 }
        }).setOrigin(0.5);

        // Setup the back button to return to the main menu
        const btnBack = this.add.text(cw / 2, ch - 40, '← ZURÜCK ZUM MENÜ', {
            fontFamily: 'Orbitron', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        btnBack.on('pointerdown', () => this.scene.start('MenuScene'));
        btnBack.on('pointerover', () => btnBack.setColor('#ffaa00'));
        btnBack.on('pointerout', () => btnBack.setColor('#ffffff'));
    }

    // ─────────────────── UI BUILDING METHODS ───────────────────

    /**
     * @method _buildList
     * @description Dynamically generates the UI rows for all available shop upgrades based
     * on the SHOP_UPGRADES configuration. Calculates costs, checks affordability, and handles purchases.
     * @param {number} cw - The canvas width.
     * @param {number} ch - The canvas height.
     * @param {number} uiCenterX - The horizontal center X coordinate for the list UI.
     */
    _buildList(cw, ch, uiCenterX) {
        const startY = 160; // Initial vertical position for the first row
        const rowH = 68;    // Height allocated per row
        const listWidth = 580; // Total width of the upgrade list container

        // Iterate through all defined upgrades to build their UI elements
        SHOP_UPGRADES.forEach((upg, i) => {
            // Retrieve the current level of this specific upgrade from local storage
            const level = parseInt(localStorage.getItem(`neon_upg_${upg.id}`) || '0', 10);
            
            // Check if the upgrade has reached its maximum allowed level
            const isMaxed = upg.max && level >= upg.max;
            
            // Calculate the scaling cost: Base cost + 50% extra for each existing level
            const cost = upg.baseCost + (level * Math.floor(upg.baseCost * 0.5));
            
            // Determine if the player has enough scrap and the upgrade is not maxed out
            const canAfford = this.scrap >= cost && !isMaxed;

            const y = startY + i * rowH;

            // Row background, color-coded based on status (Maxed = green, Affordable = orange, Unaffordable = gray)
            const rowBg = this.add.rectangle(uiCenterX, y, listWidth, rowH - 8, 0x050510, 0.95)
                .setStrokeStyle(1, isMaxed ? 0x00ff66 : (canAfford ? 0xffaa00 : 0x333344));

            // Name and description texts
            this.add.text(uiCenterX - listWidth/2 + 20, y - 14, upg.name, {
                fontFamily: 'Orbitron', fontSize: '14px', color: isMaxed ? '#00ff66' : '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            
            this.add.text(uiCenterX - listWidth/2 + 20, y + 8, upg.desc, {
                fontFamily: 'Orbitron', fontSize: '10px', color: '#8899aa'
            }).setOrigin(0, 0.5);

            // Unit label indicating the stat provided
            this.add.text(uiCenterX + 20, y, upg.unit, {
                fontFamily: 'Orbitron', fontSize: '13px', color: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Level indicator (e.g., "LVL 2/5" or "✔ MAX")
            this.add.text(uiCenterX + 90, y, isMaxed ? '✔ MAX' : `LVL ${level}/${upg.max || '∞'}`, {
                fontFamily: 'Orbitron', fontSize: '13px', color: isMaxed ? '#00ff66' : '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Purchase button configuration
            const btnW = 120, btnH = 38;
            const btnX = uiCenterX + listWidth/2 - btnW/2 - 10;
            const btnColor = isMaxed ? 0x113322 : (canAfford ? 0xffaa00 : 0x222233);
            const btnTxtColor = isMaxed ? '#00ff66' : (canAfford ? '#000000' : '#666677');
            const btnLabel = isMaxed ? '✔ MAXED' : (canAfford ? `KAUFEN (${cost})` : `${cost} SCRAP`);

            // Draw button background
            const btn = this.add.rectangle(btnX, y, btnW, btnH, btnColor)
                .setStrokeStyle(1, isMaxed ? 0x00ff66 : (canAfford ? 0xffcc00 : 0x444455));
                
            // Draw button label
            this.add.text(btnX, y, btnLabel, {
                fontFamily: 'Orbitron', fontSize: '11px', color: btnTxtColor, fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5);

            // Bind interaction events if the player can afford the upgrade
            if (canAfford) {
                btn.setInteractive({ useHandCursor: true });
                
                // Hover effects
                btn.on('pointerover', () => btn.setFillStyle(0xffcc00));
                btn.on('pointerout', () => btn.setFillStyle(0xffaa00));
                
                // Purchase logic
                btn.on('pointerdown', () => {
            if(this.game && this.game.audioSys) this.game.audioSys.playClick();
                    if(this.game.audioSys) this.game.audioSys.playBuy();
                    // Deduct cost and save new state to local storage
                    this.scrap -= cost;
                    localStorage.setItem('neon_scrap', this.scrap);
                    localStorage.setItem(`neon_upg_${upg.id}`, level + 1);
                    
                    // Update flavor text after purchase
                    this.dialogText.setText(DIALOGS[Phaser.Math.Between(0, DIALOGS.length - 1)]);
                    
                    // Restart scene to visually update all levels and buttons
                    this.scene.restart();
                });
            }
        });
    }
}

import Phaser from 'phaser';

/**
 * @file InGameShopScene.js
 * @description Implements Nyx's Illegal Cat Flap Shop, an mid-run shop where the player
 * can spend Cubes (in-run currency) to purchase temporary buffs or instant effects
 * for the current game session.
 * @module scenes/InGameShopScene
 */

// ══════════════════════════════════════════════════════════════════════════════
// NYX' ILLEGALER KATZENKLAPPEN-SHOP
// 38 Items, 3 zufällige Angebote pro Besuch (Rarität gewichtet).
// Cubes = In-Run-Währung. Items wirken nur in der aktuellen Runde.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @constant {Array<Object>} NYX_POOL
 * @description The complete pool of items that can appear in Nyx's in-game shop.
 * Divided into Offensive, Defensive, Utility, and Chaos/Risk categories.
 */
const NYX_POOL = [
    // ── OFFENSIV ───────────────────────────────────────────────────────────────
    { id: 'overclock',        icon: '⚡', name: 'Koffein-Schock',           cost: 18, rarity: 'common',   color: '#ffff00', desc: '+200% Feuerrate für 15 Sek. Herzversagen nicht garantiert.' },
    { id: 'berserker',        icon: '🔴', name: 'Berserker-Chip',            cost: 22, rarity: 'common',   color: '#ff4400', desc: '+50% Schaden, -30% Def. "Risiko ist Romantik."' },
    { id: 'explosive_rounds', icon: '💥', name: 'Explodierende Munition',    cost: 20, rarity: 'common',   color: '#ff8800', desc: 'Jeder Schuss explodiert beim Aufprall in kleinem AoE-Radius.' },
    { id: 'homing_rounds',    icon: '🎯', name: 'Suchwaffensystem',          cost: 25, rarity: 'uncommon', color: '#00ffff', desc: 'Geschosse biegen leicht in Richtung nächsten Feind ab.' },
    { id: 'double_fire',      icon: '🔫', name: 'Doppelläufer-Umbau',       cost: 22, rarity: 'uncommon', color: '#ff00cc', desc: '+1 Dauerhafter Schuss. Solange du lebst. Also kurz.' },
    { id: 'crit_boost',       icon: '⭐', name: 'Zielcomputer-Hack',        cost: 20, rarity: 'common',   color: '#ffdd00', desc: '+25% Crit-Chance. Aus völlig unbekannten Gründen.' },
    { id: 'poison_rounds',    icon: '☠️', name: 'Schimmelextrakt-Munition', cost: 18, rarity: 'common',   color: '#88ff00', desc: 'Vergiftet Treffer. 2 HP/Sek Schaden für 4 Sekunden.' },
    { id: 'ricochet',         icon: '🪃', name: 'Prallschuss-Modul',        cost: 24, rarity: 'uncommon', color: '#ff9966', desc: 'Geschosse prallen an Wänden und bis zu 2 weiteren Feinden ab.' },
    { id: 'overcharge',       icon: '🔋', name: 'Überladungs-Kapazitor',    cost: 28, rarity: 'uncommon', color: '#ffcc00', desc: 'Nächste 15 Schüsse: 500% Schaden. Danach: reguläre Waffe.' },
    { id: 'bullet_speed',     icon: '💨', name: 'Hypergeschoss-Kit',        cost: 16, rarity: 'common',   color: '#ccffff', desc: '+80% Projektilgeschwindigkeit. Trifft auch schnelle Ziele.' },
    { id: 'emp_blast',        icon: '🌩️', name: 'EMP-Granate',              cost: 22, rarity: 'uncommon', color: '#88aaff', desc: 'Betäubt ALLE Feinde für 3 Sekunden sofort beim Kauf.' },
    { id: 'damage_aura',      icon: '🔥', name: 'Plasma-Aura',              cost: 26, rarity: 'uncommon', color: '#ff4400', desc: 'Feinde im Radius 100px nehmen dauerhaft 5 DMG/Sek.' },
    { id: 'sniper_mode',      icon: '🔭', name: 'Sniper-Protokoll',         cost: 24, rarity: 'uncommon', color: '#ffaacc', desc: 'Schüsse durchdringen alle Feinde. Feuerrate halbiert.' },

    // ── DEFENSIV ──────────────────────────────────────────────────────────────
    { id: 'shield_recharge',  icon: '🛡️', name: 'Schild-Notladung',         cost: 14, rarity: 'common',   color: '#4499ff', desc: 'Stellt alle Schutzschild-Ladungen sofort wieder her.' },
    { id: 'full_heal',        icon: '💊', name: 'Notfall-Sanitätsstift',    cost: 20, rarity: 'uncommon', color: '#00ff66', desc: 'Heilt 60% der max. HP. Schmeckt nach altem Katzenfutter.' },
    { id: 'temp_shield',      icon: '🔷', name: 'Temporäres Kraftfeld',     cost: 16, rarity: 'common',   color: '#00ccff', desc: '+2 Schild-Ladungen für diese Runde. Schmilzt bei Hitze.' },
    { id: 'invincible_dash',  icon: '👻', name: 'Ghost-Protocol',            cost: 22, rarity: 'uncommon', color: '#aabbff', desc: 'Dash macht dich für 1 Sek unverwundbar (statt 0.25 Sek).' },
    { id: 'regen_boost',      icon: '💚', name: 'Nano-Droge',               cost: 18, rarity: 'common',   color: '#00ff88', desc: '+8 HP/Sek Regen für diese Runde. Aus fragwürdigen Quellen.' },
    { id: 'mirror_shield',    icon: '🪞', name: 'Reflektor-Panel',          cost: 26, rarity: 'uncommon', color: '#aaddff', desc: '30% Chance: Eingehender Schaden trifft stattdessen den Angreifer.' },
    { id: 'hp_to_shield',     icon: '⚗️', name: 'HP-Konverter',             cost: 18, rarity: 'common',   color: '#aa55ff', desc: 'Opfert 25% HP → +3 Schild-Ladungen. "Gesundheit ist Schildausdruck."' },
    { id: 'guardian_angel',   icon: '😇', name: 'Schutzengel-Protokoll',    cost: 32, rarity: 'rare',     color: '#ffffaa', desc: 'Einmalig: Überlebe tödlichen Treffer mit 1 HP. Dann ist Schluss.' },
    { id: 'speed_boost',      icon: '🚀', name: 'Nachbrenner-Modul',        cost: 16, rarity: 'common',   color: '#ffff88', desc: '+40% Bewegungsgeschwindigkeit für diese Runde.' },

    // ── UTILITY ───────────────────────────────────────────────────────────────
    { id: 'orbital_strike',   icon: '☄️', name: 'Katzenklo-Orbital-Laser',  cost: 12, rarity: 'common',   color: '#ff00aa', desc: 'Feinde unter galaktischem Katzenstreu begraben. Sofort.' },
    { id: 'vampire_protocol', icon: '🧛', name: 'Zecken-Modul',             cost: 15, rarity: 'common',   color: '#cc00ff', desc: '20% Trefferchance: Heilt 1 HP. Widerlich, aber effektiv.' },
    { id: 'scrap_magnet',     icon: '🧲', name: 'Schrott-Magnet Ultra',     cost: 12, rarity: 'common',   color: '#ffaa00', desc: '+200px XP/Scrap-Anziehungsradius für diese Runde.' },
    { id: 'xp_boost',         icon: '📈', name: 'Erfahrungs-Injektion',     cost: 16, rarity: 'uncommon', color: '#88ff88', desc: 'Sofort +80 XP. "Erfahrung kaufen" ist nur ein Konzept.' },
    { id: 'nova_refill',      icon: '💣', name: 'Plutonium-Reload',         cost: 14, rarity: 'common',   color: '#ff00ff', desc: '+2 Nova-Bomben. Nyx garantiert keine Rücknahme.' },
    { id: 'wave_skip',        icon: '⏭️', name: 'Wellen-Bestechung',        cost: 30, rarity: 'rare',     color: '#ff4444', desc: 'Überspringt die nächste Welle. Bestechung funktioniert im All.' },
    { id: 'score_multiplier', icon: '✖️', name: 'Score-Doppler',            cost: 20, rarity: 'uncommon', color: '#ffcc44', desc: '2× Score für 30 Sek. Ranglistenmanipulation inklusive.' },
    { id: 'xp_vacuum',        icon: '🌀', name: 'XP-Staubsauger',          cost: 14, rarity: 'common',   color: '#88ffcc', desc: 'Saugt ALLE XP-Kristalle auf dem Bildschirm sofort ein.' },
    { id: 'cube_rain',        icon: '💎', name: 'Würfelregen',              cost: 10, rarity: 'common',   color: '#aa77ff', desc: '+25 Cubes sofort. Nyx druckt Währung. Klassisch.' },
    { id: 'gravity_well',     icon: '🌑', name: 'Schwerekraft-Kammer',      cost: 26, rarity: 'uncommon', color: '#8800ff', desc: 'Zieht alle Feinde 5 Sek zur Bildschirmmitte. Dann: Chaos.' },
    { id: 'kill_weakest',     icon: '💀', name: "Nyx' Selektionsprogramm",  cost: 20, rarity: 'uncommon', color: '#ff0044', desc: 'Eliminiert die 10 schwächsten Gegner auf dem Bildschirm. "Survival of the fittest."' },

    // ── CHAOS & RISIKO ────────────────────────────────────────────────────────
    { id: 'chaos_mode',       icon: '🎲', name: 'Chaos-Würfel',             cost: 8,  rarity: 'rare',     color: '#ff44ff', desc: 'ZUFÄLLIG: 60% mächtiger Buff, 40% kleiner Debuff. Nyx weiß selbst nicht was passiert.' },
    { id: 'glass_cannon',     icon: '🔮', name: 'Glaskanonen-Modus',        cost: 18, rarity: 'rare',     color: '#ffaaff', desc: '+200% Schaden. -80% HP. Nyx nennt es "Balance".' },
    { id: 'time_slow',        icon: '⏳', name: 'Zeitverzerrung',           cost: 25, rarity: 'rare',     color: '#00ffff', desc: 'Verlangsamt alle Feinde für 8 Sekunden um 50%. Auch Bosse.' },
    { id: 'clone_shot',       icon: '👥', name: 'Hologramm-Splitter',       cost: 28, rarity: 'rare',     color: '#ff00ff', desc: 'Schüsse teilen sich nach 0.3 Sek in 2 Projektile auf.' },
];

/**
 * @constant {Array<string>} NYX_DIALOGS
 * @description Random flavor text spoken by Nyx, the cat shopkeeper.
 */
const NYX_DIALOGS = [
    '"Nyx akzeptiert Cubes, Seelen und Kratzer hinter dem Ohr. Nur Cubes im Angebot."',
    '"Alles handgemacht. Von einer Katze. Im Vakuum. Stell keine Fragen."',
    '"Nicht genug Cubes? Geh töten und komm mit Geld zurück. Das ist Geschäftspolitik."',
    '"Diese Waren stammen aus legalen Quellen. Definition von \'legal\' ist verhandelbar."',
    '"Schnell! Die Garantie läuft ab sobald du den Shop verlässt. Also: Gar keine Garantie."',
    '"Kaufe heute, bereue morgen. Das ist das Motto dieses Unternehmens."',
    '"Nyx war früher Quantenphysikerin. Jetzt verkauft sie Explosionen. Beides sinnlos."',
    '"Der Chaos-Würfel hat letzte Woche einer Katze das Fell verdoppelt. Nur so als Warnung."',
    '"Wir haben keine Rückgaberichtlinie. Wir haben auch kein Herz. Wir sind ein Konzern."',
    '"Das Glaskanonen-Modul wurde von einem Typen mit sehr kurzer Lebenserwartung entwickelt."',
];

/**
 * @constant {Object} RARITY_CONFIG
 * @description Configuration mapping for item rarities governing their background color,
 * border color, text label, and statistical weighting during random pool generation.
 */
const RARITY_CONFIG = {
    common:   { bg: 0x0d1a2e, border: 0x3a5a7a, label: 'GEWÖHNLICH',   weight: 50 },
    uncommon: { bg: 0x0d1a30, border: 0x3355bb, label: 'UNGEWÖHNLICH', weight: 30 },
    rare:     { bg: 0x1a0d2e, border: 0x8833cc, label: '★ SELTEN ★',   weight: 20 },
};

/**
 * @constant {Array<string>} CHAOS_BUFFS
 * @description IDs of items that can be granted positively through the Chaos Cube item.
 */
const CHAOS_BUFFS = ['double_fire', 'crit_boost', 'full_heal', 'regen_boost', 'nova_refill', 'bullet_speed', 'xp_boost'];

/**
 * @constant {Array<string>} CHAOS_DEBUFFS
 * @description IDs of items that can be granted negatively (self-harming) through the Chaos Cube item.
 */
const CHAOS_DEBUFFS = ['berserker', 'overclock']; // Treated as self-harm (berserker reduces defense)

/**
 * @class InGameShopScene
 * @extends Phaser.Scene
 * @description Represents Nyx's mid-run shop scene. Provides 3 randomly selected
 * (weighted by rarity) items that the player can purchase with cubes. Items grant
 * immediate effects or temporary buffs in the GameScene.
 */
export default class InGameShopScene extends Phaser.Scene {
    
    /**
     * @constructor
     * @description Initializes the scene with the key 'InGameShopScene'.
     */
    constructor() { 
        super('InGameShopScene'); 
    }

    // ─────────────────── LIFECYCLE METHODS ───────────────────

    /**
     * @method init
     * @description Prepares the scene by accepting payload data from the calling GameScene.
     * @param {Object} data - Contains current game state.
     * @param {number} data.cubes - Current cubes available to spend.
     * @param {Object} data.upgLevels - Current levels of in-game upgrades.
     * @param {Object} data.flags - Specific gameplay flags.
     * @param {Array<string>} data.purchasedBuffs - Previously purchased buffs during this shop visit.
     * @param {Array<Object>} data.currentOffer - The current set of 3 offers (if already rolled).
     */
    init(data) {
        this.cubes = data.cubes || 0;
        this.upgLevels = data.upgLevels || {};
        this.flags = data.flags || {};
        this.purchasedBuffs = data.purchasedBuffs || [];
        this.currentOffer = data.currentOffer || null;
    }

    /**
     * @method create
     * @description Builds the user interface for the in-game shop, including backgrounds,
     * header, cube counter, the items for sale, and the exit button.
     */
    create() {
        const { width: cw, height: ch } = this.scale;

        // ── BACKGROUND ──
        // Solid black background with scanlines
        this.add.rectangle(0, 0, cw, ch, 0x000000, 0.9).setOrigin(0);
        const sl = this.add.graphics().setAlpha(0.05);
        for (let y = 0; y < ch; y += 4) { sl.fillStyle(0xffffff).fillRect(0, y, cw, 1); }

        // ── HEADER ──
        this.add.text(cw / 2, 40, '😺 NYX\' ILLEGALER KATZENKLAPPEN-SHOP 😺', {
            fontFamily: 'Orbitron', fontSize: '20px', fontStyle: 'bold',
            color: '#cc00ff', stroke: '#00ffcc', strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(cw / 2, 66, '— QUALITÄTSWAREN AUS ZWEITER HAND — GARANTIE: KEINE —', {
            fontFamily: 'Orbitron', fontSize: '8px', color: '#880088', letterSpacing: 4
        }).setOrigin(0.5);

        // Display current cubes (currency)
        this.cubesText = this.add.text(cw / 2, 92, `💎 ${this.cubes} CUBES`, {
            fontFamily: 'Orbitron', fontSize: '20px', color: '#aa00ff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // ── SHOP ITEMS ──
        this._buildShop(cw, ch);

        // ── DIALOG ──
        // Show Nyx's flavor text at the bottom
        this.dialogText = this.add.text(cw / 2, ch - 88, NYX_DIALOGS[0], {
            fontFamily: 'Orbitron', fontSize: '10px', color: '#00ffcc',
            fontStyle: 'italic', align: 'center', wordWrap: { width: Math.min(cw - 40, 860) }
        }).setOrigin(0.5).setDepth(5);

        // ── RESUME BUTTON ──
        // Return to the game, passing back remaining cubes and purchased buffs
        const btn = this.add.text(cw / 2, ch - 46, '▶  WEITER KÄMPFEN  ◀', {
            fontFamily: 'Orbitron', fontSize: '19px', fontStyle: 'bold',
            color: '#000000', backgroundColor: '#00ffcc', padding: { x: 22, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5);

        btn.on('pointerover', () => { btn.setStyle({ backgroundColor: '#ffffff' }); if(this.game.audioSys) this.game.audioSys.playHover(); });
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#00ffcc' }));
        btn.on('pointerdown', () => {
            if(this.game.audioSys) this.game.audioSys.playClick();
            // Resume the paused GameScene with updated stats
            this.scene.resume('GameScene', { cubes: this.cubes, buffs: this.purchasedBuffs });
            this.scene.stop();
        });
    }

    // ─────────────────── CORE LOGIC METHODS ───────────────────

    /**
     * @method _buildShop
     * @description Constructs the item offer UI. Selects 3 random items from NYX_POOL based
     * on rarity weights (if no offer is currently set). Dynamically injects Evolution items
     * into the pool if the prerequisites are met.
     * @param {number} cw - Canvas width.
     * @param {number} ch - Canvas height.
     */
    _buildShop(cw, ch) {
        // Check tech tree requirements
        const hasFusionCore = parseInt(localStorage.getItem('neon_tech_fusion') || '0') > 0;

        // Build a pool excluding items that have already been bought in this shop visit
        let pool = NYX_POOL.filter(item => !this.purchasedBuffs.includes(item.id));

        // Append conditional evolution items if tech and in-run requirements are met
        if (hasFusionCore) {
            if ((this.upgLevels['damage'] || 0) >= 5 && (this.upgLevels['area'] || 0) >= 1 && !this.flags.hasSupernova)
                pool.push({ id: 'evo_supernova',   icon: '🌟', name: 'SUPERNOVA (EVO)',   cost: 25, rarity: 'rare', color: '#ff0000', desc: 'Gigantische Explosion bei JEDEM Treffer.' });
            
            if ((this.upgLevels['chain_lightning'] || 0) >= 5 && (this.upgLevels['fire_rate'] || 0) >= 5 && !this.flags.hasLaserWhip)
                pool.push({ id: 'evo_laser_whip',  icon: '⚡', name: 'LASER WHIP (EVO)',  cost: 25, rarity: 'rare', color: '#00ffff', desc: 'Peitscht tödliche Blitze über das Feld.' });
            
            if ((this.upgLevels['magnet'] || 0) >= 5 && (this.upgLevels['area'] || 0) >= 1 && !this.flags.hasVoidVortex)
                pool.push({ id: 'evo_void_vortex', icon: '🌑', name: 'VOID VORTEX (EVO)', cost: 30, rarity: 'rare', color: '#8800ff', desc: 'Schwarzes Loch saugt alle Feinde an.' });
        }

        let offer = this.currentOffer;
        
        // If there's no active offer list, roll 3 new items
        if (!offer) {
            // Weighted shuffle (rares are drawn less frequently)
            const weighted = [];
            pool.forEach(item => {
                const w = RARITY_CONFIG[item.rarity]?.weight ?? 30;
                for (let i = 0; i < w; i++) weighted.push(item);
            });
            
            const picked = [];
            const seen = new Set();
            
            // Draw 3 unique items
            Phaser.Utils.Array.Shuffle(weighted).forEach(item => {
                if (!seen.has(item.id)) { 
                    seen.add(item.id); 
                    picked.push(item); 
                }
            });
            offer = picked.slice(0, 3);
            this.currentOffer = offer;
        }

        const itemH = 88;
        const totalH = offer.length * itemH;
        const startY = Math.max(120, ch / 2 - totalH / 2 + 28);

        // Render each item in the offer list
        offer.forEach((item, i) => {
            const y = startY + i * itemH;
            const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
            const isPurchased = this.purchasedBuffs.includes(item.id);
            const canAfford = !isPurchased && this.cubes >= item.cost;
            const borderCol = isPurchased ? 0x00cc55 : (canAfford ? cfg.border : 0x333355);

            // Container for the item
            const rowWidth = Math.min(cw - 60, 940);
            const row = this.add.rectangle(cw / 2, y, rowWidth, itemH - 8, cfg.bg, 0.97)
                .setStrokeStyle(isPurchased ? 2 : 1, borderCol)
                .setInteractive({ useHandCursor: canAfford && !isPurchased });

            const leftX = cw / 2 - rowWidth / 2 + 20;
            const rightX = cw / 2 + rowWidth / 2 - 20;

            // Rarity label above item name
            this.add.text(leftX, y - 32, cfg.label, {
                fontFamily: 'Orbitron', fontSize: '7px', color: item.rarity === 'rare' ? '#cc55ff' : item.rarity === 'uncommon' ? '#5577ee' : '#446677', fontStyle: 'bold'
            });

            // Item Icon and Name
            this.add.text(leftX, y - 17, `${item.icon}  ${item.name}`, {
                fontFamily: 'Orbitron', fontSize: '15px', fontStyle: 'bold',
                color: isPurchased ? '#00cc55' : (item.color || '#ffffff')
            });

            // Item Description
            this.add.text(leftX, y + 12, item.desc, {
                fontFamily: 'Orbitron', fontSize: '10px', color: '#8899aa', wordWrap: { width: Math.max(200, rowWidth - 140) }
            });

            // Cost indicator (or "Bought" text)
            const badge = isPurchased ? '✔ GEKAUFT' : `💎 ${item.cost}`;
            const badgeCol = isPurchased ? '#00cc55' : (canAfford ? '#ffaa00' : '#555566');
            this.add.text(rightX, y, badge, {
                fontFamily: 'Orbitron', fontSize: '14px', fontStyle: 'bold', color: badgeCol
            }).setOrigin(1, 0.5);

            // Add purchase logic if the player has enough cubes
            if (canAfford) {
                row.on('pointerover', () => row.setAlpha(0.85));
                row.on('pointerout', () => row.setAlpha(1));
                row.on('pointerdown', () => { if(this.game.audioSys) this.game.audioSys.playClick(); this._purchase(item); });
            }
        });
    }

    /**
     * @method _purchase
     * @description Handles the transaction when a player clicks an item. Deducts cubes,
     * registers the purchase, flashes the camera, and reloads the scene state.
     * @param {Object} item - The item object being purchased.
     */
    _purchase(item) {
        // Validation: Safety check in case of rapid clicking
        if (this.cubes < item.cost) {
            this.cameras.main.shake(180, 0.01);
            if(this.game.audioSys) this.game.audioSys.playError();
            this.dialogText.setText('"Nicht genug Cubes! Geh töten und komm mit Geld zurück."');
            return;
        }

        // Special logic: 'cube_rain' generates more currency than it costs
        if (item.id === 'cube_rain') {
            this.cubes += 15; // Net +15 (Cost 10, Gain 25)
        } else {
            this.cubes -= item.cost;
        }

        // Mark this buff as purchased for the current run/visit
        this.purchasedBuffs.push(item.id);
        
        // Provide visual feedback for a successful transaction
        if(this.game.audioSys) this.game.audioSys.playBuy();
        this.cameras.main.flash(120, 0, 120, 60);
        this.dialogText.setText(NYX_DIALOGS[Phaser.Math.Between(0, NYX_DIALOGS.length - 1)]);

        // Restart the scene slightly delayed to immediately reflect the updated currency and visual states
        this.time.delayedCall(200, () => this.scene.restart({
            cubes: this.cubes,
            upgLevels: this.upgLevels,
            flags: this.flags,
            purchasedBuffs: this.purchasedBuffs,
            currentOffer: this.currentOffer
        }));
    }
}


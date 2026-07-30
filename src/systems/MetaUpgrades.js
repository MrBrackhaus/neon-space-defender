/**
 * @file MetaUpgrades.js
 * @description Provides helper functions to fetch and calculate persistent meta-upgrades (talents/skills) 
 * that carry over between game runs, stored in localStorage.
 * @module MetaUpgrades
 */

/**
 * @description Retrieves the raw level data for all meta upgrades from local storage.
 * Defaults to 0 if the upgrade has not been purchased.
 * @returns {{hp: number, dmg: number, magnet: number, greed: number}} Object containing the raw levels.
 */
export function getMetaUpgrades() {
    return {
        hp: parseInt(localStorage.getItem('neon_meta_hp') || '0', 10),
        dmg: parseInt(localStorage.getItem('neon_meta_dmg') || '0', 10),
        magnet: parseInt(localStorage.getItem('neon_meta_magnet') || '0', 10),
        greed: parseInt(localStorage.getItem('neon_meta_greed') || '0', 10)
    };
}

/**
 * @description Calculates the actual in-game modifiers based on the raw upgrade levels.
 * Maps the upgrade levels to specific multipliers or additive bonuses used by the game systems.
 * @returns {{hpMult: number, dmgMult: number, magnetBonus: number, greedMult: number}} Object containing the calculated stat modifiers.
 */
export function getMetaStats() {
    const u = getMetaUpgrades();
    return {
        hpMult: 1 + (u.hp * 0.10),      // +10% max HP per level
        dmgMult: 1 + (u.dmg * 0.05),    // +5% damage per level
        magnetBonus: u.magnet * 20,     // +20 radius flat per level
        greedMult: 1 + (u.greed * 0.10) // +10% scrap gain multiplier per level
    };
}

// Attach to global window object so GameScene or debugging consoles can access it easily without importing
window.getMetaStats = getMetaStats;

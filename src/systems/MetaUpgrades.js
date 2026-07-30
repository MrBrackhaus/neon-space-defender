export function getMetaUpgrades() {
    return {
        hp: parseInt(localStorage.getItem('neon_meta_hp') || '0', 10),
        dmg: parseInt(localStorage.getItem('neon_meta_dmg') || '0', 10),
        magnet: parseInt(localStorage.getItem('neon_meta_magnet') || '0', 10),
        greed: parseInt(localStorage.getItem('neon_meta_greed') || '0', 10)
    };
}

export function getMetaStats() {
    const u = getMetaUpgrades();
    return {
        hpMult: 1 + (u.hp * 0.10),
        dmgMult: 1 + (u.dmg * 0.05),
        magnetBonus: u.magnet * 20,
        greedMult: 1 + (u.greed * 0.10)
    };
}

// Attach to window so GameScene can easily access without importing if needed
window.getMetaStats = getMetaStats;

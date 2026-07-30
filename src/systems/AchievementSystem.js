/**
 * @file AchievementSystem.js
 * @description Centralized tracker for player achievements. Uses localStorage to persist unlock states.
 * @module AchievementSystem
 */

export default class AchievementSystem {
    /**
     * @class AchievementSystem
     * @description Handles defining and querying game achievements.
     */
    constructor() {
        /** 
         * @type {Array<Object>} List of all achievements in the game.
         * Note: German strings remain for UI/narrative consistency.
         */
        this.achievements = [
            { id: 'death_10', name: 'Toaster-Schänder', desc: 'Du bist 10 Mal gestorben. Respekt.' },
            { id: 'scrap_10k', name: 'Schrott-Magnet', desc: '10.000 Scrap gesammelt. Reich und nutzlos.' },
            { id: 'boss_1', name: 'Piratenkönig auf Abwegen', desc: 'Ersten Boss besiegt. Gut gemacht.' },
            { id: 'nova_miss', name: 'Nova-Verschwender', desc: 'Nova gezündet, ohne etwas zu treffen.' },
            { id: 'pacifist', name: 'Pazifist', desc: 'Ausweichen ist auch eine Lösung.' },
            { id: 'glass_cannon', name: 'Glaskanone', desc: 'Maximaler Schaden, minimale Rüstung.' },
            { id: 'turtle', name: 'Schildkröte', desc: 'Mehr Schilde als Hülle.' },
            { id: 'destroyer', name: 'Zerstörer', desc: '1000 Gegner vernichtet.' }
        ];
    }

    /**
     * @description Attempts to unlock an achievement.
     * @param {string} id - The internal ID of the achievement to unlock.
     * @returns {boolean} True if the achievement was newly unlocked, false if already unlocked.
     */
    unlock(id) {
        const key = `neon_ach_${id}`;
        
        // Check if it's already recorded in localStorage
        if (localStorage.getItem(key)) {
            return false;
        }
        
        // Flag as unlocked
        localStorage.setItem(key, '1');
        return true;
    }

    /**
     * @description Returns the complete list of achievements combined with their current unlock status.
     * @returns {Array<Object>} Array of achievement objects, each populated with a boolean `unlocked` property.
     */
    getAll() {
        return this.achievements.map(a => ({
            ...a,
            unlocked: !!localStorage.getItem(`neon_ach_${a.id}`)
        }));
    }
}

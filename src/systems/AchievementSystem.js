export default class AchievementSystem {
    constructor() {
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

    unlock(id) {
        const key = `neon_ach_${id}`;
        if (localStorage.getItem(key)) {
            return false;
        }
        localStorage.setItem(key, '1');
        return true;
    }

    getAll() {
        return this.achievements.map(a => ({
            ...a,
            unlocked: !!localStorage.getItem(`neon_ach_${a.id}`)
        }));
    }
}

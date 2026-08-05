/**
 * @file EventSystem.js
 * @description Handles dynamic narrative events and companion characters (Sparkles, Nyx, Jergeric).
 * Manages boss intro cutscenes and contextual dialogue triggered by gameplay events.
 * @module EventSystem
 */

import Phaser from 'phaser';

export default class EventSystem {
    /**
     * @class EventSystem
     * @description System for rendering dramatic text events and companion commentary.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        this.scene = scene;
        this.isEventActive = false;
        this.isCompanionActive = false;
        this.lastCompanionCommentTime = 0;
        
        // Configuration for the companions – no sprite textures needed, uses generated graphics
        this.companions = {
            sparkles: { name: "SPARKLES:", color: '#ff00ff', tint: 0xff00ff, emoji: '\u{1F984}' },
            nyx: { name: "NYX:", color: '#00ffcc', tint: 0x00ffcc, emoji: '\u{1F431}' },
            jergeric: { name: "K\u00c4PT'N JERGERIC:", color: '#ff4400', tint: 0xff4400, emoji: '\u{1F3F4}\u200D\u2620\uFE0F' }
        };

        this.companionMessages = {
            sparkles: {
                take_damage: [
                    "Oh, ein Asteroid! Komm, wir fliegen direkt rein, das wird lustig!",
                    "Hast du eigentlich Augen im Kopf oder sind das nur bemalte Glasmurmeln?",
                    "Mein sch\u00f6ner Lack! Wenn wir \u00fcberleben, zahlst DU das!",
                    "Aua! Mein Horn vibriert vor Schmerz!"
                ],
                heal: [
                    "Oh, wir flicken das Schiff zusammen? Wie originell.",
                    "Ein bisschen Sternenstaub drauf und gut ist.",
                    "Magie! Oder wie ihr das nennt: Nanobots."
                ],
                level_up: [
                    "Level Up! Deine \u00dcberlebenschancen sind von 'unm\u00f6glich' auf 'h\u00f6chst unwahrscheinlich' gestiegen.",
                    "Soll ich jetzt klatschen? Meine Hufe sind m\u00fcde.",
                    "Wow, du wirst st\u00e4rker! Fast so stark wie mein kleiner Zeh."
                ],
                unlock_ship: [
                    "Du kaufst dir also NOCH mehr Schrott? Faszinierend.",
                    "Egal in welches Schiff du steigst, du fliegst es eh gegen die Wand."
                ],
                unlock_tech: [
                    "Neue Technologie? Versuch, dich nicht damit in die Luft zu sprengen.",
                    "Toll. Jetzt kannst du auf eine noch spektakul\u00e4rere Weise versagen."
                ],
                idle: [
                    "Soll ich das Schiff fliegen? Weil du scheinst ja besch\u00e4ftigt zu sein.",
                    "G\u00e4hn. Weck mich, wenn du entscheidest, nicht mehr nutzlos zu sein.",
                    "Ich starre seit 5 Minuten ins Void. Genau wie du."
                ],
                boss_spawn: [
                    "Oh nein, ein Boss! Ich verstecke mich hinter dir. Viel Spa\u00df!",
                    "Das Ding ist RIESIG! Gut, dass es dein Problem ist, nicht meins.",
                    "Das sieht aus wie mein Ex. Genau so bedrohlich."
                ],
                boss_kill: [
                    "Du hast es geschafft?! Ich meine... nat\u00fcrlich hast du das. Ich habe nie gezweifelt.",
                    "YAAAS! Nimm DAS, du h\u00e4ssliches Void-Vieh!",
                    "Respekt. F\u00fcr einen Sterblichen gar nicht mal so schlecht."
                ],
                combo_milestone: [
                    "Okay okay, du bist on fire! Aber wortw\u00f6rtlich \u2013 dein Triebwerk qualmt.",
                    "So viele Kills am St\u00fcck? Sag blo\u00df, du hast endlich fliegen gelernt!",
                    "COMBO-QUEEN! ...oder King. Was auch immer du bist."
                ],
                dev_cheat: [
                    "Cheater! Aber ich respektiere den Hustle.",
                    "Oh, wir schummeln jetzt? Stylish."
                ]
            },
            nyx: {
                take_damage: [
                    "Rawr xD *nuzzles your broken shields*",
                    "Lade Schadensbericht via ICQ hoch... Fehler 404: Skill nicht gefunden.",
                    "Dein Raumschiff hat weniger HP als mein Tamagotchi von 1999.",
                    "gg no re"
                ],
                heal: [
                    "Heilung runtergeladen. Dauerte 3 Stunden mit meinem 56k Modem.",
                    "Du wurdest geheilt! Bitte sende 'Jamba' an die 33333 f\u00fcr mehr HP.",
                    "HP restored. *dial-up noises*"
                ],
                level_up: [
                    "Level Up! ROFLMAO",
                    "Das war so l33t von dir!",
                    "Du steigst schneller auf als ein Limewire-Download!",
                    "XP go brrr"
                ],
                unlock_ship: [
                    "Neues Schiff erkannt! Installiere Kazaa und MySpace-App...",
                    "Woah, das Teil sieht aus wie mein erstes Nokia 3310!"
                ],
                unlock_tech: [
                    "Forschung abgeschlossen. *Modem-Einw\u00e4hl-Ger\u00e4usche*",
                    "Upgrade erhalten! Hoffentlich war da kein Trojaner drin."
                ],
                idle: [
                    "AFK? lol",
                    "BRB, muss mein MySpace-Profil anpassen.",
                    "zzz... *schnurr* ...zzz"
                ],
                boss_spawn: [
                    "Boss detected! Loading boss_fight.exe... please wait...",
                    "omg so ein Chunk! Der lagged bestimmt den ganzen Server!",
                    "*hisst* Der ist gr\u00f6\u00dfer als mein Bildschirm!"
                ],
                boss_kill: [
                    "GG EZ! *drops mic*",
                    "Boss eliminated. Achievement unlocked: 'Touch Grass'",
                    "pwned lmao"
                ],
                combo_milestone: [
                    "KILL STREAK! Du bist on fire! ...metaphorisch. Meistens.",
                    "C-C-C-COMBO BREAKER! Oh wait, du machst ja weiter.",
                    "Multikill! Dein K/D ist endlich \u00fcber 1.0!"
                ],
                dev_cheat: [
                    "IDDQD aktiviert... wait, falsches Spiel.",
                    "Cheat codes? Sehr retro. Gef\u00e4llt mir."
                ]
            },
            jergeric: {
                take_damage: [
                    "Kratz nicht den Lack ab! Das ist das einzige funktionierende Schiff, das mir geblieben ist!",
                    "Pass auf den Pizza-Roller auf! Die Void-Kreaturen fressen sonst den ganzen K\u00e4se!",
                    "ARRR! Mein Schiff! Das kostet dich deinen Sold!"
                ],
                heal: [
                    "Gut so! Reparier den Kahn, bevor er auseinander f\u00e4llt!",
                    "Nanobots an die Arbeit! Mein Schiff muss gl\u00e4nzen wie Gold!"
                ],
                level_up: [
                    "Weiter so! Zeig diesen Void-Schergen, wie unglaublich laktoseintolerant wir sind!",
                    "Arr! Dein Fett-Schild wehrt all ihre Antimaterie-Angriffe ab! Genial!",
                    "Du wirst st\u00e4rker! Bald bist du fast so gut wie ich in meiner Bl\u00fctezeit!"
                ],
                unlock_ship: [
                    "Ein weiser Kauf, Pizza-Boy! Damit fliegen wir direkt ins Auge des Voids!",
                    "Ich h\u00e4tte nicht gedacht, dass du diesen Schrotthaufen wirklich nimmst!"
                ],
                unlock_tech: [
                    "Neue Technologie aus den Tr\u00fcmmern der alten Flotte! Gut geborgen!",
                    "Das h\u00e4tte ich damals auch gebraucht... bevor das Void alles verschlungen hat."
                ],
                idle: [
                    "Schie\u00df weiter! Wir m\u00fcssen das Universum vor der ultimativen Leere retten!",
                    "Was stehst du rum?! Das Void wartet nicht auf deine Kaffeepause!"
                ],
                boss_spawn: [
                    "BEI MEINEM BART! Dieses Biest kenne ich! Es hat meine dritte Flotte gefressen!",
                    "ALLE KANONEN AUF DIESES DING! Das ist der Boss! FEUERFREI!",
                    "Das... das ist unm\u00f6glich. Das Void hat eine seiner Bestien geschickt!"
                ],
                boss_kill: [
                    "HAHAHA! Das ist f\u00fcr meine Crew! F\u00fcr meine Flotte! F\u00dcR DEN K\u00c4SE!",
                    "GROSSARTIG! Du bist der beste Rekrut, den ich je hatte!",
                    "SIEG! Aber feiere nicht zu fr\u00fch... das Void schl\u00e4ft nie."
                ],
                combo_milestone: [
                    "SO macht man das! Genau wie in der gro\u00dfen Schlacht von Sektor 7!",
                    "WEITER! MEHR! SCHNELLER! Lass keinen am Leben!",
                    "In meiner Jugend habe ich 200 auf einmal erledigt! ...na gut, 20."
                ],
                dev_cheat: [
                    "Geheime Piratencodes? Du sprichst meine Sprache, Junge!",
                    "Als Kapit\u00e4n erlaube ich offiziell diesen taktischen Vorteil."
                ]
            }
        };
    }

    // BOSS EVENT
    showBossIntro(bossType, callback) {
        if (this.isEventActive) return;
        this.isEventActive = true;

        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.pause();
        }
        
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const container = this.scene.add.container(0, 0).setDepth(1000);
        const overlay = this.scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
        container.add(overlay);

        const topBar = this.scene.add.rectangle(centerX, -100, width, 150, 0x000000).setStrokeStyle(4, 0xff00ff);
        const bottomBar = this.scene.add.rectangle(centerX, height + 100, width, 150, 0x000000).setStrokeStyle(4, 0xff00ff);
        container.add([topBar, bottomBar]);

        let bossName = "UNKNOWN ENTITY";
        let bossSubtitle = "Hobbies: Existing";
        let bossColor = 0xff0000;

        if (bossType === 'hivemind') {
            bossName = "DER HIVEMIND";
            bossSubtitle = "Hobbies: Dimensionen fressen";
            bossColor = 0x8800ff;
        } else if (bossType === 'dreadnought' || bossType === 'destroyer') {
            bossName = "DREADNOUGHT VEX";
            bossSubtitle = "Hobbies: Realit\u00e4ten korrumpieren";
            bossColor = 0xff4400;
        } else if (bossType === 'mothership') {
            bossName = "DAS MUTTERSCHIFF";
            bossSubtitle = "Hobbies: Kleine Schiffe verschlingen";
            bossColor = 0x00ff88;
        }

        // Generate boss portrait as graphics instead of relying on missing sprites
        const bossGfx = this.scene.add.graphics();
        bossGfx.fillStyle(bossColor, 0.3);
        bossGfx.fillCircle(centerX - 200, centerY, 80);
        bossGfx.lineStyle(4, bossColor, 1);
        bossGfx.strokeCircle(centerX - 200, centerY, 80);
        bossGfx.fillStyle(bossColor, 1);
        bossGfx.fillCircle(centerX - 200, centerY, 20);
        bossGfx.setAlpha(0);
        container.add(bossGfx);

        const nameText = this.scene.add.text(centerX + 50, centerY - 20, bossName, {
            fontSize: '42px',
            fontFamily: 'Orbitron',
            fontStyle: 'bold',
            color: '#ff00ff',
            stroke: '#00ffff',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);

        const subText = this.scene.add.text(centerX + 50, centerY + 35, bossSubtitle, {
            fontSize: '20px',
            fontFamily: 'Orbitron',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0);

        container.add([nameText, subText]);

        this.scene.tweens.add({ targets: topBar, y: 75, duration: 300, ease: 'Power2' });
        this.scene.tweens.add({ targets: bottomBar, y: height - 75, duration: 300, ease: 'Power2' });
        this.scene.tweens.add({
            targets: [bossGfx, nameText, subText],
            alpha: 1, duration: 500, delay: 300, ease: 'Power2'
        });

        this.scene.time.delayedCall(3000, () => {
            this.scene.tweens.add({
                targets: container, alpha: 0, duration: 500,
                onComplete: () => {
                    container.destroy();
                    bossGfx.destroy();
                    if (this.scene.physics && this.scene.physics.world) this.scene.physics.world.resume();
                    this.isEventActive = false;
                    if (callback) callback();
                }
            });
        });
    }

    // COMPANION DIALOGUE
    triggerCompanionComment(eventType, specificCharacter = null) {
        if (this.isCompanionActive) return;
        if (!this.scene || !this.scene.scale) return;
        
        const now = this.scene.time ? this.scene.time.now : 0;
        if (now - this.lastCompanionCommentTime < 15000) return;
        
        let character = specificCharacter;
        if (!character) {
            const availableChars = Object.keys(this.companionMessages).filter(char => 
                this.companionMessages[char][eventType] && this.companionMessages[char][eventType].length > 0
            );
            if (availableChars.length === 0) return;
            character = availableChars[Math.floor(Math.random() * availableChars.length)];
        }

        const messages = this.companionMessages[character]?.[eventType];
        if (!messages || messages.length === 0) return;

        this.isCompanionActive = true;
        this.lastCompanionCommentTime = now;
        
        const config = this.companions[character];
        if (!config) return;
        
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        const panelWidth = 420;
        const panelHeight = 110;
        const startX = width + panelWidth / 2;
        const targetX = width - panelWidth / 2 - 20;
        const startY = height / 4; 

        const container = this.scene.add.container(startX, startY).setDepth(900).setScrollFactor(0);

        // Glassmorphism background
        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x050510, 0.9)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(config.color).color);
        
        // Companion portrait: Generated graphics circle
        const portraitBg = this.scene.add.graphics();
        portraitBg.fillStyle(config.tint, 0.2);
        portraitBg.fillCircle(-panelWidth/2 + 45, 0, 32);
        portraitBg.lineStyle(2, config.tint, 0.8);
        portraitBg.strokeCircle(-panelWidth/2 + 45, 0, 32);

        // Use text emoji as portrait (always works, no texture needed)
        const portraitEmoji = this.scene.add.text(-panelWidth/2 + 45, 0, config.emoji, {
            fontSize: '32px'
        }).setOrigin(0.5);

        const randIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randIndex];
        
        const titleText = this.scene.add.text(-panelWidth/2 + 90, -30, config.name, {
            fontSize: '14px',
            fontFamily: 'Orbitron',
            color: config.color,
            fontStyle: 'bold'
        });

        const msgText = this.scene.add.text(-panelWidth/2 + 90, -8, message, {
            fontSize: '13px',
            fontFamily: 'Orbitron',
            color: '#cccccc',
            wordWrap: { width: panelWidth - 110 },
            lineSpacing: 4
        });

        container.add([bg, portraitBg, portraitEmoji, titleText, msgText]);

        // Slide in
        this.scene.tweens.add({
            targets: container, x: targetX, duration: 400, ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(4500, () => {
                    if (!container || !container.active) {
                        this.isCompanionActive = false;
                        return;
                    }
                    this.scene.tweens.add({
                        targets: container, x: startX, duration: 400, ease: 'Back.easeIn',
                        onComplete: () => {
                            if (container && container.active) container.destroy();
                            this.isCompanionActive = false;
                        }
                    });
                });
            }
        });
    }
}

/**
 * @file EventSystem.js
 * @description Handles dynamic narrative events and companion characters (Sparkles, Nyx, Jergeric).
 * Manages boss intro cutscenes and contextual dialogue triggered by gameplay events.
 * @module EventSystem
 */

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
        
        // Configuration for the companions
        this.companions = {
            sparkles: { name: "SPARKLES:", color: '#ff00ff', tint: 0xff00ff, icon: 'companion_sparkles' },
            nyx: { name: "NYX:", color: '#00ffcc', tint: 0x00ffcc, icon: 'companion_nyx' },
            jergeric: { name: "KÄPT'N JERGERIC:", color: '#ff4400', tint: 0xff4400, icon: 'companion_jergeric' }
        };

        this.companionMessages = {
            sparkles: {
                take_damage: [
                    "Oh, ein Asteroid! Komm, wir fliegen direkt rein, das wird lustig!",
                    "Hast du eigentlich Augen im Kopf oder sind das nur bemalte Glasmurmeln?",
                    "Mein schöner Lack! Wenn wir überleben, zahlst DU das!"
                ],
                heal: [
                    "Oh, wir flicken das Schiff zusammen? Wie originell.",
                    "Ein bisschen Sternenstaub drauf und gut ist."
                ],
                level_up: [
                    "Level Up! Deine Überlebenschancen sind von 'unmöglich' auf 'höchst unwahrscheinlich' gestiegen.",
                    "Soll ich jetzt klatschen? Meine Hufe sind müde."
                ],
                unlock_ship: [
                    "Du kaufst dir also NOCH mehr Schrott? Faszinierend.",
                    "Egal in welches Schiff du steigst, du fliegst es eh gegen die Wand."
                ],
                unlock_tech: [
                    "Neue Technologie? Versuch, dich nicht damit in die Luft zu sprengen.",
                    "Toll. Jetzt kannst du auf eine noch spektakulärere Weise versagen."
                ],
                idle: [
                    "Soll ich das Schiff fliegen? Weil du scheinst ja beschäftigt zu sein.",
                    "Gähn. Weck mich, wenn du entscheidest, nicht mehr nutzlos zu sein."
                ]
            },
            nyx: {
                take_damage: [
                    "Rawr xD *nuzzles your broken shields*",
                    "Lade Schadensbericht via ICQ hoch... Fehler 404: Skill nicht gefunden.",
                    "Dein Raumschiff hat weniger HP als mein Tamagotchi von 1999."
                ],
                heal: [
                    "Heilung runtergeladen. Dauerte 3 Stunden mit meinem 56k Modem.",
                    "Du wurdest geheilt! Bitte sende 'Jamba' an die 33333 für mehr HP."
                ],
                level_up: [
                    "Level Up! ROFLMAO",
                    "Das war so l33t von dir!",
                    "Du steigst schneller auf als ein Limewire-Download!"
                ],
                unlock_ship: [
                    "Neues Schiff erkannt! Installiere Kazaa und MySpace-App...",
                    "Woah, das Teil sieht aus wie mein erstes Nokia 3310!"
                ],
                unlock_tech: [
                    "Forschung abgeschlossen. *Modem-Einwähl-Geräusche*",
                    "Upgrade erhalten! Hoffentlich war da kein Trojaner drin."
                ],
                idle: [
                    "AFK? lol",
                    "BRB, muss mein MySpace-Profil anpassen."
                ]
            },
            jergeric: {
                take_damage: [
                    "Kratz nicht den Lack ab! Das ist das einzige funktionierende Schiff, das mir geblieben ist!",
                    "Pass auf den Pizza-Roller auf! Die Void-Kreaturen fressen sonst den ganzen Käse!"
                ],
                level_up: [
                    "Weiter so! Zeig diesen Void-Schergen, wie unglaublich laktoseintolerant wir sind!",
                    "Arr! Dein Fett-Schild wehrt all ihre Antimaterie-Angriffe ab! Genial!"
                ],
                unlock_ship: [
                    "Ein weiser Kauf, Pizza-Boy! Damit fliegen wir direkt ins Auge des Voids!",
                    "Ich hätte nicht gedacht, dass du diesen Schrotthaufen wirklich nimmst!"
                ],
                idle: [
                    "Schieß weiter! Wir müssen das Universum vor der ultimativen Leere retten!"
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
        let bossImageKey = 'enemy_boss';

        if (bossType === 'hivemind') {
            bossName = "DER HIVEMIND";
            bossSubtitle = "Hobbies: Dimensionen fressen";
            bossImageKey = 'boss_hivemind';
        } else if (bossType === 'dreadnought') {
            bossName = "DREADNOUGHT VEX";
            bossSubtitle = "Hobbies: Realitäten korrumpieren";
            bossImageKey = 'boss_dreadnought';
        }

        const nameText = this.scene.add.text(centerX + 100, centerY - 20, bossName, {
            fontSize: '48px',
            fontFamily: 'Courier',
            fontStyle: 'bold',
            color: '#ff00ff',
            stroke: '#00ffff',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);

        const subText = this.scene.add.text(centerX + 100, centerY + 40, bossSubtitle, {
            fontSize: '24px',
            fontFamily: 'Courier',
            color: '#ffffff',
            backgroundColor: '#000000'
        }).setOrigin(0.5).setAlpha(0);

        const bossSprite = this.scene.add.sprite(centerX - 200, centerY, bossImageKey);
        
        if (this.scene.textures && !this.scene.textures.exists(bossImageKey)) {
            bossSprite.setTexture('__WHITE');
            bossSprite.setTint(0xff0000);
            bossSprite.setDisplaySize(200, 200);
        } else {
            bossSprite.setScale(2);
        }
        bossSprite.setAlpha(0);
        
        container.add([bossSprite, nameText, subText]);

        this.scene.tweens.add({ targets: topBar, y: 75, duration: 300, ease: 'Power2' });
        this.scene.tweens.add({ targets: bottomBar, y: height - 75, duration: 300, ease: 'Power2' });
        this.scene.tweens.add({
            targets: [bossSprite, nameText, subText],
            alpha: 1, x: '+=50', duration: 500, delay: 300, ease: 'Power2'
        });

        this.scene.time.delayedCall(3000, () => {
            this.scene.tweens.add({
                targets: container, alpha: 0, duration: 500,
                onComplete: () => {
                    container.destroy();
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
        
        const now = this.scene.time.now;
        if (now - this.lastCompanionCommentTime < 15000) return; // Cooldown
        
        let character = specificCharacter;
        if (!character) {
            // Pick a random character that has this event type
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
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        const panelWidth = 400;
        const panelHeight = 100;
        const startX = width + panelWidth / 2;
        const targetX = width - panelWidth / 2 - 20;
        const startY = height / 4; 

        const container = this.scene.add.container(startX, startY).setDepth(900);

        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.8)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(config.color).color);
        
        const portrait = this.scene.add.sprite(-panelWidth/2 + 50, 0, config.icon);
        if (this.scene.textures && !this.scene.textures.exists(config.icon)) {
            portrait.setTexture('__WHITE');
            portrait.setTint(config.tint);
            portrait.setDisplaySize(64, 64);
        } else {
            portrait.setDisplaySize(80, 80);
        }

        const randIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randIndex];
        
        const titleText = this.scene.add.text(-panelWidth/2 + 100, -30, config.name, {
            fontSize: '16px',
            fontFamily: 'Courier',
            color: config.color,
            fontStyle: 'bold'
        });

        const msgText = this.scene.add.text(-panelWidth/2 + 100, -5, message, {
            fontSize: '14px',
            fontFamily: 'Courier',
            color: '#ffffff',
            wordWrap: { width: panelWidth - 120 }
        });

        container.add([bg, portrait, titleText, msgText]);

        this.scene.tweens.add({
            targets: container, x: targetX, duration: 500, ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(4500, () => {
                    this.scene.tweens.add({
                        targets: container, x: startX, duration: 500, ease: 'Back.easeIn',
                        onComplete: () => {
                            container.destroy();
                            this.isCompanionActive = false;
                        }
                    });
                });
            }
        });
    }
}

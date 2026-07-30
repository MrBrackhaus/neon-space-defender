/**
 * @file EventSystem.js
 * @description Handles dynamic narrative events and the companion character "Wrench". 
 * Manages boss intro cutscenes and contextual voice lines/dialogues triggered by gameplay events.
 * @module EventSystem
 */

export default class EventSystem {
    /**
     * @class EventSystem
     * @description System for rendering dramatic text events and the mechanic's side commentary.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} Reference to the active scene */
        this.scene = scene;
        /** @type {boolean} Prevents overlapping global events */
        this.isEventActive = false;
        /** @type {boolean} Prevents overlapping Wrench dialogues */
        this.isWrenchActive = false;
        /** @type {number} Timestamp of the last Wrench comment to handle cooldowns */
        this.lastWrenchCommentTime = 0;
        
        /** 
         * @type {Object<string, string[]>} 
         * Massive pool of German Wrench messages categorized by trigger event type. 
         */
        this.wrenchMessages = {
            take_damage: [
                "Oh, ein Asteroid! Komm, wir fliegen direkt rein, das wird lustig!",
                "Hast du eigentlich Augen im Kopf oder sind das nur bemalte Glasmurmeln?",
                "Mein schöner Lack! Wenn wir überleben, zahlst DU das!",
                "Kratzer auf Sektor 4... und Sektor 5... und... weißt du was, das ganze Schiff ist Schrott.",
                "Ich hab ja schon viele Idioten am Steuer gesehen, aber du verdienst einen Pokal.",
                "Schilde? Was für Schilde? Oh, die Dinger, die du gerade ruiniert hast.",
                "Das war ABSICHT, oder? Sag mir, dass das Absicht war!",
                "Faszinierend. Dein Überlebensinstinkt tendiert gegen null.",
                "Ein Ausweichmanöver wäre jetzt eine fantastische Idee gewesen. Nur so für die Zukunft.",
                "Wenn du weiter so fliegst, muss ich dich in einer Streichholzschachtel beerdigen."
            ],
            heal: [
                "Oh, wir flicken das Schiff zusammen? Wie originell.",
                "Verschwende nicht mein gutes Werkzeug für deine Inkompetenz!",
                "Ich kleb da jetzt ein Pflaster drauf. Wenn's abfällt, stirbst du.",
                "Reparatur abgeschlossen. Versuch, es nicht in den nächsten fünf Sekunden wieder kaputt zu machen.",
                "Weißt du eigentlich, wie viel diese Ersatzteile kosten? Mehr als dein Leben!",
                "Super. Jetzt ist es wieder heile. Fürs Erste.",
                "Ein bisschen Spucke, etwas Panzertape... Perfekt. Fast wie neu.",
                "Ich hab die Sensoren neu kalibriert. Nicht dass es bei deinen Reflexen helfen würde.",
                "Repariert. Bitte flieg jetzt nicht direkt in den nächsten Laserstrahl, danke.",
                "Manche Leute meiden Schäden, du reparierst sie lieber. Idiot."
            ],
            boss_spawn: [
                "Ach du meine Güte. Hast du das Ding gesehen? Wir sind so was von tot.",
                "Okay, Plan B: Wir tun so, als wären wir Weltraumschrott. Machst du ja eh schon.",
                "Oh großartig. Ein riesiges, wütendes... Etwas. Schieß einfach drauf.",
                "Weißt du was? Ich geh in meine Kabine und weine.",
                "Wenn du das überlebst, geb ich dir einen aus. Spoiler: Werd ich nicht müssen.",
                "Das sieht teuer aus. Und tödlich. Hauptsächlich tödlich.",
                "Ich habe die Überlebenschancen berechnet. Sie sind... amüsant gering.",
                "Das ist dein Problem, nicht meins. Ich bin nur der Mechaniker!",
                "Ist das sein Ernst? Das Ding ist größer als unser Ego!",
                "Bitte sag mir, dass du eine Geheimwaffe hast. Nein? Schade."
            ],
            boss_kill: [
                "Pah. Ich hätte das mit einem rostigen Schraubenschlüssel und verbundenen Augen erledigt.",
                "Nicht schlecht für einen blinden Schimpansen.",
                "Glückwunsch! Du hast das Universum gerettet. Oder zumindest unsere Haut.",
                "War das alles? Ich hab schon Schlimmeres beim Frühstück verdaut.",
                "Ich hoffe, das Ding hatte wertvollen Schrott an Bord!",
                "Unglaublich. Du lebst noch. Meine Wetten sind im Eimer.",
                "Das nächste Mal lass ich dich das alleine machen... oh warte, hast du ja.",
                "Okay, okay, du bist der Held. Kann ich jetzt wieder schlafen?",
                "Riesiges Monster besiegt, Check. Können wir jetzt was Sinnvolles tun?",
                "Ganz nett. Aber beim nächsten Mal mit etwas mehr Stil, bitte."
            ],
            level_up: [
                "Level Up? Was heißt das? Bist du jetzt fünf Prozent weniger nutzlos?",
                "Oh, du hast was gelernt? Wurde auch langsam Zeit.",
                "Herzlichen Glückwunsch. Du bist jetzt ein fortgeschrittener Idiot.",
                "Neue Systeme online. Versuch, sie nicht gleich wieder zu schrotten.",
                "Wow, du entwickelst dich weiter. Wie eine besonders hartnäckige Bakterie.",
                "Besserwisser. Nur weil du jetzt ein Level höher bist...",
                "Soll ich jetzt klatschen? Ich hab Öl an den Händen.",
                "Level Up! Deine Überlebenschancen sind von 'unmöglich' auf 'höchst unwahrscheinlich' gestiegen.",
                "Ein neues Level? Pff, ich war schon auf Level 100, als ich noch in den Windeln lag.",
                "Fantastisch. Kannst du jetzt vielleicht zielen?"
            ],
            scrap_milestone: [
                "Schrott! Herrlicher, funkelnder Schrott! Alles meins!",
                "Hör auf zu sabbern, das ist mein Haufen!",
                "So viel Metall... ich könnte einen zweiten, besseren Piloten bauen!",
                "Endlich mal was Nützliches. Im Gegensatz zu dir.",
                "Bring mir mehr davon, und vielleicht werfe ich dich nicht aus der Luftschleuse.",
                "Das ist fast so schön wie eine gut geölte Turbine. Fast.",
                "Damit kann ich arbeiten. Nicht dass es DICH retten würde, aber hey.",
                "Reichtum! Macht! Ein neuer Toaster! Die Möglichkeiten sind endlos!",
                "Wer hätte gedacht, dass dein sinnloser Zerstörungsdrang profitabel sein kann?",
                "Schrottsammeln. Deine wahre Berufung. Gib das Fliegen auf."
            ],
            combo_milestone: [
                "Eine Kombo? Hast du versehentlich die richtige Taste getroffen?",
                "Triffst du eigentlich absichtlich alles, oder ist das nur Zufall?",
                "Wahnsinn. Du bist wie ein tanzender Elefant in einem Porzellanladen.",
                "Mehr Zerstörung! Lass nichts übrig!",
                "Ich glaube, das Zielsystem ist kaputt. Es zeigt an, dass du triffst.",
                "Das ist ja fast schon Kunst. Brutale, hirnlose Kunst.",
                "Wow, eine Kombo. Ich bin absolut... nicht beeindruckt.",
                "Weitermachen! Bevor du wieder anfängst, in Asteroiden zu parken!",
                "Nicht aufhören! Ich wette 10 Credits, dass du den nächsten Schuss versemmelst.",
                "Es brennt, es explodiert... ein Hauch von Romantik in der kalten Leere."
            ],
            idle: [
                "Hallo? Jemand zu Hause? Oder bist du beim Fliegen eingeschlafen?",
                "Wenn du nichts tust, können wir auch direkt kapitulieren.",
                "Ich hab noch nie jemanden so intensiv NICHTS tun sehen.",
                "Soll ich das Schiff fliegen? Weil du scheinst ja beschäftigt zu sein.",
                "Gääähn. Weck mich, wenn du entscheidest, nicht mehr nutzlos zu sein.",
                "Das Universum wartet nicht auf dich. Und ich erst recht nicht!",
                "Ist der Autopilot an? Ach nee, das bist ja du. Mein Fehler.",
                "Wir bewegen uns nicht. Warum bewegen wir uns nicht? Wofür bezahle ich dich?!",
                "Kaffee? Tee? Oder vielleicht ein Tritt in den Hintern, damit du dich bewegst?",
                "Ich könnte in der Zeit einen Motor komplett auseinandernehmen und wieder zusammensetzen."
            ]
        };
    }

    // ─────────────────── BOSS EVENT ───────────────────

    /**
     * @description Pauses game and shows a cinematic Boss introduction sequence without choices.
     * @param {string} bossType - The identifier for the boss type.
     * @param {function} callback - Callback function executed when the intro completes.
     * @returns {void}
     */
    showBossIntro(bossType, callback) {
        if (this.isEventActive) return;
        this.isEventActive = true;

        // Pause game mechanics
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.pause();
        }
        
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Create overlay container
        const container = this.scene.add.container(0, 0).setDepth(1000);

        // Dark background overlay to obscure gameplay
        const overlay = this.scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
        container.add(overlay);

        // Cinematic bars sliding in from top and bottom
        const topBar = this.scene.add.rectangle(centerX, -100, width, 150, 0x000000).setStrokeStyle(4, 0xff00ff);
        const bottomBar = this.scene.add.rectangle(centerX, height + 100, width, 150, 0x000000).setStrokeStyle(4, 0xff00ff);
        container.add([topBar, bottomBar]);

        // Borderlands style intro texts based on boss
        let bossName = "UNKNOWN ENTITY";
        let bossSubtitle = "Hobbies: Existing";
        let bossImageKey = 'enemy_boss';

        if (bossType === 'hivemind') {
            bossName = "THE HIVEMIND";
            bossSubtitle = "Hobbies: Assimilation, Sudoku";
            bossImageKey = 'boss_hivemind';
        } else if (bossType === 'dreadnought') {
            bossName = "DREADNOUGHT VEX";
            bossSubtitle = "Hobbies: Compensating for something";
            bossImageKey = 'boss_dreadnought';
        }

        // Add text elements
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

        // Add Boss Sprite (fallback to simple shape if texture is not loaded)
        const bossSprite = this.scene.add.sprite(centerX - 200, centerY, bossImageKey);
        
        if (this.scene.textures && !this.scene.textures.exists(bossImageKey)) {
            // Draw a generic shape instead if the texture doesn't exist
            bossSprite.setTexture('__WHITE');
            bossSprite.setTint(0xff0000);
            bossSprite.setDisplaySize(200, 200);
        } else {
            bossSprite.setScale(2);
        }
        bossSprite.setAlpha(0);
        
        container.add([bossSprite, nameText, subText]);

        // Animations: Slide in the cinematic bars
        this.scene.tweens.add({
            targets: topBar,
            y: 75,
            duration: 300,
            ease: 'Power2'
        });

        this.scene.tweens.add({
            targets: bottomBar,
            y: height - 75,
            duration: 300,
            ease: 'Power2'
        });

        // Animations: Fade in and slide the boss information
        this.scene.tweens.add({
            targets: [bossSprite, nameText, subText],
            alpha: 1,
            x: '+=50', // slight slide effect to the right
            duration: 500,
            delay: 300,
            ease: 'Power2'
        });

        // Cleanup and resume after a delay
        this.scene.time.delayedCall(3000, () => {
            this.scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    container.destroy();
                    if (this.scene.physics && this.scene.physics.world) {
                        this.scene.physics.world.resume();
                    }
                    this.isEventActive = false;
                    if (callback) callback();
                }
            });
        });
    }

    // ─────────────────── WRENCH DIALOGUE ───────────────────

    /**
     * @description Triggers a humorous pop-up dialogue from "Wrench" based on an event type.
     * @param {string} eventType - The key corresponding to the dialogue pool (e.g., 'take_damage', 'heal').
     * @returns {void}
     */
    triggerWrenchComment(eventType) {
        if (this.isWrenchActive) return;
        
        const now = this.scene.time.now;
        // Enforce a 25s cooldown between any wrench comments to prevent spam
        if (now - this.lastWrenchCommentTime < 25000) return; 
        
        const messages = this.wrenchMessages[eventType];
        if (!messages || messages.length === 0) return;

        this.isWrenchActive = true;
        this.lastWrenchCommentTime = now;
        
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        // UI Panel container configuration
        const panelWidth = 400;
        const panelHeight = 100;
        
        // Start offscreen to the right
        const startX = width + panelWidth / 2;
        const targetX = width - panelWidth / 2 - 20;
        const startY = height / 4; // Positioned in the upper right quadrant

        const container = this.scene.add.container(startX, startY).setDepth(900);

        // Panel background
        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.8)
            .setStrokeStyle(2, 0xff8800);
        
        // Wrench portrait setup
        const portrait = this.scene.add.sprite(-panelWidth/2 + 50, 0, 'scrap_merchant');
        if (this.scene.textures && !this.scene.textures.exists('scrap_merchant')) {
            portrait.setTexture('__WHITE');
            portrait.setTint(0xff8800);
            portrait.setDisplaySize(64, 64);
        } else {
            portrait.setDisplaySize(80, 80);
        }

        // Select random message from the corresponding category pool
        const randIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randIndex];
        
        // Title Text
        const titleText = this.scene.add.text(-panelWidth/2 + 100, -30, "WRENCH:", {
            fontSize: '16px',
            fontFamily: 'Courier',
            color: '#ff8800',
            fontStyle: 'bold'
        });

        // Body Text
        const msgText = this.scene.add.text(-panelWidth/2 + 100, -5, message, {
            fontSize: '14px',
            fontFamily: 'Courier',
            color: '#ffffff',
            wordWrap: { width: panelWidth - 120 }
        });

        container.add([bg, portrait, titleText, msgText]);

        // Slide in animation
        this.scene.tweens.add({
            targets: container,
            x: targetX,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stay for 4.5 seconds, then slide out
                this.scene.time.delayedCall(4500, () => {
                    this.scene.tweens.add({
                        targets: container,
                        x: startX,
                        duration: 500,
                        ease: 'Back.easeIn',
                        onComplete: () => {
                            container.destroy();
                            this.isWrenchActive = false; // Free system for next comment
                        }
                    });
                });
            }
        });
    }
}

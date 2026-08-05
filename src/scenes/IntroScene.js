/**
 * @file IntroScene.js
 * @description The cinematic intro scene for the Neon Space Defender game. Handles a slideshow 
 * of images with typewriter dialogue, Ken Burns camera effects, and scene transitions.
 * @module IntroScene
 */

import Phaser from 'phaser';

/**
 * @constant {Array<Object>} SLIDES
 * @description Configuration array for each slide in the intro sequence.
 * Defines image source, visual effects, captions, and narrative dialogue (in German).
 * Each slide: bg image key, optional tint, crop region (0-1 normalized), dialogue text.
 * 'crop' = [normX, normY, normW, normH] — which part of image to show (Ken Burns)
 */
const SLIDES = [
    {
        img: 'bg', tint: 0x330066, caption: null, dialogue: null, duration: 3000, effect: 'zoom_in',
        titleCard: { line1: 'NEON SPACE DEFENDER', line2: 'EPISODE 1: RISS IN DER LEERE' }
    },
    {
        img: 'intro_hero', tint: null, effect: 'pan_right',
        caption: 'Käpt\'n Jergerics Thronsaal (Letzte Woche)',
        dialogue: '"Ahoi! Ich bin Käpt\'n Jergeric. Das fürchterlichste, niedlichste kosmische Grauen der Sieben Dimensionen. Meine Galaktische Armada war unbesiegbar!"'
    },
    {
        img: 'intro_fleet', tint: null, effect: 'zoom_in',
        caption: 'Der Void-Spalt - Gestern',
        dialogue: '"Bis sich aus dem Nichts ein gigantischer Riss in der Realität öffnete. Ein Void-Spalt, der meine gesamte Flotte in Sekundenbruchteilen einfach verschluckte!"'
    },
    {
        img: 'intro_fleet', tint: 0xff4444, effect: 'pan_left', caption: null,
        dialogue: '"Nun strömen die Schergen des Voids in unser Universum. Albtraumhafte Schattenwesen und korrumpierte Maschinen, die alles vernichten wollen!"'
    },
    {
        img: 'intro_hero', tint: null, effect: 'static', caption: null,
        dialogue: '"Du bist unsere einzige Hoffnung! Nicht wegen einer Prophezeiung, sondern weil du laktoseintolerant bist! Das macht deinen Geist immun gegen die Telepathie des Voids!"'
    },
    {
        img: 'intro_ship', tint: null, effect: 'zoom_out', caption: null,
        dialogue: '"Und dein alter Pizza-Roller ist derart mit Schmutz und altem Käse verkrustet, dass ihre Antimaterie-Strahlen an diesem gigantischen Fett-Schild abprallen!"'
    },
    {
        img: 'intro_sparkles', tint: null, effect: 'zoom_in', caption: null,
        dialogue: '"Sparkles das Einhorn plündert die Trümmer meiner zerstörten Flotte und klebt sie mit Panzertape an leuchtenden Weltraum-Müll..."'
    },
    {
        img: 'intro_junk', tint: null, effect: 'pan_right', caption: null,
        dialogue: '"Daraus baut es absurde, aber tödliche neue Schiffe für dich! Fliegende Flamingos, Arcade-Automaten... alles, was das Void hassen wird!"'
    },
    {
        img: 'intro_nyx', kraken: true, tint: 0x00ffcc, effect: 'zoom_in', caption: null,
        dialogue: '"Und kraule Nyx, unsere vierdimensionale Kybernetik-Katze, niemals hinter den Ohren. Sonst implodiert das Raum-Zeit-Kontinuum. Los jetzt, halte das Void auf!"'
    }
];

/**
 * @class IntroScene
 * @extends Phaser.Scene
 * @description Manages the narrative introduction of the game. Plays sequential slides with text
 * and transitions before dropping the player into the main menu.
 */
export default class IntroScene extends Phaser.Scene {
    /**
     * @constructor
     * @description Initializes the IntroScene with its scene key.
     */
    constructor() { 
        super('IntroScene'); 
    }

    /**
     * @method create
     * @description Sets up the visual elements for the cinematic (scanlines, letterbox, text fields)
     * and binds user input to advance or skip the intro.
     * @returns {void}
     */
    create() {
        const cw = this.scale.width, ch = this.scale.height;
        this.cw = cw; 
        this.ch = ch;
        this.slideIndex = 0;
        this.typing = false;

        // ─────────────────── VISUAL OVERLAYS ───────────────────

        // Scanline overlay (subtle, retro CRT feeling)
        const scanlines = this.add.graphics();
        scanlines.setDepth(100);
        for (let y = 0; y < ch; y += 4) {
            scanlines.lineStyle(1, 0x000000, 0.12);
            scanlines.lineBetween(0, y, cw, y);
        }

        // Main image display for slide backgrounds
        this.bgImg = this.add.image(cw / 2, ch / 2, 'bg').setDisplaySize(cw, ch);

        // Vignette effect to draw focus to the center
        const vig = this.add.graphics().setDepth(90);
        const vigGrad = this.textures.createCanvas('vig_tex', cw, ch);
        const ctx = vigGrad.getContext();
        const grad = ctx.createRadialGradient(cw/2, ch/2, ch * 0.3, cw/2, ch/2, ch * 0.8);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
        vigGrad.refresh();
        this.add.image(cw/2, ch/2, 'vig_tex').setDepth(90);

        // Black bars for cinematic letterbox look
        const barH = ch * 0.09;
        this.add.rectangle(cw/2, barH/2, cw, barH, 0x000000).setDepth(95);
        this.add.rectangle(cw/2, ch - barH/2, cw, barH, 0x000000).setDepth(95);

        // ─────────────────── TEXT UI ELEMENTS ───────────────────

        // Caption text (bottom left, inside lower bar)
        this.captionText = this.add.text(40, ch - barH/2, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '11px',
            color: '#aaaaaa', letterSpacing: 2
        }).setOrigin(0, 0.5).setDepth(99).setAlpha(0);

        // Title card (displayed only on the first slide)
        this.titleLine1 = this.add.text(cw/2, ch/2 - 40, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '60px', fontStyle: 'bold',
            color: '#ffffff', letterSpacing: 8,
            stroke: '#ff00ff', strokeThickness: 2,
            shadow: { x: 0, y: 0, color: '#ff00ff', blur: 30, fill: true }
        }).setOrigin(0.5).setDepth(98).setAlpha(0);

        this.titleLine2 = this.add.text(cw/2, ch/2 + 30, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '20px',
            color: '#00ffff', letterSpacing: 12,
            shadow: { x: 0, y: 0, color: '#00ffff', blur: 15, fill: true }
        }).setOrigin(0.5).setDepth(98).setAlpha(0);

        // Dialogue box (main text in the bottom bar area)
        this.dialogueBg = this.add.graphics().setDepth(97);
        this.dialogueText = this.add.text(cw/2, ch - barH/2, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '15px',
            color: '#ffffff', wordWrap: { width: cw * 0.75 }, align: 'center',
            lineSpacing: 6, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 0.5).setDepth(99).setAlpha(0);

        // Blinking hint indicating the user can advance the slide
        this.hint = this.add.text(cw - 30, ch - barH / 2, '▶', {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ff00ff'
        }).setOrigin(1, 0.5).setDepth(99).setAlpha(0);
        this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

        // Skip button
        this.add.text(cw - 24, 14, '[ ÜBERSPRINGEN ]', {
            fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#555'
        }).setOrigin(1, 0).setDepth(99).setInteractive({ useHandCursor: true })
          .on('pointerover', function() { this.setColor('#bbb'); })
          .on('pointerout',  function() { this.setColor('#555'); })
          .on('pointerdown', () => this.goToMenu());

        // ─────────────────── INPUT HANDLING ───────────────────
        
        // Input bindings to advance the slides
        this.input.on('pointerdown', () => this.advance());
        this.input.keyboard.on('keydown-SPACE', () => this.advance());
        this.input.keyboard.on('keydown-ENTER', () => this.advance());
        this.input.keyboard.on('keydown-ESC',   () => this.goToMenu());

        // Initial fade-in and trigger first slide
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.showSlide(0);
    }

    /**
     * @method showSlide
     * @description Handles the transition to and rendering of a specific slide index.
     * Sets background image, applies visual effects (Ken Burns), and starts typewriter effect.
     * @param {number} index - The index of the slide to display from the SLIDES array.
     * @returns {void}
     */
    showSlide(index) {
        if (index >= SLIDES.length) { 
            this.goToMenu(); 
            return; 
        }
        
        const slide = SLIDES[index];
        const cw = this.cw, ch = this.ch;

        // ── Fade out old content first ──
        this.tweens.add({
            targets: [this.dialogueText, this.captionText, this.hint, this.titleLine1, this.titleLine2],
            alpha: 0, duration: 300,
            onComplete: () => {
                // ── Set new background image ──
                const tex = this.textures.exists(slide.img) ? slide.img : 'bg';
                this.bgImg.setTexture(tex);
                this.bgImg.setDisplaySize(cw, ch);
                this.bgImg.setTint(slide.tint || 0xffffff);
                this.bgImg.setPosition(cw/2, ch/2);
                this.bgImg.setScale(1.1); // Slightly larger to allow for panning/zooming

                // ── Ken Burns visual effects ──
                this.tweens.killTweensOf(this.bgImg);
                switch (slide.effect) {
                    case 'zoom_in':
                        this.tweens.add({ targets: this.bgImg, scale: 1.2, duration: 8000, ease: 'Linear' });
                        break;
                    case 'zoom_out':
                        this.bgImg.setScale(1.2);
                        this.tweens.add({ targets: this.bgImg, scale: 1.05, duration: 8000, ease: 'Linear' });
                        break;
                    case 'pan_right':
                        this.bgImg.setX(cw / 2 - 40);
                        this.tweens.add({ targets: this.bgImg, x: cw / 2 + 40, duration: 8000, ease: 'Linear' });
                        break;
                    case 'pan_left':
                        this.bgImg.setX(cw / 2 + 40);
                        this.tweens.add({ targets: this.bgImg, x: cw / 2 - 40, duration: 8000, ease: 'Linear' });
                        break;
                }

                // ── Fade in image ──
                this.bgImg.setAlpha(0);
                this.tweens.add({ targets: this.bgImg, alpha: 0.85, duration: 800 });

                // ── Caption text ──
                this.captionText.setText(slide.caption || '');
                if (slide.caption) {
                    this.tweens.add({ targets: this.captionText, alpha: 0.7, duration: 600, delay: 800 });
                }

                // ── Title card handling (slide 0 only) ──
                if (slide.titleCard) {
                    this.titleLine1.setText(slide.titleCard.line1);
                    this.titleLine2.setText(slide.titleCard.line2);
                    this.tweens.add({ targets: this.titleLine1, alpha: 1, duration: 1200, delay: 400 });
                    this.tweens.add({ targets: this.titleLine2, alpha: 0.9, duration: 1200, delay: 800,
                        onComplete: () => {
                            // Auto advance title card after duration
                            this.time.delayedCall(slide.duration || 3000, () => {
                                if (this.slideIndex === index) this.advance();
                            });
                        }
                    });
                    return;
                }

                // ── Dialogue typewriter effect ──
                if (slide.dialogue) {
                    this.dialogueText.setText('');
                    this.dialogueText.setAlpha(1);
                    this.typing = true;
                    this.hint.setAlpha(0);

                    let i = 0;
                    const full = slide.dialogue;
                    if (this.typeTimer) this.typeTimer.remove();

                    // Print one character at a time
                    this.typeTimer = this.time.addEvent({
                        delay: 32, repeat: full.length - 1,
                        callback: () => {
                            i++;
                            this.dialogueText.setText(full.substring(0, i));
                            if (i >= full.length) {
                                this.typing = false;
                                this.tweens.add({ targets: this.hint, alpha: 0.8, duration: 400 });
                            }
                        }
                    });
                }
            }
        });
    }

    /**
     * @method advance
     * @description Advances to the next slide or skips the typewriter effect if currently typing.
     * @returns {void}
     */
    advance() {
        const slide = SLIDES[this.slideIndex];

        // If currently typing out text, skip to the end of the text
        if (this.typing && slide.dialogue) {
            if (this.typeTimer) { 
                this.typeTimer.remove(); 
                this.typeTimer = null; 
            }
            this.dialogueText.setText(slide.dialogue);
            this.typing = false;
            this.tweens.add({ targets: this.hint, alpha: 0.8, duration: 200 });
            return;
        }

        // Otherwise move to the next slide
        this.slideIndex++;
        this.showSlide(this.slideIndex);
    }

    /**
     * @method goToMenu
     * @description Exits the intro sequence, saves the state to localStorage, 
     * and transitions to the main MenuScene.
     * @returns {void}
     */
    goToMenu() {
        // Remember that player saw the intro to skip it next time
        localStorage.setItem('neon_intro_seen', '1');
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    }
}

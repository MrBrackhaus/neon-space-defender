import Phaser from 'phaser';

// Each slide: bg image key, optional tint, crop region (0-1 normalized), dialogue text
// 'crop' = [normX, normY, normW, normH] — which part of image to show (Ken Burns)
const SLIDES = [
    {
        img: 'bg', tint: 0x330066, caption: null, dialogue: null, duration: 3000, effect: 'zoom_in',
        titleCard: { line1: 'NEON SPACE DEFENDER', line2: 'EPISODE 1: PIZZA, PANIK & PIRATENKÖNIGE' }
    },
    {
        img: 'intro_hero', tint: null, effect: 'pan_right',
        caption: 'Zentrale der Föderation — Die Kaffeemaschine ist kaputt',
        dialogue: '"Hör gut zu, Space Pirat König Jergeric. Wir wissen, wer du bist. Dein Pizza-Lieferanten-Undercover-Job war miserabel. Aber wir brauchen dich!"'
    },
    {
        img: 'intro_fleet', tint: null, effect: 'zoom_in',
        caption: 'Sektor 7-G — Vor exakt 14 Minuten',
        dialogue: '"Unsere Flotte wurde von bösartigen KI-Toastern und wütender Neon-Geometrie zerlegt. Jemand hat beim Update auf \'Ignorieren\' statt auf \'Patchen\' geklickt. Passiert den Besten."'
    },
    {
        img: 'intro_fleet', tint: 0xff4444, effect: 'pan_left', caption: null,
        dialogue: '"Warum sie uns angreifen? Tja, vermutlich hat sich ihr Algorithmus an unserem miesen intergalaktischen Musikgeschmack verschluckt. Ist aber auch egal, die Dinger müssen weg."'
    },
    {
        img: 'intro_hero', tint: null, effect: 'static', caption: null,
        dialogue: '"Dein heldenhafter Auftrag: Rette das Universum. Deine Piraten-Ehre verlangt es! Und wenn du versagst, sind wir eh alle tot, also kein Druck. Echt nicht."'
    },
    {
        img: 'intro_ship', tint: null, effect: 'zoom_out', caption: null,
        dialogue: '"Dein glorreiches Piratenschiff wurde gepfändet. Deshalb kriegst du diesen alten Pizza-Lieferflitzer, an den wir wahllos Laserkanonen geklebt haben. Die Gurte klemmen ein bisschen."'
    },
    {
        img: 'intro_ship', tint: null, effect: 'pan_right', caption: null,
        dialogue: '"Tipp: Schieß auf alles, was sich bewegt. Sammle \'Scrap\' ein. Damit kannst du Upgrades beim mürrischen Schrott-Goblin Wrench kaufen."'
    },
    {
        img: 'intro_hero', tint: 0x00ffcc, effect: 'zoom_in', caption: null,
        dialogue: '"Frag besser nicht, wieso eine kybernetische Straßenkatze namens Nyx im Vakuum des Weltalls atmen und mit Perks handeln kann. Der freie Markt regelt das irgendwie."'
    },
    {
        img: 'intro_ship', tint: null, effect: 'zoom_in', caption: null,
        dialogue: '"Mach die Augen zu, drück ab und zeig ihnen, warum du der Piratenkönig bist! Viel Glück, Eure Majestät. Wir zählen auf dich!"'
    }
];

export default class IntroScene extends Phaser.Scene {
    constructor() { super('IntroScene'); }

    create() {
        const cw = this.scale.width, ch = this.scale.height;
        this.cw = cw; this.ch = ch;
        this.slideIndex = 0;
        this.typing = false;

        // Scanline overlay (subtle)
        const scanlines = this.add.graphics();
        scanlines.setDepth(100);
        for (let y = 0; y < ch; y += 4) {
            scanlines.lineStyle(1, 0x000000, 0.12);
            scanlines.lineBetween(0, y, cw, y);
        }

        // Main image display
        this.bgImg = this.add.image(cw / 2, ch / 2, 'bg').setDisplaySize(cw, ch);

        // Vignette
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

        // Black bars (cinematic letterbox)
        const barH = ch * 0.09;
        this.add.rectangle(cw/2, barH/2, cw, barH, 0x000000).setDepth(95);
        this.add.rectangle(cw/2, ch - barH/2, cw, barH, 0x000000).setDepth(95);

        // Caption text (bottom left, inside lower bar)
        this.captionText = this.add.text(40, ch - barH/2, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '11px',
            color: '#aaaaaa', letterSpacing: 2
        }).setOrigin(0, 0.5).setDepth(99).setAlpha(0);

        // Title card (for first slide)
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

        // Dialogue box (bottom bar area)
        this.dialogueBg = this.add.graphics().setDepth(97);
        this.dialogueText = this.add.text(cw/2, ch - barH/2, '', {
            fontFamily: 'Orbitron, monospace', fontSize: '15px',
            color: '#ffffff', wordWrap: { width: cw * 0.75 }, align: 'center',
            lineSpacing: 6, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 0.5).setDepth(99).setAlpha(0);

        // Hint
        this.hint = this.add.text(cw - 30, ch - barH / 2, '▶', {
            fontFamily: 'Orbitron', fontSize: '16px', color: '#ff00ff'
        }).setOrigin(1, 0.5).setDepth(99).setAlpha(0);
        this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

        // Skip
        this.add.text(cw - 24, 14, '[ ÜBERSPRINGEN ]', {
            fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#555'
        }).setOrigin(1, 0).setDepth(99).setInteractive({ useHandCursor: true })
          .on('pointerover', function() { this.setColor('#bbb'); })
          .on('pointerout',  function() { this.setColor('#555'); })
          .on('pointerdown', () => this.goToMenu());

        // Input
        this.input.on('pointerdown', () => this.advance());
        this.input.keyboard.on('keydown-SPACE', () => this.advance());
        this.input.keyboard.on('keydown-ENTER', () => this.advance());
        this.input.keyboard.on('keydown-ESC',   () => this.goToMenu());


        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.showSlide(0);
    }

    showSlide(index) {
        if (index >= SLIDES.length) { this.goToMenu(); return; }
        const slide = SLIDES[index];
        const cw = this.cw, ch = this.ch;
        const barH = ch * 0.09;

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
                this.bgImg.setScale(1.1);

                // ── Ken Burns effect ──
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

                // ── Caption ──
                this.captionText.setText(slide.caption || '');
                if (slide.caption) {
                    this.tweens.add({ targets: this.captionText, alpha: 0.7, duration: 600, delay: 800 });
                }

                // ── Title card (slide 0 only) ──
                if (slide.titleCard) {
                    this.titleLine1.setText(slide.titleCard.line1);
                    this.titleLine2.setText(slide.titleCard.line2);
                    this.tweens.add({ targets: this.titleLine1, alpha: 1, duration: 1200, delay: 400 });
                    this.tweens.add({ targets: this.titleLine2, alpha: 0.9, duration: 1200, delay: 800,
                        onComplete: () => {
                            // Auto advance title card
                            this.time.delayedCall(slide.duration || 3000, () => {
                                if (this.slideIndex === index) this.advance();
                            });
                        }
                    });
                    return;
                }

                // ── Dialogue typewriter ──
                if (slide.dialogue) {
                    this.dialogueText.setText('');
                    this.dialogueText.setAlpha(1);
                    this.typing = true;
                    this.hint.setAlpha(0);

                    let i = 0;
                    const full = slide.dialogue;
                    if (this.typeTimer) this.typeTimer.remove();

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

    advance() {
        const slide = SLIDES[this.slideIndex];

        if (this.typing && slide.dialogue) {
            // Skip to end of line
            if (this.typeTimer) { this.typeTimer.remove(); this.typeTimer = null; }
            this.dialogueText.setText(slide.dialogue);
            this.typing = false;
            this.tweens.add({ targets: this.hint, alpha: 0.8, duration: 200 });
            return;
        }

        this.slideIndex++;
        this.showSlide(this.slideIndex);
    }

    goToMenu() {
        localStorage.setItem('neon_intro_seen', '1');
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    }
}

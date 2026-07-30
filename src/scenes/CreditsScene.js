import Phaser from 'phaser';

export default class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreditsScene' });
    }

    create() {
        const { width: cw, height: ch } = this.scale;

        // Background
        this.add.image(cw/2, ch/2, 'bg')
            .setDisplaySize(cw * 1.05, ch * 1.05)
            .setAlpha(0.3)
            .setTint(0xff00ff);

        // Container for scrolling credits
        const creditsContainer = this.add.container(cw / 2, ch + 50);

        const titleStyle = { fontFamily: 'Orbitron', fontSize: '22px', color: '#00ffff', fontStyle: 'bold', align: 'center', shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 10, fill: true } };
        const nameStyle = { fontFamily: 'Share Tech Mono', fontSize: '32px', color: '#ffffff', align: 'center', shadow: { offsetX: 0, offsetY: 0, color: '#ffffff', blur: 10, fill: true } };

        const roles = [
            { title: "LEAD DEVELOPER & VISIONARY", name: "Michael Kurz" },
            { title: "SUPREME COMMANDER OF THE VOID", name: "König Jergeric" },
            { title: "AI CO-PILOT & CHIEF NEON OFFICER", name: "Antigravity" },
            { title: "HEAD OF MASCOT RESOURCES", name: "Cyberpunk Cat" },
            { title: "LEAD SCRAP DEALER", name: "The Void Anomaly" },
            { title: "WEAPONS CALIBRATION EXPERT", name: "Overheated Railgun" },
            { title: "SOUND & VIBES", name: "A Synthesizer from 1985" },
            { title: "BUGS & GLITCHES", name: "Turned into 'Features'" },
            { title: "CHIEF EXPLOSION ARCHITECT", name: "Particle Emitter 3000" },
            { title: "DIRECTOR OF PIXEL ART", name: "A Random Number Generator" },
            { title: "LEAD NEON TUBING BENDER", name: "Cyber-Bender" },
            { title: "SENIOR SPAGHETTI CODE CHEF", name: "The Codebase" },
            { title: "HEAD OF HITBOXES", name: "Invisible Walls" },
            { title: "RESPONSIBLE FOR DEATH SCREENS", name: "König Jergeric's Wrath" },
            { title: "LASER BEAM CALIBRATOR", name: "Pew Pew Industries" },
            { title: "CHIEF PROCRASTINATION OFFICER", name: "YouTube Autoplay" },
            { title: "LORE MASTER", name: "Unpaid Interns" },
            { title: "JUNIOR COFFEE FETCHING BOT", name: "Unit #404" },
            { title: "SENIOR SCRAP HOARDER", name: "Space Raccoon" },
            { title: "INTERGALACTIC TAX COLLECTOR", name: "The Boss Fight" },
            { title: "CHIEF GRAVITY DEFIER", name: "Isaac Newton (In Shambles)" },
            { title: "LEAD ASTEROID SCULPTOR", name: "Bob Ross (In Space)" },
            { title: "HEAD OF SHIELD PENETRATION", name: "Railgun Mk. II" },
            { title: "DIRECTOR OF SCREEN SHAKE", name: "Richter Scale 9.0" },
            { title: "CHIEF VIBE CHECKER", name: "The Soundtrack" },
            { title: "SENIOR BUTTON MASHER", name: "The QA Team" },
            { title: "HEAD OF RNG MANIPULATION", name: "RNGesus" },
            { title: "LEAD OVERHEATING SPECIALIST", name: "My GPU" },
            { title: "DIRECTOR OF UNFAIR ENEMY SPAWNS", name: "The Director" },
            { title: "CHIEF NOSTALGIA OFFICER", name: "1980s Arcade Cabinets" },
            { title: "SENIOR TYPO CORRECTOR", name: "Autocorrect (Failed)" },
            { title: "HEAD OF FRAME DROPS", name: "Garbage Collection" },
            { title: "LEAD PLASMA LEAK TECHNICIAN", name: "Duct Tape" },
            { title: "DIRECTOR OF INVENTORY CLUTTER", name: "Common Drops" },
            { title: "CHIEF DODGE ROLL INSTRUCTOR", name: "Dark Souls Veterans" },
            { title: "SENIOR NEON FLICKER MECHANIC", name: "Loose Wires" },
            { title: "HEAD OF MEANINGLESS UPGRADES", name: "+1% Damage" },
            { title: "LEAD 'JUST ONE MORE RUN' ENABLER", name: "Dopamine" },
            { title: "DIRECTOR OF ABANDONED IDEAS", name: "The /old/ Folder" },
            { title: "CHIEF TIME TRAVELER", name: "The 'Undo' Button" },
            { title: "SENIOR SYNTHWAVE ENTHUSIAST", name: "A Guy with Neon Glasses" },
            { title: "HEAD OF UNINTENDED BEHAVIOR", name: "Feature, not a Bug" },
            { title: "LEAD ANOMALY RESEARCHER", name: "Dr. Strangelove" },
            { title: "DIRECTOR OF DRAMATIC PAUSES", name: "Loading Screens" },
            { title: "CHIEF RAGE QUIT MANAGER", name: "Alt + F4" },
            { title: "SENIOR GALAXY BRAIN STRATEGIST", name: "Player 1" },
            { title: "HEAD OF IMPOSSIBLE ODDS", name: "Wave 100" },
            { title: "LEAD 'IT WORKED ON MY MACHINE' DEV", name: "Localhost" },
            { title: "DIRECTOR OF EXCESSIVE PARTICLES", name: "The GPU Fan" },
            { title: "CHIEF 'THIS IS FINE' OFFICER", name: "Ship on Fire" },
            { title: "SENIOR 'WHY IS THIS CRASHING' ANALYST", name: "Stack Overflow" },
            { title: "HEAD OF 'WE WILL FIX IT POST-LAUNCH'", name: "Day 1 Patch" },
            { title: "SPECIAL THANKS TO", name: "Coffee & Late Night Snacks" },
            { title: "NO CATS WERE HARMED", name: "DURING PRODUCTION" },
            { title: "AND YOU", name: "For not skipping the credits" }
        ];

        let currentY = 0;
        
        // Add huge header
        const mainTitle = this.add.text(0, currentY, 'NEON SPACE DEFENDER', {
            fontFamily: 'Orbitron', fontSize: '54px', color: '#ff00ff', fontStyle: 'bold', shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 20, fill: true }
        }).setOrigin(0.5);
        creditsContainer.add(mainTitle);
        currentY += 150;

        roles.forEach(role => {
            const tText = this.add.text(0, currentY, role.title, titleStyle).setOrigin(0.5);
            const nText = this.add.text(0, currentY + 35, role.name, nameStyle).setOrigin(0.5);
            creditsContainer.add([tText, nText]);
            currentY += 120;
        });

        // Thanks for playing
        const thanks = this.add.text(0, currentY + 100, 'THANK YOU FOR PLAYING!', {
            fontFamily: 'Orbitron', fontSize: '40px', color: '#ffaa00', fontStyle: 'bold', shadow: { offsetX: 0, offsetY: 0, color: '#ffaa00', blur: 20, fill: true }
        }).setOrigin(0.5);
        creditsContainer.add(thanks);

        // Scroll Animation (Duration dynamically scales with length)
        this.tweens.add({
            targets: creditsContainer,
            y: -currentY - 200,
            duration: currentY * 20,
            ease: 'Linear',
            onComplete: () => {
                this._goBack();
            }
        });

        const btnStyle = {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#fff', blur: 10, fill: true }
        };

        const backBtn = this.add.text(40, 40, '◀ SKIP CREDITS', btnStyle)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backBtn.setTint(0xff00ff))
            .on('pointerout', () => backBtn.clearTint())
            .on('pointerdown', () => this._goBack());

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    _goBack() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}

# Implementation Plan: Rebalancing, Audio System, Settings & Anime Intro

## 🎯 Goal
1. **Weapon Rebalance:** Adjust `scatter`, `pulse`, and `railgun` to be balanced but play differently. Restrict `scatter` range.
2. **Audio System Overhaul:** Split Music and SFX volumes. Fix the bug where music keeps playing. Introduce support for external (GEMA-free) audio files instead of the procedural 8-bit sounds.
3. **Settings:** Add separate sliders for Music and SFX, and a toggle for Screen Shake.
4. **Intro & Assets:** Rewrite the intro in a humorous "Deponia" style and generate new high-quality images in a modern anime/Arcane art style. Generate additional sprites.

## ⚠️ User Review Required
*   **Audio Assets:** Da ich als KI keine großen Musikbibliotheken durchsuchen kann, werde ich das System so umbauen, dass es MP3/OGG Dateien lädt. Ich werde ein paar freie (CC0/GEMA-freie) Platzhalter-Sounds aus dem Internet über ein Skript herunterladen, damit es sofort funktioniert. Du kannst diese später einfach im Ordner `public/assets/audio/` durch deine eigenen Tracks austauschen. Ist das in Ordnung?
*   **Art Style:** Ich werde den "Arcane / Modern Anime" Stil für die neuen Intro-Bilder verwenden.

## 🛠️ Proposed Changes

### 1. Weapon Rebalance (`src/scenes/GameScene.js`)
*   **Modify `init()`:** Adjust base stats for `pulse`, `scatter`, and `railgun`.
    *   `pulse`: Balanced damage and fire rate.
    *   `scatter`: High damage upfront, 3 shots, but bullets get a `lifespan` (e.g., 300ms) to limit range.
    *   `railgun`: High damage, piercing, but very slow fire rate.
*   **Modify `update()`:** Check `bullet.lifespan` and destroy bullets if their time is up (creating the shotgun range effect).

### 2. Audio & Settings (`src/systems/AudioSystem.js` & `src/scenes/SettingsScene.js`)
*   **AudioSystem.js [MODIFY]:** Rewrite to use Phaser's native `scene.sound.play()`. Manage `musicVolume` and `sfxVolume` separately. Handle playing, pausing, and stopping background music correctly.
*   **SettingsScene.js [MODIFY]:** 
    *   Add "MUSIC VOLUME" control.
    *   Add "SFX VOLUME" control.
    *   Add "SCREEN SHAKE: ON/OFF" toggle.
*   **GameScene.js [MODIFY]:** Wrap all `this.cameras.main.shake()` calls in a check for the screen shake setting.

### 3. Intro Overhaul (`src/scenes/IntroScene.js`)
*   **IntroScene.js [MODIFY]:** Rewrite the dialogues to be more sarcastic and humorous (Deponia style).
*   **Image Generation:** Use `generate_image` to create new intro panels:
    *   `intro_hero_anime`: Jergeric in Arcane-style.
    *   `intro_fleet_anime`: Destroyed fleet in Arcane-style.
    *   `intro_ship_anime`: The "pizza delivery drone" ship.

### 4. Audio Downloader Script
*   I will write and execute a small Node/Python script to download 3-4 CC0 sound effects (laser, explosion) and 1 background music track from a safe open-source repository (like OpenGameArt or a similar CC0 source) into your `assets/` folder.

## 🧪 Verification Plan
*   Start the game and check the Settings menu for Music, SFX, and Shake toggles.
*   Turn music volume to 0 and verify the music actually stops.
*   Turn screen shake off and verify explosions/damage don't shake the screen.
*   Play with the `scatter` weapon and verify the bullets disappear after a short distance.
*   Watch the intro and verify the new Arcane-style images and Deponia-style humor.

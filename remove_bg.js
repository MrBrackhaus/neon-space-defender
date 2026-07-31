import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const dir = './public';
const files = fs.readdirSync(dir).filter(f => f.startsWith('enemy_') && f.endsWith('.png'));

async function processImage(file) {
    const filePath = path.join(dir, file);
    try {
        const image = await Jimp.read(filePath);
        
        // Get top-left pixel color as background reference
        const bgColor = image.getPixelColor(0, 0);
        const bgR = (bgColor >> 24) & 255;
        const bgG = (bgColor >> 16) & 255;
        const bgB = (bgColor >> 8) & 255;
        const bgA = bgColor & 255;

        if (bgA < 10) {
            console.log(`Skipping ${file}, top-left is already transparent.`);
            return;
        }

        console.log(`Processing ${file} (bg color: rgb(${bgR},${bgG},${bgB}))`);

        // Tolerance for background matching
        const threshold = 15;

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            const dr = Math.abs(r - bgR);
            const dg = Math.abs(g - bgG);
            const db = Math.abs(b - bgB);
            
            // If it's very close to background color, make it transparent
            if (dr <= threshold && dg <= threshold && db <= threshold) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            }
        });

        await new Promise((resolve, reject) => {
            image.write(filePath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Saved ${file}`);
    } catch (e) {
        console.error(`Failed on ${file}:`, e.message);
    }
}

async function run() {
    for (const file of files) {
        await processImage(file);
    }
}

run();

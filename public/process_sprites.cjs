const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function processImages() {
    const dir = __dirname;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') && (
        f === 'enemy_phantom_sheet.jpg' ||
        f === 'enemy_swarmer_sheet.jpg' ||
        f === 'enemy_stealth_sheet.jpg' ||
        f === 'enemy_laser_sheet.jpg' ||
        f === 'enemy_carrier_sheet.jpg' ||
        f === 'enemy_hivemind_sheet.jpg' ||
        f === 'enemy_mothership_sheet.jpg' ||
        f === 'enemy_destroyer_sheet.jpg'
    ));
    
    for (const file of files) {
        console.log(`Processing ${file}...`);
        try {
            const image = await Jimp.read(path.join(dir, file));
            
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];
                
                // threshold for black background (since we used pure black prompt)
                if (red < 35 && green < 35 && blue < 35) {
                    this.bitmap.data[idx + 3] = 0; // set alpha to 0
                }
            });
            
            const newFile = file.replace('.jpg', '.png');
            await image.write(path.join(dir, newFile));
            console.log(`Processed and saved ${newFile} successfully.`);
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
}

processImages();

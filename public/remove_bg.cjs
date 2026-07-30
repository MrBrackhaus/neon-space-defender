const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function processImages() {
    const dir = __dirname;
    const files = fs.readdirSync(dir).filter(f => (f.startsWith('enemy_') || f.startsWith('ship_')) && f.endsWith('.png'));
    
    for (const file of files) {
        console.log(`Processing ${file}...`);
        try {
            const image = await Jimp.read(path.join(dir, file));
            
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];
                
                if (red > 200 && green > 200 && blue > 200) {
                    this.bitmap.data[idx + 3] = 0; // set alpha to 0
                }
            });
            
            await image.write(path.join(dir, file));
            console.log(`Processed ${file} successfully.`);
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
}

processImages();

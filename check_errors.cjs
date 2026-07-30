
const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000));
    // Click new game
    try {
        await page.click('#btn-newgame');
    } catch(e) {}
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate clicking on the canvas for 'Launch'
    try {
        const canvas = await page.canvas;
        if (canvas) {
            const box = await canvas.boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height - 100);
        }
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();


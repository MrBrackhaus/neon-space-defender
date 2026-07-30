
const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, 'public/assets/audio');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true});

const wavHeader = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
  0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
  0x00, 0x00, 0x00, 0x00
]);

fs.writeFileSync(path.join(outDir, 'bgm_1.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'bgm_2.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'bgm_boss.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'sfx_shoot.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'sfx_explosion.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'sfx_hit.wav'), wavHeader);
fs.writeFileSync(path.join(outDir, 'sfx_levelup.wav'), wavHeader);
console.log('Dummy audio created.');


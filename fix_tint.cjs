const fs = require('fs');

function replaceSafe(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/enemy\.setTint\(([^)]+)\)/g, 'if (enemy.setTint) enemy.setTint()');
    content = content.replace(/enemy\.clearTint\(\)/g, 'if (enemy.clearTint) enemy.clearTint()');
    content = content.replace(/if \(enemy\.active\) if \(enemy\.clearTint\)/g, 'if (enemy.active && enemy.clearTint)');
    fs.writeFileSync(file, content);
}

replaceSafe('src/scenes/GameScene.js');
replaceSafe('src/systems/WeaponSystem.js');
console.log('Fixed setTint issues in GameScene.js and WeaponSystem.js');

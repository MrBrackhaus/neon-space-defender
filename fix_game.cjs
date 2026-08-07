const fs = require('fs');
let content = fs.readFileSync('src/scenes/GameScene.js', 'utf8');

content = content.replace(/enemy\.setTint\(0x00ccff\);/g, 'if (enemy.setTint) enemy.setTint(0x00ccff);');
content = content.replace(/enemy\.setTint\(0x88ff00\);/g, 'if (enemy.setTint) enemy.setTint(0x88ff00);');
content = content.replace(/enemy\.clearTint\(\);/g, 'if (enemy.clearTint) enemy.clearTint();');

content = content.replace(
    /createBtn\(0, 150, 'OPEN NYX SHOP', \(\) => \{\s*this\.scene\.pause\(\);\s*this\.scene\.launch\('InGameShopScene'\);\s*\}\);/g,
    \createBtn(0, 150, 'OPEN NYX SHOP', () => {
            this.scene.pause();
            const htmlHud = document.getElementById('html-hud');
            if (htmlHud) htmlHud.style.display = 'none';
            this.scene.launch('InGameShopScene');
        });\
);

content = content.replace(
    /\/\/ Active Item HUD Text\s*this\.activeItemText = this\.add\.text\(this\.cw \/ 2, this\.ch - 60, '', \{\s*fontFamily: 'Orbitron', fontSize: '14px', fontStyle: 'bold',\s*color: '#00ffcc', backgroundColor: '#00000088', padding: \{ x: 10, y: 5 \}\s*\}\)\.setOrigin\(0\.5\)\.setDepth\(20\);/g,
    ''
);
content = content.replace(
    /this\.activeItemText = this\.add\.text\(this\.cw \/ 2, this\.ch - 60, '', \{\s*fontFamily: 'Share Tech Mono', fontSize: '20px', color: '#00ffcc', fontStyle: 'bold'\s*\}\)\.setOrigin\(0\.5\)\.setDepth\(20\);/g,
    ''
);

content = content.replace(
    /abCd: \{ el: getEl\('hud-ability-cd'\), val: '' \}\s*\};\s*\}/g,
    \bCd: { el: getEl('hud-ability-cd'), val: '' },
            itemText: { el: getEl('hud-item'), val: '' },
            itemCd: { el: getEl('hud-item-cd'), val: '' }
        };
    }\
);

content = content.replace(
    /if \(this\.activeItemText\) this\.activeItemText\.setText\('\\[R\\] ' \+ b\.toUpperCase\(\)\);/g,
    'this.updateHUD();'
);

content = content.replace(
    /if \(this\.activeItemText\) this\.activeItemText\.setText\(''\);/g,
    'this.updateHUD();'
);

content = content.replace(
    /updateText\('abText', 'READY'\);\s*updateColor\('abText', '#fff'\);\s*updateWidth\('abCd', '0%'\);\s*\}\s*\}/g,
    \updateText('abText', 'READY');
                updateColor('abText', '#fff');
                updateWidth('abCd', '0%');
            }
        }

        if (pd.activeItem) {
            updateText('itemText', pd.activeItem.toUpperCase());
            updateColor('itemText', '#00ffcc');
            updateWidth('itemCd', '100%');
        } else {
            updateText('itemText', 'NONE');
            updateColor('itemText', '#888');
            updateWidth('itemCd', '0%');
        }\
);

fs.writeFileSync('src/scenes/GameScene.js', content);
console.log('GameScene restored and updated correctly!');

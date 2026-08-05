const fs = require('fs');
let content = fs.readFileSync('src/scenes/GameScene.js', 'utf8');

// 1. Insert moveAngle logic
const insertTarget = 'const angle = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);';
const avoidanceLogic = \const angle = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
            let moveAngle = angle;
            
            // Asteroid Avoidance Steering
            if (this.hazardSys && this.hazardSys.asteroids) {
                let avoidX = 0, avoidY = 0, avoids = 0;
                this.hazardSys.asteroids.getChildren().forEach(a => {
                    if (a.active) {
                        const dist = Phaser.Math.Distance.Between(e.x, e.y, a.x, a.y);
                        if (dist > 0 && dist < 200) {
                            const repAngle = Phaser.Math.Angle.Between(a.x, a.y, e.x, e.y);
                            const strength = 1 - (dist / 200);
                            avoidX += Math.cos(repAngle) * strength;
                            avoidY += Math.sin(repAngle) * strength;
                            avoids++;
                        }
                    }
                });
                if (avoids > 0) {
                    moveAngle = Math.atan2(Math.sin(angle) + avoidY * 2.5, Math.cos(angle) + avoidX * 2.5);
                }
            }\;

content = content.replace(insertTarget, avoidanceLogic);

// 2. Replace angle with moveAngle for velocity in specific types
// stealth
content = content.replace(
    /e\.setVelocity\(Math\.cos\(angle\)\*e\.speed, Math\.sin\(angle\)\*e\.speed\);/g,
    'e.setVelocity(Math.cos(moveAngle)*e.speed, Math.sin(moveAngle)*e.speed);'
);
// carrier retreat
content = content.replace(
    /e\.setVelocity\(Math\.cos\(angle\)\*-e\.speed, Math\.sin\(angle\)\*-e\.speed\);/g,
    'e.setVelocity(Math.cos(moveAngle)*-e.speed, Math.sin(moveAngle)*-e.speed);'
);
// hivemind
content = content.replace(
    /Math\.cos\(angle\)\*e\.speed \+ Math\.sin\(t\*3\)/g,
    'Math.cos(moveAngle)*e.speed + Math.sin(t*3)'
);
content = content.replace(
    /Math\.sin\(angle\)\*e\.speed \+ Math\.cos\(t\*2\)/g,
    'Math.sin(moveAngle)*e.speed + Math.cos(t*2)'
);
// shooter close
content = content.replace(
    /e\.setVelocity\(Math\.cos\(angle\)\*e\.speed\*0\.3, Math\.sin\(angle\)\*e\.speed\*0\.3\);/g,
    'e.setVelocity(Math.cos(moveAngle)*e.speed*0.3, Math.sin(moveAngle)*e.speed*0.3);'
);

fs.writeFileSync('src/scenes/GameScene.js', content, 'utf8');

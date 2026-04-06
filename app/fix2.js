const fs = require('fs');
const path = 'public/GunGame.PC/game.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/spawnZombies\(Math\.random\(\) < state\.gameplay\.prob \? 2 : 1\)/g, 'spawnZombies(state, scene, yawObj, Math.random() < state.gameplay.prob ? 2 : 1)');
fs.writeFileSync(path, content);
console.log('Fixed game.js');

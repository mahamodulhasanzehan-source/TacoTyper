const fs = require('fs');

function splitPlatform(platform) {
    const original = fs.readFileSync(`public/GunGame.${platform}/script.js`, 'utf8');

    const audioStart = 'const base64Gun =';
    const audioEnd = 'const canvas = document.getElementById(\'gameCanvas\');';
    
    const constantsStart = 'const WEAPONS = {';
    const constantsEnd = 'function updateBrightness() {';
    
    const weaponsStart = 'function getRoundedBoxGeometry(w, h, d) {';
    const weaponsEnd = '// --- MODE SELECTION ---';
    
    const utilsStart = 'function createFloatingText(pos, textStr, colorHex) {';
    const utilsEnd = 'const clock = new THREE.Clock();';
    
    const zombiesStart = 'function spawnZombies(count, forceType = null) {';
    const zombiesEnd = 'function createFloatingText(pos, textStr, colorHex) {';

    // Extract input/ui (everything before constants)
    // Wait, the order in the file is:
    // 1. Input/UI (mobile controls, HUD customization)
    // 2. Constants
    // 3. updateBrightness, getActiveWeaponId...
    // 4. Audio
    // 5. Three.js setup
    // 6. Weapons
    // 7. Mode Selection
    // 8. Zombies
    // 9. Utils
    // 10. Game Loop (update, render)

    const p1 = original.substring(0, original.indexOf(constantsStart));
    const p2 = original.substring(original.indexOf(constantsEnd), original.indexOf(audioStart));
    const p3 = original.substring(original.indexOf(audioEnd), original.indexOf(weaponsStart));
    const p4 = original.substring(original.indexOf(weaponsEnd), original.indexOf(zombiesStart));
    const p5 = original.substring(original.indexOf(utilsEnd));

    // Let's group them:
    // input.js: p1 (Mobile controls, HUD customization)
    // ui.js: p2 (updateBrightness, getActiveWeaponId), p4 (Mode Selection, Event Listeners)
    // game.js: p3 (Three.js setup), p5 (Game Loop)

    fs.writeFileSync(`public/GunGame.${platform}/input.js`, p1);
    fs.writeFileSync(`public/GunGame.${platform}/ui.js`, p2 + '\n' + p4);
    fs.writeFileSync(`public/GunGame.${platform}/game.js`, p3 + '\n' + p5);
    
    // Delete the original script.js
    fs.unlinkSync(`public/GunGame.${platform}/script.js`);
}

splitPlatform('PC');
splitPlatform('mobile');

console.log("Split platform files.");

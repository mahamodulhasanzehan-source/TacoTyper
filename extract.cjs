const fs = require('fs');
const pcScript = fs.readFileSync('public/GunGame.PC/script.js', 'utf8');

function extractBetween(content, startStr, endStr) {
    const start = content.indexOf(startStr);
    if (start === -1) return null;
    const end = content.indexOf(endStr, start);
    if (end === -1) return null;
    return content.substring(start, end);
}

const audioStart = 'const base64Gun =';
const audioEnd = 'const canvas = document.getElementById(\'gameCanvas\');';
const audioCode = extractBetween(pcScript, audioStart, audioEnd);

const constantsStart = 'const WEAPONS = {';
const constantsEnd = 'function updateBrightness() {';
const constantsCode = extractBetween(pcScript, constantsStart, constantsEnd);

const weaponsStart = 'function getRoundedBoxGeometry(w, h, d) {';
const weaponsEnd = '// --- MODE SELECTION ---';
const weaponsCode = extractBetween(pcScript, weaponsStart, weaponsEnd);

const utilsStart = 'function createFloatingText(pos, textStr, colorHex) {';
const utilsEnd = 'const clock = new THREE.Clock();';
const utilsCode = extractBetween(pcScript, utilsStart, utilsEnd);

const zombiesStart = 'function spawnZombies(count, forceType = null) {';
const zombiesEnd = 'function createFloatingText(pos, textStr, colorHex) {';
const zombiesCode = extractBetween(pcScript, zombiesStart, zombiesEnd);

fs.mkdirSync('public/shared', { recursive: true });
fs.writeFileSync('public/shared/audio.js', audioCode || '');
fs.writeFileSync('public/shared/constants.js', constantsCode || '');
fs.writeFileSync('public/shared/weapons.js', weaponsCode || '');
fs.writeFileSync('public/shared/utils.js', utilsCode || '');
fs.writeFileSync('public/shared/zombies.js', zombiesCode || '');

console.log("Extracted shared files.");

const fs = require('fs');
const path = 'public/GunGame.PC/ui.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
// Find the line with "// --- MODE SELECTION ---"
const startIndex = lines.findIndex(line => line.includes('// --- MODE SELECTION ---'));
if (startIndex !== -1) {
    fs.writeFileSync(path, lines.slice(startIndex).join('\n'));
    console.log('Fixed ui.js');
} else {
    console.log('Could not find MODE SELECTION comment');
}

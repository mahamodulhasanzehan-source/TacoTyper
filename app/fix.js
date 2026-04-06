const fs = require('fs');
const path = 'public/GunGame.PC/ui.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
// Find the line with "// --- MODE SELECTION ---"
const startIndex = lines.findIndex(line => line.includes('// --- MODE SELECTION ---'));
if (startIndex !== -1) {
    // Extract base64 strings
    const base64GunLine = lines.find(l => l.includes('const base64Gun ='));
    const base64SniperLine = lines.find(l => l.includes('const base64Sniper ='));
    
    if (base64GunLine && base64SniperLine) {
        fs.writeFileSync('public/shared/audioData.js', base64GunLine + '\n' + base64SniperLine + '\n');
    }

    fs.writeFileSync(path, lines.slice(startIndex).join('\n'));
    console.log('Fixed ui.js');
} else {
    console.log('Could not find MODE SELECTION comment');
}

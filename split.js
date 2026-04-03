import fs from 'fs';

const html = fs.readFileSync('public/GunGamePC.html', 'utf8');

// Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    fs.mkdirSync('public/css', { recursive: true });
    fs.writeFileSync('public/css/style.css', styleMatch[1].trim());
}

// Extract JS
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    fs.mkdirSync('public/js', { recursive: true });
    fs.writeFileSync('public/js/main.js', scriptMatch[1].trim());
}

// Extract HTML
const newHtml = html
    .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/style.css">')
    .replace(/<script>[\s\S]*?<\/script>/, '<script src="js/main.js"></script>');

fs.writeFileSync('public/GunGame.html', newHtml);
fs.writeFileSync('public/GunGameMobile.html', newHtml);
fs.writeFileSync('public/GunGamePC.html', newHtml);

console.log('Split complete!');

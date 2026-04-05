const fs = require('fs');
const path = require('path');

function splitFile(filePath, outDir) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const styleStart = content.indexOf('<style>');
    const styleEnd = content.indexOf('</style>');
    
    const scriptStart = content.indexOf('<script>', styleEnd);
    const scriptEnd = content.lastIndexOf('</script>');
    
    if (styleStart === -1 || styleEnd === -1 || scriptStart === -1 || scriptEnd === -1) {
        console.error('Could not find tags in ' + filePath);
        return;
    }
    
    const cssContent = content.substring(styleStart + 7, styleEnd).trim();
    const jsContent = content.substring(scriptStart + 8, scriptEnd).trim();
    
    let htmlContent = content.substring(0, styleStart);
    htmlContent += '<link rel="stylesheet" href="style.css">\n';
    htmlContent += content.substring(styleEnd + 8, scriptStart);
    htmlContent += '<script src="script.js"></script>\n';
    htmlContent += content.substring(scriptEnd + 9);
    
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent);
    fs.writeFileSync(path.join(outDir, 'style.css'), cssContent);
    fs.writeFileSync(path.join(outDir, 'script.js'), jsContent);
    
    console.log('Successfully split ' + filePath + ' into ' + outDir);
}

splitFile('public/GunGameMobile.html', 'public/GunGame.mobile');
splitFile('public/GunGamePC.html', 'public/GunGame.PC');

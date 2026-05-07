const fs = require('fs');
const path = require('path');

const targetUrl = 'https://coconutcoastrealtors.org/wp-content/uploads/2026/04/CCOR-Vert-Logo-no-tag-clr-scaled-e1776958694707.png';

const regexesToReplace = [
    /https?:\/\/(?:www\.)?bonitaesterorealtors\.com\/[a-zA-Z0-9_\-\/]*\/BER-Logo\.png/gi,
    /https?:\/\/(?:www\.)?bonitaesterorealtors\.com\/[a-zA-Z0-9_\-\/]*\/BonitaSpringsEsteroRealtors_Logo_Vertical\.png/gi
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!['node_modules', '.git', '.wrangler', '.gemini', 'database', 'images'].includes(file)) {
                processDirectory(fullPath);
            }
        } else if (stat.isFile() && fullPath.endsWith('.html')) {
            const fileName = path.basename(fullPath).toLowerCase();
            // User requested to not touch the Homepage
            if (fileName === 'homepage2025.html' || fileName === 'index.html' || fileName === 'homepage2025test.html') {
                return;
            }
            
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            regexesToReplace.forEach(regex => {
                content = content.replace(regex, targetUrl);
            });
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated logo in: ${path.relative(__dirname, fullPath)}`);
            }
        }
    });
}

processDirectory(__dirname);
console.log('Logo update completed.');

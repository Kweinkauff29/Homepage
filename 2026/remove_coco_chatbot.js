const fs = require('fs');
const path = require('path');

const cocoScriptRegex = /<script>\s*window\.CocoConfig = \{[\s\S]*?<\/script>\s*<script src="https:\/\/www\.ccreschool\.com\/coco\/coco-widget\.js\?v=5" defer><\/script>/gi;

function processFile(fullPath) {
    if (fullPath.includes('HeaderTest2026.html')) {
        console.log(`Skipping ${fullPath} - This is the source file.`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (cocoScriptRegex.test(content)) {
        content = content.replace(cocoScriptRegex, '');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Removed Coco chatbot from ${fullPath}`);
    } else {
        console.log(`Coco chatbot not found in ${fullPath}`);
    }
}

// 1. Process files in 2026 directory
const dir2026 = __dirname;
fs.readdirSync(dir2026).forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        processFile(path.join(dir2026, file));
    }
});

// 2. Process root index.html
const rootIndex = path.join(dir2026, '../index.html');
if (fs.existsSync(rootIndex)) {
    processFile(rootIndex);
}

console.log('Chatbot removal complete.');

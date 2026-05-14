const fs = require('fs');
const path = require('path');

const cocoScript = `
<script>
  window.CocoConfig = {
    apiUrl: 'https://www.ccreschool.com',
    supportEmail: 'support@berealtors.org'
  };
</script>
<script src="https://www.ccreschool.com/coco/coco-widget.js?v=5" defer></script>
`;

function processFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if it already has CocoConfig
    if (content.includes('CocoConfig')) {
        console.log(`Skipping ${fullPath} - CocoConfig already present.`);
        return;
    }
    
    // Inject before </body>
    if (content.includes('</body>')) {
        content = content.replace('</body>', cocoScript.trim() + '\n</body>');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Injected Coco chatbot into ${fullPath}`);
    } else {
        console.log(`Skipping ${fullPath} - </body> tag not found.`);
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

console.log('Chatbot restoration complete.');

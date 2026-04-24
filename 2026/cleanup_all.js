const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

files.forEach(file => {
    if (path.extname(file) === '.html') {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // 1. Remove style blocks that contain any of our previous markers
        content = content.replace(/<style>[\s\S]*?(ribbonFlowBg|ribbonSway|waveFloat|ber-global-wave|wave-blob|ccor-waves)[\s\S]*?<\/style>/gi, '');
        
        // 2. Remove all variants of our wave divs
        // Use a very aggressive match for any div with our classes
        content = content.replace(/<div class="(?:ber-global-wave-bg|ber-global-wave-overlay|ccor-waves)"[\s\S]*?<\/div>/gi, (match) => {
            // Since we have nested divs, we need to match carefully.
            // But for these specific components, we know they have fixed structures.
            // Let's just remove anything with ber-wave or wave-blob inside it.
            return '';
        });
        
        // Final cleanup for any leftover fragments
        content = content.replace(/<div class="ber-wave"><\/div>/gi, '');
        content = content.replace(/<div class="wave-blob wave-blob-[1-3]"><\/div>/gi, '');
        
        // Clean leading whitespace/newlines
        content = content.replace(/^\s+/g, '');
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned ${file}`);
    }
});
console.log('Cleanup complete.');

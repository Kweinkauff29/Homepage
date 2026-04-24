const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

files.forEach(f => {
    let content = fs.readFileSync(path.join(__dirname, f), 'utf8');
    
    // 1. Remove style blocks completely
    content = content.replace(/<style>[\s\S]*?<\/style>/gi, (match) => {
        if (match.includes('ccor') || match.includes('ber-global') || match.includes('wave') || match.includes('ribbon')) {
            return '';
        }
        return match;
    });

    // 2. Heavy logic to remove DIV blocks with our markers
    // We search for our specific root IDs and classes
    const markers = ['ccor-bg-waves', 'ccor-bg-root', 'ber-global-wave-bg', 'ber-global-wave-overlay'];
    
    markers.forEach(id => {
        const startIdx = content.indexOf(id);
        if (startIdx !== -1) {
            // Find the opening <div that contains this ID
            let openingTagIdx = content.lastIndexOf('<div', startIdx);
            if (openingTagIdx !== -1) {
                // Now we need to find the matching closing </div>
                // Since our blocks always have 3 internal divs + 1 outer, we look for the 4th </div>
                let searchFrom = openingTagIdx;
                let closeTagsFound = 0;
                while (closeTagsFound < 4 && searchFrom !== -1) {
                    searchFrom = content.indexOf('</div>', searchFrom + 1);
                    if (searchFrom !== -1) closeTagsFound++;
                }
                if (searchFrom !== -1) {
                    content = content.substring(0, openingTagIdx) + content.substring(searchFrom + 6);
                }
            }
        }
    });

    // 3. Final mop up of any loose fragments
    content = content.replace(/<div class="(ccor-blob|ber-wave|wave-blob)[\s\S]*?<\/div>/gi, '');
    content = content.replace(/\\n/g, ''); 
    content = content.replace(/<\/div>/g, (match, offset) => {
       // Only remove orphaned closing divs at the very top
       if (offset < 500 && (content.substring(0, offset).trim() === '')) {
           return '';
       }
       return match;
    });
    
    content = content.trimStart();
    fs.writeFileSync(path.join(__dirname, f), content, 'utf8');
});

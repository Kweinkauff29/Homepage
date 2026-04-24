const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

files.forEach(f => {
    let c = fs.readFileSync(path.join(__dirname, f), 'utf8');
    
    // Remove all variants of style blocks we've created
    c = c.replace(/<style>[\s\S]*?(ccor-bg-waves|ccor-bg-root|ber-global-wave|ribbonSway|waveFloat|wave-blob)[\s\S]*?<\/style>/gi, '');
    
    // Remove all variants of divs we've created
    c = c.replace(/<div (id|class)="(ccor-bg-waves|ccor-bg-root|ber-global-wave-bg|ber-global-wave-overlay|ccor-waves)"[\s\S]*?<\/div>/gi, '');
    
    // Scrub the nested divs that might have been left behind
    c = c.replace(/<div class="ber-wave"><\/div>/gi, '');
    c = c.replace(/<div class="wave-blob wave-blob-[1-3]"><\/div>/gi, '');
    c = c.replace(/<div class="ccor-blob blob-[1-3]"><\/div>/gi, '');

    // Trim start
    c = c.trimStart();
    
    fs.writeFileSync(path.join(__dirname, f), c, 'utf8');
});

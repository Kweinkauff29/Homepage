const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const finalWaveCSSAndHTML = `\n<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
    --ccor-grey: #5B5A5C;
  }
  @keyframes ribbonSway {
    0% { transform: translate(-5%, -5%) rotate(0deg); }
    50% { transform: translate(5%, 5%) rotate(2deg); }
    100% { transform: translate(-5%, -5%) rotate(0deg); }
  }
  .ber-global-wave-bg {
    position: fixed;
    top: -20%;
    left: -20%;
    width: 140%;
    height: 140%;
    pointer-events: none;
    z-index: 0; /* Keep it behind content but in front of body background */
    overflow: hidden;
    opacity: 0.15; /* More visible */
    background: #fff;
  }
  .ber-global-wave-bg .ber-wave {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, var(--ccor-teal) 0%, var(--ccor-blue) 40%, transparent 70%);
    filter: blur(80px);
    animation: ribbonSway 20s ease-in-out infinite;
  }
  .ber-global-wave-bg .ber-wave:nth-child(2) { 
    background: radial-gradient(circle at 20% 80%, var(--ccor-gold) 0%, var(--ccor-teal) 40%, transparent 70%);
    animation-duration: 25s; 
    animation-delay: -5s; 
  }
  .ber-global-wave-bg .ber-wave:nth-child(3) { 
    background: radial-gradient(circle at 80% 20%, var(--ccor-blue) 0%, var(--ccor-gold) 40%, transparent 70%);
    animation-duration: 30s; 
    animation-delay: -10s; 
  }
</style>
<div class="ber-global-wave-bg" aria-hidden="true">
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
</div>\n`;

files.forEach(file => {
    if (path.extname(file) === '.html') {
        let content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        
        // 1. Heavy Cleanup of ALL previous wave-related stuff
        // Matches the style block and the div block
        content = content.replace(/<style>[\s\S]*?ber-global-wave-bg[\s\S]*?<\/style>/gi, '');
        content = content.replace(/<div class="ber-global-wave-bg"[\s\S]*?<\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<\/div>/gi, ''); // Fix double injection
        content = content.replace(/<div class="ber-global-wave-bg"[\s\S]*?<\/div>[\s\S]*?<\/div>/i, (match) => {
            // If we find a block starting with ber-global-wave-bg, we should try to capture precisely its end
            // but since it's nested divs, let's just use string search for the final </div> after the 3 internal ones.
            return '';
        });
        
        // Even more aggressive: remove anything that looks like our previous injections
        content = content.replace(/<div class="ber-global-wave-bg"[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div class="ber-wave"><\/div>/gi, '');
        
        // 2. Body/HTML transparency
        content = content.replace(/body\s*\{([^}]*)\}/gi, (match, p1) => {
            if (!p1.includes('background-color: transparent')) {
                return `body { ${p1.trim()}; background-color: transparent !important; }`;
            }
            return match;
        });

        // 3. Inject new script
        const bodyMatch = content.match(/<body[^>]*>/i);
        if (bodyMatch) {
            content = content.replace(bodyMatch[0], bodyMatch[0] + finalWaveCSSAndHTML);
        } else {
            content = finalWaveCSSAndHTML + content;
        }

        fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
        console.log(`Cleaned and re-applied waves to ${file}`);
    }
});
console.log('Update complete.');

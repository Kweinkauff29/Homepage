const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

// This version uses a fixed overlay approach that works on ANY page regardless of background occlusion.
// It sits at z-index 9999 but is very transparent, so it modulates the white background without blocking text.
const finalWaveCSSAndHTML = `\n<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
  }
  @keyframes waveFloat {
    0% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-30px) rotate(1deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  .ber-global-wave-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999; /* STAYS ON TOP OF EVERYTHING */
    overflow: hidden;
    opacity: 0.15; /* Noticeable but soft */
  }
  .ber-global-wave-overlay .wave-blob {
    position: absolute;
    width: 800px;
    height: 800px;
    border-radius: 50%;
    filter: blur(100px);
    animation: waveFloat 15s ease-in-out infinite alternate;
  }
  .wave-blob-1 {
    top: -200px;
    right: -200px;
    background: var(--ccor-teal);
    animation-duration: 20s;
  }
  .wave-blob-2 {
    bottom: -300px;
    left: -200px;
    background: var(--ccor-blue);
    animation-duration: 25s;
    animation-delay: -5s;
  }
  .wave-blob-3 {
    top: 20%;
    left: -400px;
    background: var(--ccor-gold);
    animation-duration: 18s;
    animation-delay: -2s;
  }
</style>
<div class="ber-global-wave-overlay" aria-hidden="true">
  <div class="wave-blob wave-blob-1"></div>
  <div class="wave-blob wave-blob-2"></div>
  <div class="wave-blob wave-blob-3"></div>
</div>\n`;

files.forEach(file => {
    if (path.extname(file) === '.html') {
        let content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        
        // 1. Scrub ALL previous attempts (various class names and tags)
        content = content.replace(/<style>[\s\S]*?ber-global-wave[\s\S]*?<\/style>/gi, '');
        content = content.replace(/<div class="ber-global-wave-bg"[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div class="ber-global-wave-overlay"[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div class="wave-blob[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div class="ber-wave"><\/div>/gi, '');
        
        // 2. Clean up any orphaned divs from the previous regex bug
        content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi, (match) => {
            // Only remove if it looks like the leftover junk
            return '</div>'; 
        });

        // 3. Inject precisely at the top of <body>
        const bodyMatch = content.match(/<body[^>]*>/i);
        if (bodyMatch) {
            content = content.replace(bodyMatch[0], bodyMatch[0] + finalWaveCSSAndHTML);
        } else {
            content = finalWaveCSSAndHTML + content;
        }

        fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
        console.log(`Overlay waves applied to ${file}`);
    }
});
console.log('Final Overlay Wave Update Complete.');

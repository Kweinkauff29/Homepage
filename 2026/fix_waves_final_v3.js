const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

// Increased opacity and better positioning
const finalWaveCSSAndHTML = `\n<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
    --ccor-grey: #5B5A5C;
  }
  @keyframes ribbonSway {
    0% { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
    50% { transform: translate(10%, 10%) rotate(5deg) scale(1.2); }
    100% { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
  }
  .ber-global-wave-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: -9999; /* Far back */
    overflow: hidden;
    background-color: #ffffff !important;
  }
  .ber-global-wave-bg .ber-wave {
    position: absolute;
    width: 150vmax;
    height: 150vmax;
    top: -25vmax;
    left: -25vmax;
    background: radial-gradient(circle at center, var(--ccor-teal) 0%, var(--ccor-blue) 40%, transparent 70%);
    filter: blur(120px);
    opacity: 0.25; /* Highly visible for testing */
    animation: ribbonSway 25s ease-in-out infinite;
  }
  .ber-global-wave-bg .ber-wave:nth-child(2) { 
    background: radial-gradient(circle at center, var(--ccor-gold) 0%, var(--ccor-teal) 50%, transparent 70%);
    opacity: 0.2;
    animation-duration: 35s; 
    animation-delay: -7s; 
  }
  .ber-global-wave-bg .ber-wave:nth-child(3) { 
    background: radial-gradient(circle at center, var(--ccor-blue) 0%, var(--ccor-gold) 60%, transparent 70%);
    opacity: 0.15;
    animation-duration: 45s; 
    animation-delay: -15s; 
  }
  /* Force transparency on body and common containers to show background */
  html, body {
    background-color: transparent !important;
    background: transparent !important;
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
        
        // 1. Cleanup
        content = content.replace(/<style>[\s\S]*?ber-global-wave-bg[\s\S]*?<\/style>/gi, '');
        content = content.replace(/<div class="ber-global-wave-bg"[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div class="ber-wave"><\/div>/gi, '');
        
        // 2. Inject inside body to ensure it's rendered by the engine properly
        const bodyMatch = content.match(/<body[^>]*>/i);
        if (bodyMatch) {
            content = content.replace(bodyMatch[0], bodyMatch[0] + finalWaveCSSAndHTML);
        } else {
            // Fallback to top if no body tag
            content = finalWaveCSSAndHTML + content;
        }

        // 3. Optional: Try to make white sections transparent
        // We'll replace hardcoded white backgrounds with transparent in common classes if they exist
        // But let's start with just body/html transparency first.

        fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
        console.log(`Deep cleaned and re-injected waves to ${file}`);
    }
});
console.log('Update complete.');

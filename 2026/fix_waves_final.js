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
    0% { transform: translate(0, 0) rotate(0deg) scale(1); }
    33% { transform: translate(5%, -5%) rotate(2deg) scale(1.1); }
    66% { transform: translate(-5%, 5%) rotate(-2deg) scale(0.9); }
    100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  }
  .ber-global-wave-bg {
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    pointer-events: none;
    z-index: 9999; /* Put it on top but use mix-blend-mode */
    overflow: hidden;
    opacity: 0.06; /* Very subtle */
    mix-blend-mode: multiply; /* Ensures it shows up on white and blends with content */
  }
  .ber-global-wave-bg .ber-wave {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, var(--ccor-teal) 0%, var(--ccor-blue) 30%, var(--ccor-gold) 60%, transparent 100%);
    filter: blur(100px);
    animation: ribbonSway 30s ease-in-out infinite;
  }
  .ber-global-wave-bg .ber-wave:nth-child(2) { 
    background: radial-gradient(circle at 30% 70%, var(--ccor-blue) 0%, var(--ccor-gold) 40%, transparent 100%);
    animation-duration: 45s; 
    animation-delay: -10s; 
  }
  .ber-global-wave-bg .ber-wave:nth-child(3) { 
    background: radial-gradient(circle at 70% 30%, var(--ccor-gold) 0%, var(--ccor-teal) 40%, transparent 100%);
    animation-duration: 60s; 
    animation-delay: -20s; 
  }
</style>
<div class="ber-global-wave-bg" aria-hidden="true">
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
</div>\n`;

const oldWaveRegex = /[\s\n]*<style>[\s\S]*?ber-global-wave-bg[\s\S]*?<\/div>[\s\n]*/gi;

files.forEach(file => {
    if (path.extname(file) === '.html') {
        let content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        let originalContent = content;
        
        // Replace ANY previous ber-global-wave-bg block
        content = content.replace(oldWaveRegex, finalWaveCSSAndHTML);
        
        if (content !== originalContent) {
            fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
            console.log(`Final wave fix applied to ${file}`);
        } else if (!content.includes('ber-global-wave-bg')) {
            // If somehow missing, inject it
            const bodyMatch = content.match(/<body[^>]*>/i);
            if (bodyMatch) {
                content = content.replace(bodyMatch[0], bodyMatch[0] + finalWaveCSSAndHTML);
            } else {
                content = finalWaveCSSAndHTML + content;
            }
            fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
            console.log(`Injected final waves into ${file}`);
        }
    }
});
console.log('Final wave update complete.');

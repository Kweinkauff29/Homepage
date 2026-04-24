const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const newWaveCSSAndHTML = `\n<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
    --ccor-grey: #5B5A5C;
  }
  @keyframes ribbonSway {
    0% { transform: translateY(0) rotate(0deg) scale(1); }
    50% { transform: translateY(-3%) rotate(2deg) scale(1.05); }
    100% { transform: translateY(0) rotate(-1deg) scale(0.95); }
  }
  .ber-global-wave-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
    overflow: hidden;
  }
  .ber-global-wave-bg .ber-wave {
    position: absolute;
    top: -20%;
    left: -20%;
    width: 140%;
    height: 140%;
    background: linear-gradient(135deg, var(--ccor-blue) 0%, var(--ccor-teal) 30%, var(--ccor-gold) 70%, var(--ccor-grey) 100%);
    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
    opacity: 0.03;
    filter: blur(8px);
    animation: ribbonSway 20s ease-in-out infinite alternate;
    transform-origin: center center;
  }
  .ber-global-wave-bg .ber-wave:nth-child(2) { 
    background: linear-gradient(135deg, var(--ccor-teal) 0%, var(--ccor-blue) 50%, var(--ccor-gold) 100%);
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    opacity: 0.04; 
    animation-duration: 25s; 
    animation-delay: -5s; 
  }
  .ber-global-wave-bg .ber-wave:nth-child(3) { 
    background: linear-gradient(135deg, var(--ccor-gold) 0%, var(--ccor-teal) 50%, var(--ccor-blue) 100%);
    border-radius: 50% 50% 40% 60% / 40% 60% 50% 60%;
    opacity: 0.02; 
    animation-duration: 30s; 
    animation-delay: -10s; 
  }
  .ber-global-wave-bg .ber-wave:nth-child(4) { 
    border-radius: 40% 60% 50% 50% / 50% 50% 60% 40%;
    opacity: 0.03; 
    animation-duration: 35s; 
    animation-delay: -15s; 
  }
</style>
<div class="ber-global-wave-bg" aria-hidden="true">
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
</div>\n`;

// Matches both variants (with and without aria-hidden) just in case
const regex1 = /[\s\n]*<style>[\s\S]*?ber-global-wave-bg[\s\S]*?aria-hidden="true">[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<\/div>[\s\n]*/i;
const regex2 = /[\s\n]*<style>[\s\S]*?ber-global-wave-bg[\s\S]*?class="ber-global-wave-bg">[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<\/div>[\s\n]*/i;

files.forEach(file => {
    if (path.extname(file) === '.html') {
        let content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        let originalContent = content;
        
        if (regex1.test(content)) {
            content = content.replace(regex1, newWaveCSSAndHTML);
        } else if (regex2.test(content)) {
            content = content.replace(regex2, newWaveCSSAndHTML);
        }
        
        if (content !== originalContent) {
            fs.writeFileSync(path.join(directoryPath, file), content, 'utf8');
            console.log(`Updated waves in ${file}`);
        }
    }
});
console.log('Wave fix completed.');

const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

// THE PERFECT WAVE TEMPLATE
const perfectWave = `
<style>
  :root {
    --wave-blue: #1B449D;
    --wave-teal: #64BAB0;
    --wave-gold: #D4AC6C;
  }
  #ccor-bg-waves {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: -9999;
    background: #ffffff;
    overflow: hidden;
    pointer-events: none;
  }
  .ccor-blob {
    position: absolute;
    width: 60vmax;
    height: 60vmax;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.25;
    mix-blend-mode: multiply;
    animation: ccorMove 25s ease-in-out infinite alternate;
  }
  .blob-1 { top: -10%; left: -10%; background: var(--wave-teal); animation-duration: 30s; }
  .blob-2 { bottom: -15%; right: -10%; background: var(--wave-blue); animation-duration: 35s; animation-delay: -5s; }
  .blob-3 { top: 40%; right: -20%; background: var(--wave-gold); animation-duration: 40s; animation-delay: -10s; }
  @keyframes ccorMove {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    50% { transform: translate(10%, 5%) scale(1.1) rotate(5deg); }
    100% { transform: translate(-5%, 10%) scale(0.9) rotate(-3deg); }
  }
  /* Ensuring that these styles are self-contained when used in WordPress */
  body, .site, #page, .site-content, #content, .entry-content {
    background-color: transparent !important;
    background: transparent !important;
  }
</style>
<div id="ccor-bg-waves" aria-hidden="true">
  <div class="ccor-blob blob-1"></div>
  <div class="ccor-blob blob-2"></div>
  <div class="ccor-blob blob-3"></div>
</div>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Scrub any existing version of our waves
        content = content.replace(/<style>[\s\S]*?ccor-bg-waves[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<div id="ccor-bg-waves[\s\S]*?<\/div>/gi, '');
        
        // Prepend fresh
        content = perfectWave + "\\n" + content.trim();
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Injected perfect waves to ${file}`);
    }
});

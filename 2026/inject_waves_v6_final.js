const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const overlayWaves = `
<!-- CCOR SELF-CONTAINED BACKGROUND OVERLAY -->
<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
  }
  #ccor-waves-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 999999;
    overflow: hidden;
    mix-blend-mode: multiply;
  }
  .ccor-blob {
    position: absolute;
    width: 70vmax;
    height: 70vmax;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.15;
    animation: ccorDrift 30s ease-in-out infinite alternate;
  }
  .blob-1 { top: -15%; left: -15%; background: var(--ccor-teal); animation-duration: 40s; }
  .blob-2 { bottom: -20%; right: -15%; background: var(--ccor-blue); animation-duration: 45s; animation-delay: -10s; }
  .blob-3 { top: 35%; right: -25%; background: var(--ccor-gold); animation-duration: 50s; animation-delay: -20s; }
  @keyframes ccorDrift {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    50% { transform: translate(12%, 10%) scale(1.1) rotate(4deg); }
    100% { transform: translate(-10%, 12%) scale(0.95) rotate(-2deg); }
  }
</style>
<div id="ccor-waves-overlay" aria-hidden="true">
  <div class="ccor-blob blob-1"></div>
  <div class="ccor-blob blob-2"></div>
  <div class="ccor-blob blob-3"></div>
</div>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Final sanity check cleanup
        content = content.replace(/<style>[\s\S]*?(ccor-bg-waves|ccor-bg-root|ber-global-wave|ribbonSway|waveFloat|wave-blob|ccor-waves-overlay)[\s\S]*?<\/style>/gi, '');
        content = content.replace(/<div id="(ccor-bg-waves|ccor-bg-root|ber-global-wave-bg|ber-global-wave-overlay|ccor-waves-overlay)"[\s\S]*?<\/div>/gi, '');

        // Prepend the code
        content = overlayWaves.trim() + "\\n\\n" + content.trim();
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Injected overlay waves into ${file}`);
    }
});
console.log('Update complete.');

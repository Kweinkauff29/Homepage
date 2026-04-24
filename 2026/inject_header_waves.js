const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const headerWaveCode = `
<!-- CCOR DEFINED WAVES (Same as Header) -->
<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
    --ccor-grey: #5B5A5C;
  }

  @keyframes ribbonFlow {
    0% { background-position: 0% 0; }
    100% { background-position: 400% 0; }
  }

  #ccor-waves-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -9999;
    background: #ffffff;
    overflow: hidden;
    pointer-events: none;
  }

  /* Define the header-style ribbon waves */
  .ccor-ribbon {
    position: absolute;
    width: 300%;
    height: 500px;
    left: -100%;
    background: linear-gradient(120deg,
      var(--ccor-blue) 0%,
      #2e5ab8 8%,
      #3d6cd1 16%,
      var(--ccor-teal) 24%,
      #8dd4ca 32%,
      #a6e1d9 40%,
      var(--ccor-gold) 48%,
      #e8c88a 56%,
      #f2dcb3 64%,
      var(--ccor-grey) 72%,
      #7a7a7a 80%,
      var(--ccor-teal) 88%,
      #4da69a 94%,
      var(--ccor-blue) 100%);
    background-size: 400% 100%;
    animation: ribbonFlow 15s ease-in-out infinite alternate;
    border-radius: 45% 48% 43% 47%;
    opacity: 0.15; /* Subtly visible on white */
    filter: blur(4px);
    will-change: transform, filter;
  }

  /* Bottom waves peaking up (like the header) */
  .ccor-ribbon-bottom {
    bottom: -350px;
  }

  /* Top waves peaking down */
  .ccor-ribbon-top {
    top: -350px;
    transform: rotate(180deg);
  }

  /* Individual wave animations for depth */
  .ccor-ribbon:nth-child(1) { opacity: 0.08; animation-duration: 20s; }
  .ccor-ribbon:nth-child(2) { opacity: 0.10; animation-duration: 24s; animation-delay: -4s; }
  .ccor-ribbon:nth-child(3) { opacity: 0.12; animation-duration: 28s; animation-delay: -8s; }
  .ccor-ribbon:nth-child(4) { opacity: 0.14; animation-duration: 32s; animation-delay: -12s; }
  .ccor-ribbon:nth-child(5) { opacity: 0.09; animation-duration: 36s; animation-delay: -16s; }
  .ccor-ribbon:nth-child(6) { opacity: 0.11; animation-duration: 40s; animation-delay: -20s; }

  /* Ensure page content shows the background */
  body, .site, #page, .site-content, #content, .entry-content {
    background-color: transparent !important;
    background: transparent !important;
  }
</style>
<div id="ccor-waves-bg" aria-hidden="true">
  <!-- Bottom Set -->
  <div class="ccor-ribbon ccor-ribbon-bottom"></div>
  <div class="ccor-ribbon ccor-ribbon-bottom"></div>
  <div class="ccor-ribbon ccor-ribbon-bottom"></div>
  <!-- Top Set -->
  <div class="ccor-ribbon ccor-ribbon-top"></div>
  <div class="ccor-ribbon ccor-ribbon-top"></div>
  <div class="ccor-ribbon ccor-ribbon-top"></div>
</div>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Remove ALL previous injection markers
        content = content.replace(/<!-- CCOR SELF-CONTAINED[\s\S]*?<\/div>/gi, '');
        content = content.replace(/<style>[\s\S]*?(ccor-waves-overlay|ccor-bg-waves|ccor-bg-root|ber-global-wave)[\s\S]*?<\/style>/gi, '');
        content = content.replace(/<div id="(ccor-waves-overlay|ccor-bg-waves|ccor-bg-root|ber-global-wave-bg|ber-global-wave-overlay)"[\s\S]*?<\/div>/gi, '');
        
        // Prepend new logic
        content = headerWaveCode.trim() + "\n\n" + content.trim();
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Injected defined header-style waves into ${file}`);
    }
});
console.log('Update complete.');

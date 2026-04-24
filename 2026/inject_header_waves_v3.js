const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const headerWaveCode = `
<div id="ccor-waves-bg" aria-hidden="true">
  <div class="ccor-wave-container ccor-waves-bottom"></div>
  <div class="ccor-wave-container ccor-waves-top"></div>
</div>
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
    inset: 0;
    z-index: -9999;
    background: #ffffff;
    overflow: hidden;
    pointer-events: none;
  }
  .ccor-wave-container {
    position: absolute;
    inset: 0;
  }
  .ccor-wave {
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
    opacity: 0.12;
    filter: blur(4px);
    will-change: transform, filter;
    transform-origin: center bottom;
  }
  .ccor-waves-bottom .ccor-wave { bottom: -350px; }
  .ccor-waves-top { transform: rotate(180deg); }
  .ccor-waves-top .ccor-wave { bottom: -350px; }
  body, .site, #page, .site-content, #content, .entry-content {
    background-color: transparent !important;
    background: transparent !important;
  }
</style>
<script>
  (function() {
    function initCcorWaves() {
        const root = document.getElementById('ccor-waves-bg');
        if (!root) return;
        const containers = root.querySelectorAll('.ccor-wave-container');
        containers.forEach(container => {
            const waves = [];
            for (let i = 0; i < 4; i++) {
                const wave = document.createElement('div');
                wave.className = 'ccor-wave';
                wave.style.borderRadius = (38 + Math.random() * 10) + '%';
                container.appendChild(wave);
                waves.push({
                    el: wave,
                    phase: Math.random() * Math.PI * 2,
                    phaseSpeed: 0.003 + (Math.random() * 0.005)
                });
            }
            function animate() {
                waves.forEach((w, i) => {
                    w.phase += w.phaseSpeed;
                    const drift = Math.sin(w.phase * 0.4) * 80;
                    const undulation = Math.sin(w.phase) * (15 + (i * 5));
                    const rotation = Math.cos(w.phase * 0.7) * 4;
                    w.el.style.transform = "translateX("+drift+"px) translateY("+(-undulation - (i*10))+"px) rotate("+rotation+"deg) scaleX(1.4)";
                });
                requestAnimationFrame(animate);
            }
            animate();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCcorWaves);
    } else {
        initCcorWaves();
    }
  })();
</script>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Clean up any stray markers
        content = content.replace(/<!-- CCOR DEFINED WAVES[\s\S]*?<\/script>/gi, '');
        
        // Inject surgically
        const bodyMatch = content.match(/<body[^>]*>/i);
        if (bodyMatch) {
            content = content.replace(bodyMatch[0], bodyMatch[0] + headerWaveCode);
        } else {
            // Find first real element tag part
            const headEndMatch = content.match(/<\/head>/i);
            if (headEndMatch) {
                 content = content.replace(headEndMatch[0], headEndMatch[0] + headerWaveCode);
            } else {
                 content = headerWaveCode + content;
            }
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Surgically injected waves into ${file}`);
    }
});
console.log('Update complete.');

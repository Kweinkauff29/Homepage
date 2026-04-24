const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const finalWaveCode = `
<div id="ccor-waves-bg" aria-hidden="true" style="position: fixed; inset: 0; z-index: -9999; pointer-events: none; opacity: 0.3; overflow: hidden; background: #ffffff;">
  <div class="ccor-wave-container ccor-ribbon-bottom" style="position: absolute; inset: 0;"></div>
  <div class="ccor-wave-container ccor-ribbon-center" style="position: absolute; inset: 0;"></div>
  <div class="ccor-wave-container ccor-ribbon-top" style="position: absolute; inset: 0; transform: rotate(180deg);"></div>
</div>
<style>
  @keyframes ribbonFlow {
    0% { background-position: 0% 0; }
    100% { background-position: 400% 0; }
  }
  .ccor-wave {
    position: absolute;
    width: 300%;
    height: 350px;
    left: -100%;
    background: linear-gradient(120deg, #1B449D 0%, #2e5ab8 8%, #3d6cd1 16%, #64BAB0 24%, #8dd4ca 32%, #a6e1d9 40%, #D4AC6C 48%, #e8c88a 56%, #f2dcb3 64%, #5B5A5C 72%, #7a7a7a 80%, #64BAB0 88%, #4da69a 94%, #1B449D 100%);
    background-size: 400% 100%;
    animation: ribbonFlow 15s ease-in-out infinite alternate;
    border-radius: 42% 45% 40% 43%;
    filter: blur(1.5px); /* Less feathered, more defined */
    will-change: transform;
    transform-origin: center bottom;
  }
  .ccor-ribbon-bottom .ccor-wave { bottom: -200px; }
  .ccor-ribbon-top .ccor-wave { bottom: -200px; }
  
  /* CENTER SLIVER - SKINNIER & DEFINED */
  .ccor-ribbon-center .ccor-wave { 
    height: 120px; 
    top: 50%; 
    margin-top: -60px;
    opacity: 0.8;
    filter: blur(1px);
  }

  /* MOBILE OPTIMIZATIONS */
  @media (max-width: 768px) {
    .ccor-wave {
      height: 220px;
      width: 400%;
      left: -150%;
    }
    .ccor-ribbon-bottom .ccor-wave { bottom: -120px; }
    .ccor-ribbon-top .ccor-wave { bottom: -120px; }
    .ccor-ribbon-center .ccor-wave { 
      height: 70px; 
      margin-top: -35px;
    }
  }

  /* FORCE TRANSPARENCY ON HOST CONTAINERS */
  html { background-color: #ffffff !important; }
  body, .site, #page, .site-content, #content, .entry-content, .joinber-page, .ber-about, #main, .main-container, .wrapper {
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
            const isCenter = container.classList.contains('ccor-ribbon-center');
            const waveCount = isCenter ? 12 : 8; // More individual bands
            const waves = [];
            for (let i = 0; i < waveCount; i++) {
                const wave = document.createElement('div');
                wave.className = 'ccor-wave';
                wave.style.borderRadius = (38 + Math.random() * 10) + '%';
                // Varying opacity for more "individual" band look
                wave.style.opacity = (isCenter ? 0.4 : 0.3) + (Math.random() * 0.2);
                container.appendChild(wave);
                waves.push({ 
                    el: wave, 
                    phase: Math.random() * Math.PI * 2, 
                    phaseSpeed: (isCenter ? 0.0015 : 0.002) + (Math.random() * 0.004),
                    offset: i * (window.innerWidth < 768 ? 4 : 8) // More spacing between bands
                });
            }
            function animate() {
                const isMobile = window.innerWidth < 768;
                waves.forEach((w, i) => {
                    w.phase += w.phaseSpeed;
                    const drift = Math.sin(w.phase * 0.4) * (isMobile ? 30 : (isCenter ? 100 : 60));
                    const undulation = Math.sin(w.phase) * (isCenter ? 10 : (8 + (i * 3)));
                    
                    let transform;
                    if (isCenter) {
                         // Center waves float with more vertical offset between bands
                         const centerV = undulation + (i - 6) * (isMobile ? 3 : 6);
                         transform = "translateX("+drift+"px) translateY("+(centerV)+"px) rotate("+(Math.cos(w.phase * 0.4) * 2)+"deg) scaleX(1.8)";
                    } else {
                         const totalY = undulation + w.offset;
                         transform = "translateX("+drift+"px) translateY("+(-totalY)+"px) rotate("+(Math.cos(w.phase * 0.6) * 3)+"deg) scaleX("+ (isMobile ? 1.8 : 1.4) +")";
                    }
                    w.el.style.transform = transform;
                });
                requestAnimationFrame(animate);
            }
            animate();
        });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initCcorWaves); }
    else { initCcorWaves(); }
  })();
</script>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Scrub Previous
        content = content.replace(/<div id="ccor-waves-bg"[\s\S]*?<\/script>/gi, '');
        content = content.replace(/<style>[\s\S]*?(ccor-wave|ribbonFlow|FORCE TRANSPARENCY)[\s\S]*?<\/style>/gi, '');
        
        // Inject surgically near the end of body
        const bodyEndMatch = content.match(/<\/body>/i);
        if (bodyEndMatch) {
            content = content.replace(bodyEndMatch[0], "\n" + finalWaveCode.trim() + "\n" + bodyEndMatch[0]);
        } else {
            content = content.trim() + "\n\n" + finalWaveCode.trim();
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated DEFINED waves with more bands for ${file}`);
    }
});
console.log('Update complete.');

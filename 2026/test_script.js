const fs = require('fs');
const path = require('path');

const file = 'AboutPage.html';
const directoryPath = __dirname;
let content = fs.readFileSync(path.join(directoryPath, file), 'utf8');

const waveCSSAndHTML = `\n<style>
  :root {
    --ccor-blue: #1B449D;
    --ccor-teal: #64BAB0;
    --ccor-gold: #D4AC6C;
    --ccor-grey: #5B5A5C;
  }
  @keyframes ribbonFlowBg {
    0% { background-position: 0% 0; }
    100% { background-position: 400% 0; }
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
    bottom: -320px;
    left: -20%;
    width: 200%;
    height: 600px;
    background: linear-gradient(120deg, var(--ccor-blue) 0%, #2e5ab8 8%, #3d6cd1 16%, var(--ccor-teal) 24%, #8dd4ca 32%, #a6e1d9 40%, var(--ccor-gold) 48%, #e8c88a 56%, #f2dcb3 64%, var(--ccor-grey) 72%, #7a7a7a 80%, var(--ccor-teal) 88%, #4da69a 94%, var(--ccor-blue) 100%);
    background-size: 400% 100%;
    animation: ribbonFlowBg 15s ease-in-out infinite alternate;
    border-radius: 45% 48% 43% 47%;
    opacity: 0.12;
    filter: blur(2px);
    will-change: transform, filter;
    transform-origin: center bottom;
  }
  .ber-global-wave-bg .ber-wave:nth-child(1) { opacity: 0.08; animation-duration: 20s; }
  .ber-global-wave-bg .ber-wave:nth-child(2) { opacity: 0.10; animation-duration: 24s; animation-delay: -4s; }
  .ber-global-wave-bg .ber-wave:nth-child(3) { opacity: 0.12; animation-duration: 28s; animation-delay: -8s; }
  .ber-global-wave-bg .ber-wave:nth-child(4) { opacity: 0.14; animation-duration: 32s; animation-delay: -12s; }
</style>
<div class="ber-global-wave-bg" aria-hidden="true">
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
  <div class="ber-wave"></div>
</div>\n`;

// 1. Color replacements
content = content.replace(/#0CA7A4|#008080|#05AAE1|(?<=[="':;\\s])teal(?=[;"'\\s\\}])/gi, "#64BAB0");
content = content.replace(/#004D4D|(?<=[="':;\\s])darkblue(?=[;"'\\s\\}])/gi, "#1B449D");
content = content.replace(/#F2BE22|#FFC24A/gi, "#D4AC6C");

// Font replacement
content = content.replace(/['"]?Roboto['"]?/gi, "'Inter'");
content = content.replace(/['"]?Oswald['"]?/gi, "'Inter'");

// 2. Strict text replacement (outside tags)
let modifiedHtml = '';
let insideTag = false;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '<') {
        insideTag = true;
        modifiedHtml += content[i];
    } else if (content[i] === '>') {
        insideTag = false;
        modifiedHtml += content[i];
    } else {
        if (insideTag) {
            modifiedHtml += content[i];
        } else {
            let textNode = '';
            while (i < content.length && content[i] !== '<') {
                textNode += content[i];
                i++;
            }
            
            let updatedText = textNode;
            
            // Name changes
            updatedText = updatedText.replace(/Bonita Springs[-&\\s]*Estero REALTORS®?/gi, "Coconut Coast Organization of Realtors®");
            updatedText = updatedText.replace(/Bonita Springs\\s*[-&]?\\s*Estero Realtors/gi, "Coconut Coast Organization of Realtors");
            updatedText = updatedText.replace(/\\bBER's\\b/g, "CCOR's");
            updatedText = updatedText.replace(/\\bBER\\b/g, "CCOR");
            
            modifiedHtml += updatedText;
            if (i < content.length) {
                modifiedHtml += '<';
                insideTag = true;
            }
        }
    }
}

content = modifiedHtml;

// 3. Inject Wave div
if (!content.includes('ber-global-wave-bg')) {
    const bodyMatch = content.match(/<body[^>]*>/i);
    // If we find a body tag, append inside body.
    if (bodyMatch) {
        content = content.replace(bodyMatch[0], bodyMatch[0] + waveCSSAndHTML);
    } else {
        // If there's no body tag (e.g. modular partial), append at top.
        content = waveCSSAndHTML + content;
    }
}

fs.writeFileSync(path.join(directoryPath, 'AboutPage_test.html'), content, 'utf8');
console.log('Test file written to AboutPage_test.html');

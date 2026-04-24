const fs = require('fs');

let content = fs.readFileSync('AboutPage.html', 'utf8');

// Global Name Replacement (handles various hyphens and spaces)
content = content.replace(/Bonita Springs[–‑-]Estero REALTORS/g, 'Coconut Coast Organization of Realtors');

// Add Mariam and Update Jenna
const teamEndTag = '<!-- Left column from your image -->'; // Just before the grid ends or committees start
const jennaStart = '<div class="name">Jenna Ripley</div>';

// Update Jenna's Role
content = content.replace(jennaStart + '\n            <div class="role">Membership and Operations Director', jennaStart + '\n            <div class="role">Director of Executive Operations');

// Add Mariam after Erica (Erica is the last one usually)
const ericaEnd = '<!-- /Erica Card -->'; // I'll search for Erica's closing article tag
const ericaBlockMatch = content.match(/<div class="name">Erica Bernhardt<\/div>[\s\S]*?<\/article>/);

if (ericaBlockMatch) {
    const mariamBlock = `
        <article class="ber-person">
          <div class="placeholder-img" style="aspect-ratio: 1/1; background: #f0f0f0; display: grid; place-items: center; color: #aaa; font-weight: 700; font-size: 2rem;">MA</div>
          <div class="meta">
            <div class="name">Mariam Abdallah</div>
            <div class="role">Director of Member Experience · <a href="mailto:Membership@BERealtors.org">Membership@BERealtors.org</a> · <a href="tel:+12399926771;ext=1">(239) 992‑6771 ext. 1</a></div>
          </div>
        </article>`;
    content = content.replace(ericaBlockMatch[0], ericaBlockMatch[0] + mariamBlock);
}

fs.writeFileSync('AboutPage.html', content);
console.log('Updated AboutPage with new staff and branding fixes.');

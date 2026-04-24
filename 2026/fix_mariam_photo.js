const fs = require('fs');
let content = fs.readFileSync('AboutPage.html', 'utf8');

const target = /<article class="ber-person">\s*<div class="meta">\s*<div class="name">Mariam Abdallah<\/div>/;
const replacement = `<article class="ber-person">
          <img loading="lazy" decoding="async"
            src="https://coconutcoastrealtors.org/wp-content/uploads/2026/04/Facetune_17-04-2026-14-16-54.jpg"
            alt="Headshot of Mariam Abdallah">
          <div class="meta">
            <div class="name">Mariam Abdallah</div>`;

if (target.test(content)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('AboutPage.html', content);
    console.log('Successfully updated Mariam\'s photo.');
} else {
    console.log('Target block for Mariam not found.');
}

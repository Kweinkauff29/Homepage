const fs = require('fs');

let content = fs.readFileSync('AboutPage.html', 'utf8');

// Flexible replace for Jenna's role
content = content.replace(/<div class="role">Membership and Operations Director[\s\S]*?ext\. 5<\/a><\/div>/, 
    `<div class="role">Director of Executive Operations · <a href="mailto:operations@berealtors.org">operations@berealtors.org</a> · <a href="tel:+12399926771;ext=5">(239) 992‑6771 ext. 5</a></div>`);

// Flexible replace for Home Foundation
content = content.replace(/Bonita Springs[–‑-]Estero[\s\S]*?REALTORS<sup>®<\/sup> Home Foundation/g, 
    'Coconut Coast Organization of Realtors<sup>®</sup> Home Foundation');

// Flexible replace for 3-way membership
content = content.replace(/Bonita Springs[–‑-]Estero[\s\S]*?REALTORS<sup>®<\/sup> \(BER\)/g, 
    'Coconut Coast Organization of Realtors<sup>®</sup> (CCOR)');

fs.writeFileSync('AboutPage.html', content);
console.log('Final branding and staff roles updated.');

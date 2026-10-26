'use strict';

const fs = require('fs');
const path = require('path');

for (const filename of [
    path.join('..', '..', 'license-checker', 'index.html'),
    path.join('..', '..', 'LicenseChecker.html'),
]) {
    const fullPath = path.join(__dirname, filename);
    const html = fs.readFileSync(fullPath, 'utf8');
    const match = html.match(/<script>\s*([\s\S]*?)<\/script>/);
    if (!match) throw new Error(`Inline script missing: ${filename}`);
    Function(match[1]);
    console.log(`Inline script OK: ${filename}`);
}

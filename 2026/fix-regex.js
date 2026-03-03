const fs = require('fs');
let content = fs.readFileSync('AFFILIATEDIRECTORY.html', 'utf8');

const html = fs.readFileSync('build-tiles.js', 'utf8').match(/let html = \`([\s\S]*?)\`;/)[1];

const regex = /<div class="category-tiles" id="categoryTiles">[\s\S]*?<\/div>\n            <\/div>\n\n            <div id="loadingContainer"/;
content = content.replace(regex, html + '\n            </div>\n\n            <div id="loadingContainer"');

fs.writeFileSync('AFFILIATEDIRECTORY.html', content);
console.log('Fixed replacement!');

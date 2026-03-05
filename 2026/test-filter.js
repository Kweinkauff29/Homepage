const fs = require('fs');

const code = fs.readFileSync('AFFILIATEDIRECTORY.html', 'utf8');
const search = `const ITEMS_PER_PAGE`;
const idx = code.indexOf(search);
if (idx > -1) {
    console.log(code.substring(idx - 100, idx + 100));
}

const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

files.forEach(file => {
    if (path.extname(file) === '.html' && file !== 'AboutPage_test.html') {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        // Color and Font Replacements
        content = content.replace(/#0CA7A4|#008080|#05AAE1|(?<=[="':;\\s])teal(?=[;"'\\s\\}])/gi, "#64BAB0");
        content = content.replace(/#004D4D|(?<=[="':;\\s])darkblue(?=[;"'\\s\\}])/gi, "#1B449D");
        content = content.replace(/#F2BE22|#FFC24A/gi, "#D4AC6C");
        content = content.replace(/['"]?Roboto['"]?/gi, "'Inter'");
        content = content.replace(/['"]?Oswald['"]?/gi, "'Inter'");

        // Text Replacements globally
        content = content.replace(/Bonita Springs[-&\\s]+Estero REALTORS®?/gi, "Coconut Coast Organization of Realtors®");
        content = content.replace(/Bonita\s+Springs[-&\\s]+Estero\s+Realtors/gi, "Coconut Coast Organization of Realtors");
        content = content.replace(/Bonita Springs\s+Estero\s+Realtors/gi, "Coconut Coast Organization of Realtors");
        
        content = content.replace(/(?<![\\/\\-\\.])\\bBER's\\b(?![\\/\\-\\.a-zA-Z])/g, "CCOR's");
        content = content.replace(/(?<![\\/\\-\\.])\\bBER\\b(?![\\/\\-\\.a-zA-Z])/g, "CCOR");

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Branded ${file}`);
    }
});

console.log('Update complete.');

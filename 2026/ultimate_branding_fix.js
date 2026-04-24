const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

// Target Acronyms to replace with CCOR
const acronyms = ['BER', 'BSER', 'BEAR'];

files.forEach(file => {
    if (path.extname(file) === '.html') {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        // 1. Protect Home Foundation mentions (keep them exactly as they are)
        const foundations = [];
        const foundationRegex = /(Bonita Springs[–‑-]Estero[\s\S]*?REALTORS(?:<sup>®<\/sup>)? Home Foundation|Coconut Coast Organization of Realtors(?:<sup>®<\/sup>)? Home Foundation|BER Home Foundation|BSER Home Foundation|BEAR Home Foundation)/gi;
        
        content = content.replace(foundationRegex, (match) => {
            foundations.push(match);
            return `__FND_PROT_${foundations.length - 1}__`;
        });

        // 2. Surgical Replace for standalone acronyms
        acronyms.forEach(acr => {
            const regex = new RegExp(`(?<![\\/\\.=@"'])\\b${acr}\\b(?![\\/\\.])`, 'g');
            content = content.replace(regex, 'CCOR');
        });

        // 3. Restore protected Foundation mentions
        content = content.replace(/__FND_PROT_(\d+)__/g, (match, id) => {
            return foundations[parseInt(id)];
        });

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Branding cleanup complete for ${file}`);
    }
});
console.log('Global branding cleanup finalized.');

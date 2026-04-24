const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;
const files = fs.readdirSync(directoryPath);

const bannerCode = `
<div id="ccor-rebrand-banner" style="background: #FFF9C4; color: #856404; text-align: center; padding: 10px 20px; font-size: 14px; font-family: 'Inter', sans-serif; font-weight: 500; line-height: 1.4; border-bottom: 1px solid #ffeeba; position: relative; z-index: 1000000;">
    Coconut Coast Organization of REALTORS (formerly Bonita Springs-Estero REALTORS), pending official state approval.
</div>
`;

files.forEach(file => {
    if (path.extname(file) === '.html' && !file.includes('test')) {
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Remove existing banner if already present
        content = content.replace(/<div id="ccor-rebrand-banner"[\s\S]*?<\/div>/gi, '');
        
        // Inject surgically at the top of body
        const bodyMatch = content.match(/<body[^>]*>/i);
        if (bodyMatch) {
            content = content.replace(bodyMatch[0], bodyMatch[0] + "\n" + bannerCode.trim());
        } else {
            // Fragment or no body tag, prepend to content
            content = bannerCode.trim() + "\n" + content;
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Added rebrand banner to ${file}`);
    }
});
console.log('Update complete.');

const fs = require('fs');
const path = require('path');

const bannerCode = `
<div id="ccor-rebrand-banner" style="background: #FFF9C4; color: #856404; text-align: center; padding: 10px 20px; font-size: 14px; font-family: 'Inter', sans-serif; font-weight: 500; line-height: 1.4; border-bottom: 1px solid #ffeeba; position: relative; z-index: 1000000;">
    Coconut Coast Organization of REALTORS (formerly Bonita Springs-Estero REALTORS), pending official state approval.
</div>
`;

// 1. Remove from 2026 directory
const dir2026 = path.join(__dirname, '2026');
if (fs.existsSync(dir2026)) {
    fs.readdirSync(dir2026).forEach(file => {
        if (file.endsWith('.html')) {
            const fullPath = path.join(dir2026, file);
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/<div id="ccor-rebrand-banner"[\s\S]*?<\/div>/gi, '');
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    });
    console.log('Removed banner from all files in 2026/');
}

// 2. Add to archive/HeaderTest2026.html ONLY
const headerTestPath = path.join(__dirname, 'archive', 'HeaderTest2026.html');
if (fs.existsSync(headerTestPath)) {
    let content = fs.readFileSync(headerTestPath, 'utf8');
    // Scrub first
    content = content.replace(/<div id="ccor-rebrand-banner"[\s\S]*?<\/div>/gi, '');
    
    // Inject at top (HeaderTest2026 is often a full HTML)
    const bodyMatch = content.match(/<body[^>]*>/i);
    if (bodyMatch) {
        content = content.replace(bodyMatch[0], bodyMatch[0] + "\n" + bannerCode.trim());
    } else {
        content = bannerCode.trim() + "\n" + content;
    }
    fs.writeFileSync(headerTestPath, content, 'utf8');
    console.log('Added banner only to archive/HeaderTest2026.html');
} else {
    console.log('archive/HeaderTest2026.html not found!');
}

const fs = require('fs');

const generated = {
    'Accounting & Finance': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_accounting_1772494844198.png',
    'Air Conditioning': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_ac_1772494859405.png',
    'Appraisal': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_appraisal_1772494870976.png',
    'Education & Coaching': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_education_1772494885121.png',
    'Construction & Renovation': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_construction_1772494898413.png',
    'Pest Control & Environmental': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_pest_control_1772494925486.png',
    'Home Furnishings': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_furnishings_1772494942024.png',
    'Home Watch': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_home_watch_1772494953337.png',
    'Internet Solutions': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_internet_1772494965703.png',
    'Marketing/Advertising': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_marketing_1772494978184.png',
    'Moving/Packing': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_moving_1772495010926.png',
    'Title Company': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/title_company_tile_1772487464612.png',
    'Mortgage Lender': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/mortgage_tile_1772487478318.png',
    'Home Inspector': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/home_inspection_tile_1772487491372.png',
    'Lawyer/Attorney': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/lawyer_tile_1772487518574.png',
    'Insurance': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/insurance_tile_1772487530889.png',
    'Photography/Drone': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/photography_tile_1772487542157.png'
};

const metaGroups = [
    { name: "Title & Escrow", image: generated['Title Company'] },
    { name: "Mortgage & Finance", image: generated['Mortgage Lender'] },
    { name: "Legal & Insurance", image: generated['Lawyer/Attorney'] },
    { name: "Property Inspections", image: generated['Home Inspector'] },
    { name: "Construction & Roofing", image: generated['Construction & Renovation'] },
    { name: "Home Maintenance", image: generated['Air Conditioning'] },
    { name: "Moving & Interiors", image: generated['Moving/Packing'] },
    { name: "Marketing & Technology", image: generated['Photography/Drone'] },
    { name: "Lifestyle & Property", image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600' }
];

let html = `<div class="category-tiles" id="categoryTiles">\n`;
metaGroups.forEach(cat => {
    html += `  <div class="category-tile" onclick="selectTileCategory('${cat.name}', this)" style="background-image: url('${cat.image}')">\n`;
    html += `    <div class="category-tile-label">${cat.name}</div>\n`;
    html += `  </div>\n`;
});
html += `</div>`;

let content = fs.readFileSync('AFFILIATEDIRECTORY.html', 'utf8');

const regex = /<div class="category-tiles" id="categoryTiles">[\s\S]*?<\/div>(\s*<div class="directory-container">)/;
content = content.replace(regex, html + '$1');

fs.writeFileSync('AFFILIATEDIRECTORY.html', content);
console.log('Replaced 9 category tiles!');

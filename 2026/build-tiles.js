const categories = [
    'Accountant', 'Air Conditioning', 'Appliances', 'Appraisers', 'Association Only',
    'Bank', 'Coaching', 'Construction', 'Contractor', 'Country Clubs',
    'Disinfecting/Odor Removal', 'Exterminators', 'Home Builder', 'Home Furnishings',
    'Home Inspector', 'Home Watch', 'Insurance', 'Internet Solutions', 'Lawyer/Attorney',
    'Marketing/Advertising', 'Mold/Radon', 'Mortgage Lender', 'Moving/Packing', 'Painter',
    'Photography/Drone', 'Plumbing', 'Real Estate Schools', 'Renovation', 'Rentals',
    'Roofing', 'Title Company', 'Transaction Services', 'Vacation Rentals', 'Wealth Management',
    'Wifi', 'Windows/Shutters'
];

const generated = {
    'Accounting & Finance': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_accounting_1772494844198.png',
    'Air Conditioning': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_ac_1772494859405.png',
    'Appraisers': '../../.gemini/antigravity/brain/bd420d78-f934-49c5-bb7e-3b805e44668b/tile_appraisal_1772494870976.png',
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

const unsplash = {
    'Appliances': 'https://images.unsplash.com/photo-1584622650111-993a426bfbf0?auto=format&fit=crop&q=80&w=600',
    'Association Only': 'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&q=80&w=600',
    'Country Clubs': 'https://images.unsplash.com/photo-1587174486073-ae5e1ade9cc4?auto=format&fit=crop&q=80&w=600',
    'Painter': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=600',
    'Plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=600',
    'Rentals': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600',
    'Vacation Rentals': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600',
    'Roofing': 'https://images.unsplash.com/photo-1632154942940-06b2eb3a8d11?auto=format&fit=crop&q=80&w=600',
    'Transaction Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600',
    'Windows/Shutters': 'https://images.unsplash.com/photo-1503594384566-461fe158e797?auto=format&fit=crop&q=80&w=600'
};

function getUrl(cat) {
    if (['Accountant', 'Bank', 'Wealth Management'].includes(cat)) return generated['Accounting & Finance'];
    if (['Coaching', 'Real Estate Schools'].includes(cat)) return generated['Education & Coaching'];
    if (['Construction', 'Contractor', 'Home Builder', 'Renovation'].includes(cat)) return generated['Construction & Renovation'];
    if (['Disinfecting/Odor Removal', 'Exterminators', 'Mold/Radon'].includes(cat)) return generated['Pest Control & Environmental'];
    if (['Internet Solutions', 'Wifi'].includes(cat)) return generated['Internet Solutions'];

    if (generated[cat]) return generated[cat];
    if (unsplash[cat]) return unsplash[cat];

    return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600'; // Default business image
}

let html = `<div class="category-tiles" id="categoryTiles">\n`;
categories.forEach(cat => {
    html += `  <div class="category-tile" onclick="selectTileCategory('${cat}', this)" style="background-image: url('${getUrl(cat)}')">\n`;
    html += `    <div class="category-tile-label">${cat}</div>\n`;
    html += `  </div>\n`;
});
html += `</div>`;

const fs = require('fs');
let content = fs.readFileSync('AFFILIATEDIRECTORY.html', 'utf8');

const regex = /<div class="category-tiles" id="categoryTiles">[\s\S]*?<\/div>(\s*<div class="directory-container">)/;
content = content.replace(regex, html + '$1');

fs.writeFileSync('AFFILIATEDIRECTORY.html', content);
console.log('Replaced content!');

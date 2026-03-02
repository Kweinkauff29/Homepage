const https = require('https');

const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJsonText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function tryParse(text) {
    try { return JSON.parse(text); } catch { return null; }
}

async function run() {
    try {
        console.log("Fetching 500 contacts...");
        const text = await fetchJsonText(`${BASE_URL}/api/contacts?$top=500`);
        const response = tryParse(text);
        if (!response) return console.log("Failed to parse", text.substring(0, 500));

        const contacts = response.Results || response.Items || response.Data || [];

        let affiliates = [];

        for (const c of contacts) {
            // GrowthZone usually indicates membership type or custom type.
            const str = JSON.stringify(c).toLowerCase();
            if (str.includes('affiliate')) {
                affiliates.push(c);
            }
        }

        console.log(`Found ${affiliates.length} contacts containing 'affiliate' out of ${contacts.length} total.`);

        if (affiliates.length > 0) {
            console.log("== Example Affiliate ==");
            console.log(affiliates[0]);
        } else {
            console.log("\nTrying to fetch categories/lists endpoint...");
            const catsText = await fetchJsonText(`${BASE_URL}/api/categories`);
            const cats = tryParse(catsText);
            if (cats) console.log("Categories found:", cats.length || cats.Results?.length);

            const dirsText = await fetchJsonText(`${BASE_URL}/api/directories`);
            console.log("Directories response parsed:", !!tryParse(dirsText));
            // try printing directories
            const dirsObj = tryParse(dirsText);
            if (dirsObj) {
                const dirs = dirsObj.Results || dirsObj.Items || dirsObj.Data || dirsObj || [];
                console.log("Directories:", JSON.stringify(dirs, null, 2));
            }
        }

    } catch (e) { console.error(e); }
}

run();

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
        console.log("Fetching a large batch of Memberships to scan 'Type'...");
        const text = await fetchJsonText(`${BASE_URL}/api/memberships/all?$top=5000`);
        const data = tryParse(text);
        if (!data) return console.log("Failed to parse");

        const results = data.Results || data.Items || [];
        console.log(`Fetched ${results.length} memberships.`);

        const types = new Set();
        const affiliateIds = new Set();

        for (const m of results) {
            types.add(m.Type);
            if ((m.Type || "").toLowerCase().includes("affiliate")) {
                affiliateIds.add(m.MembershipId);
            }
        }

        console.log("All distinct membership 'Type's found:");
        types.forEach(t => console.dir(t));

        console.log(`\nFound ${affiliateIds.size} memberships matching 'affiliate'.`);

    } catch (e) { console.error(e); }
}

run();

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
        console.log("Fetching up to 100 Business Contacts (Type 2)...");
        const text = await fetchJsonText(`${BASE_URL}/api/contacts?$filter=SystemContactTypeId eq 2&$top=100`);
        const data = tryParse(text);
        if (!data) return console.log("Failed to parse", text.substring(0, 100));

        const results = data.Results || data.Items || [];
        console.log(`Fetched ${results.length} business contacts.`);

        for (const c of results) {
            console.log(c.Name, "| Status:", c.Status, "| MembershipStatusTypeId:", c.MembershipStatusTypeId);
        }
    } catch (e) { console.error(e); }
}

run();

const https = require('https');

const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log("Fetching contacts to check for Affiliates...");
        // Let's pull 50 records and see if we can identify what makes an Affiliate vs a Realtor
        const response = await fetchJson(`${BASE_URL}/api/contacts?$top=50`);
        const contacts = response.Results || response.Items || response.Data || [];

        let affiliates = [];
        let others = [];

        for (const c of contacts) {
            const str = JSON.stringify(c).toLowerCase();
            if (str.includes('affiliate')) {
                affiliates.push(c);
            } else {
                others.push(c);
            }
        }

        console.log(`Found ${affiliates.length} potential affiliates and ${others.length} others out of ${contacts.length} total.`);

        if (affiliates.length > 0) {
            console.log("== Example Affiliate ==");
            console.log(affiliates[0]);
        }

        if (others.length > 0) {
            console.log("== Example Other ==");
            console.log(others[0]);
        }

        console.log("\nFetching Lists/Categories...");
        try {
            const listsObj = await fetchJson(`${BASE_URL}/api/lists`);
            console.log("Lists response keys:", Object.keys(listsObj));
            const listItems = listsObj.Results || listsObj.Items || listsObj.Data || [];
            for (const l of listItems) {
                if (JSON.stringify(l).toLowerCase().includes('affiliate')) {
                    console.log(`List: ${l.Name || l.Title} (ID: ${l.Id || l.ListId})`);
                }
            }
        } catch (e) {
            console.log("Could not fetch lists. Error:", e.message);
        }

    } catch (e) { console.error(e); }
}

run();

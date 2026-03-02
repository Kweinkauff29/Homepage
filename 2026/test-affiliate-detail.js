const https = require('https');

const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        const id = 4163761; // 1031 Exchange Connection

        console.log("Fetching Contact...");
        const contact = await fetchJson(`${BASE_URL}/api/contacts/${id}`);
        console.log(contact);

        console.log("\nFetching MoreInfo...");
        const moreinfo = await fetchJson(`${BASE_URL}/api/contacts/${id}/moreinfo`);
        console.log(JSON.stringify(moreinfo, null, 2));

        console.log("\nFetching OrgGeneral...");
        const orgGeneral = await fetchJson(`${BASE_URL}/api/contacts/${id}/OrgGeneral`);
        console.log(JSON.stringify(orgGeneral, null, 2));

    } catch (e) { console.error(e); }
}

run();

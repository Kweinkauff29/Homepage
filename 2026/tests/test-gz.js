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
        console.log("Fetching a few contacts...");
        const response = await fetchJson(`${BASE_URL}/api/contacts?$top=5`);
        const contacts = Array.isArray(response) ? response : (response.Results || response.Items || response.Data || []);
        console.log(`Found ${contacts.length} contacts.`);

        for (const c of contacts) {
            console.log(`\n\n=== Contact: ${c.FirstName} ${c.LastName} (ID: ${c.ContactId}) ===`);
            console.log("BASE CONTACT FIELDS =>");
            console.log(Object.keys(c).filter(k => {
                const val = c[k];
                if (typeof val === 'string' && val.toLowerCase().includes('realtor')) return true;
                if (k.toLowerCase().includes('nrds')) return true;
                if (k.toLowerCase().includes('realtor')) return true;
                return false;
            }).map(k => `${k}: ${c[k]}`));

            const moreinfo = await fetchJson(`${BASE_URL}/api/contacts/${c.ContactId}/moreinfo`);
            console.log("MOREINFO => ");
            if (moreinfo && moreinfo.Fields) {
                console.log(moreinfo.Fields.filter(f => {
                    const n = (f.DisplayName || "").toLowerCase();
                    const v = (f.Value || "").toLowerCase();
                    return true; // Just print all to see what's there
                }).map(f => `${f.DisplayName}: ${f.Value}`));
            }

            const org = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${c.ContactId}`);
            console.log("ORG GENERAL LINKS => ");
            if (org && org.WebPage) console.log("WebPage:", org.WebPage);
            if (org && org.SocialNetworkLinks) console.log("Social:", org.SocialNetworkLinks);
        }
    } catch (e) { console.error(e); }
}

run();

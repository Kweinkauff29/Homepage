const API_KEY = process.env.GZ_API_KEY;
if (!API_KEY) {
  throw new Error('Set GZ_API_KEY in the process environment before running this diagnostic.');
}
const BASE_URL = 'https://coconutcoastrealtors.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Searching for 'Heights Title'...");
        let skip = 0;
        const PAGE = 2000;
        let found = null;

        while (true) {
            const data = await fetchJson(`${BASE_URL}/api/contacts?$skip=${skip}&$top=${PAGE}`);
            if (!data || !data.Results || data.Results.length === 0) break;
            found = data.Results.find(c => c.Name.includes('Heights Title'));
            if (found) break;
            skip += data.Results.length;
            if (skip >= data.TotalRecordAvailable) break;
        }

        if (!found) return console.log("Heights Title not found.");

        console.log(`Found: ${found.Name} (ID: ${found.ContactId})`);
        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${found.ContactId}`);
        console.log("Categories:", JSON.stringify(orgGen?.Categories, null, 2));

    } catch (e) { console.error(e); }
}

run();

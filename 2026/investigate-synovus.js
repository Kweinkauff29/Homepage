const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Searching for 'Synovus Bank'...");
        const searchRes = await fetchJson(`${BASE_URL}/api/contacts?$filter=contains(Name, 'Synovus Bank')`);
        const contacts = searchRes.Results || searchRes.Items || [];

        if (contacts.length === 0) return console.log("Company not found.");

        for (const c of contacts) {
            console.log(`\n=== Found: ${c.Name} (ID: ${c.ContactId}) ===`);

            // 1. Check /categories sub-endpoint
            const cats = await fetchJson(`${BASE_URL}/api/contacts/${c.ContactId}/categories`);
            console.log("Categories Endpoint:", JSON.stringify(cats, null, 2));

            // 2. Check /OrgGeneral (where committees are for individuals)
            const orgGen = await fetchJson(`${BASE_URL}/api/contacts/${c.ContactId}/OrgGeneral`);
            console.log("OrgGeneral Endpoint:", JSON.stringify(orgGen, null, 2));

            // 3. Check /moreinfo (custom fields)
            const moreInfo = await fetchJson(`${BASE_URL}/api/contacts/${c.ContactId}/moreinfo`);
            console.log("MoreInfo (first 5 fields):", JSON.stringify(moreInfo?.Fields?.slice(0, 5), null, 2));
        }
    } catch (e) { console.error(e); }
}

run();

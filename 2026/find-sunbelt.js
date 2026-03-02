const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Searching for 'Sunbelt Title Agency'...");
        let skip = 0;
        const PAGE = 2000;
        let found = null;

        while (true) {
            const data = await fetchJson(`${BASE_URL}/api/contacts?$skip=${skip}&$top=${PAGE}`);
            if (!data || !data.Results || data.Results.length === 0) break;

            found = data.Results.find(c => c.Name.includes('Sunbelt Title'));
            if (found) break;

            skip += data.Results.length;
            if (skip >= data.TotalRecordAvailable) break;
        }

        if (!found) return console.log("Sunbelt Title Agency not found.");

        console.log(`Found: ${found.Name} (ID: ${found.ContactId})`);
        const id = found.ContactId;

        // Try the known working pattern for OrgGeneral
        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${id}`);
        console.log("\nOrgGeneral Result:", JSON.stringify(orgGen, null, 2));

        // Try moreinfo
        const moreInfo = await fetchJson(`${BASE_URL}/api/contacts/${id}/moreinfo`);
        console.log("\nMoreInfo Fields:", JSON.stringify(moreInfo?.Fields?.filter(f => f.Value), null, 2));

    } catch (e) { console.error(e); }
}

run();

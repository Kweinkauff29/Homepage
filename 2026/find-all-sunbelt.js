const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Searching for all 'Sunbelt' contacts...");
        let skip = 0;
        const PAGE = 5000;
        let allResults = [];

        while (true) {
            const data = await fetchJson(`${BASE_URL}/api/contacts?$skip=${skip}&$top=${PAGE}`);
            if (!data || !data.Results || data.Results.length === 0) break;

            const found = data.Results.filter(c => c.Name.includes('Sunbelt'));
            allResults = allResults.concat(found);

            skip += data.Results.length;
            if (skip >= data.TotalRecordAvailable) break;
        }

        console.log(`Found ${allResults.length} Sunbelt results:`);
        allResults.forEach(c => console.log(`${c.Name} (ID: ${c.ContactId}) | Status: ${c.Status} | Type: ${c.SystemContactTypeId}`));

    } catch (e) { console.error(e); }
}

run();

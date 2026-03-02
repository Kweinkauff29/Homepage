const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Fetching contacts to find 'Synovus Bank'...");
        let skip = 0;
        const PAGE = 5000;
        let found = null;

        while (true) {
            const data = await fetchJson(`${BASE_URL}/api/contacts?$skip=${skip}&$top=${PAGE}`);
            if (!data || !data.Results || data.Results.length === 0) break;

            found = data.Results.find(c => c.Name.includes('Synovus Bank'));
            if (found) break;

            skip += data.Results.length;
            if (skip >= data.TotalRecordAvailable) break;
        }

        if (!found) return console.log("Synovus Bank not found in database.");

        console.log(`Found: ${found.Name} (ID: ${found.ContactId})`);
        const id = found.ContactId;

        const cats = await fetchJson(`${BASE_URL}/api/contacts/${id}/categories`);
        console.log("Categories:", JSON.stringify(cats, null, 2));

        const moreInfo = await fetchJson(`${BASE_URL}/api/contacts/${id}/moreinfo`);
        console.log("MoreInfo Fields:", JSON.stringify(moreInfo?.Fields?.filter(f => f.Value), null, 2));

    } catch (e) { console.error(e); }
}

run();

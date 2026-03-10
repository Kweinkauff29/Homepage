const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Fetching up to 5000 memberships...");
        const memData = await fetchJson(`${BASE_URL}/api/memberships/all?$top=5000`);
        const memberships = memData.Results || memData.Items || [];

        let affiliateIds = new Set();
        for (const m of memberships) {
            if ((m.Type || "").toLowerCase().includes('affiliate')) {
                affiliateIds.add(m.ContactId);
            }
        }

        console.log("\nFetching ALL Contacts...");
        let allContacts = [];
        let skip = 0;
        const PAGE = 5000;
        while (true) {
            const data = await fetchJson(`${BASE_URL}/api/contacts?$skip=${skip}&$top=${PAGE}`);
            if (!data || !data.Results || data.Results.length === 0) break;
            allContacts = allContacts.concat(data.Results);
            skip += data.Results.length;
            if (skip >= (data.TotalRecordAvailable || Array.MAX_SAFE_INTEGER)) break;
        }

        const matchingContacts = allContacts.filter(c => affiliateIds.has(c.ContactId) && c.Status === 'Active');
        console.log(`Found ${matchingContacts.length} matching ACTIVE Contacts out of ${allContacts.length}.`);

        const businesses = matchingContacts.filter(c => c.SystemContactTypeId === 2);
        console.log(`Of those, ${businesses.length} are Businesses.`);

        const sample = businesses.slice(0, 3);
        if (sample.length === 0) sample.push(...matchingContacts.slice(0, 3));

        for (const c of sample) {
            console.log(`\n=== PROFILE FOR ${c.Name} ===`);
            console.log(`ContactType: ${c.SystemContactTypeId === 2 ? 'Business' : 'Individual'}`);
            console.log(`Phone: ${c.Phone} | Email: ${c.EmailAddress}`);

            // Check categories via the API
            const cats = await fetchJson(`${BASE_URL}/api/contacts/${c.ContactId}/categories`);
            let catArr = cats?.Results || cats?.Items || cats || [];
            if (!Array.isArray(catArr)) catArr = [];
            if (c.Categories) catArr = catArr.concat(c.Categories);

            console.log("Categories:", catArr.map(cat => cat.CategoryName || cat.Name).join(", "));
        }
    } catch (e) { console.error(e); }
}

run();

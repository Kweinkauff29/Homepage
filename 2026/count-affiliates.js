const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        const AFFILIATE_TYPE_IDS = [10172, 10173, 10503, 23411, 56858, 56859, 56861, 56862, 56863];

        console.log("Fetching memberships for all affiliate types...");
        const affiliateContactIds = new Set();

        for (const tid of AFFILIATE_TYPE_IDS) {
            let skip = 0;
            while (true) {
                const url = `${BASE_URL}/api/memberships/all?$skip=${skip}&$top=2000`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + API_KEY },
                    body: JSON.stringify({ MembershipTypeId: tid })
                });
                if (!res.ok) break;
                const data = await res.json();
                const results = data.Results || [];
                if (results.length === 0) break;

                results.forEach(m => {
                    if (m.Status === 'Active') affiliateContactIds.add(m.ContactId);
                });
                skip += results.length;
                if (skip >= data.TotalRecordAvailable) break;
            }
        }

        console.log(`Unique Active Affiliate ContactIds: ${affiliateContactIds.size}`);

        // Check a sample of 10 to see types
        const ids = Array.from(affiliateContactIds).slice(0, 10);
        for (const id of ids) {
            const c = await fetchJson(`${BASE_URL}/api/contacts/${id}`);
            if (c) console.log(`${c.Name} | Type: ${c.SystemContactTypeId}`);
        }

    } catch (e) { console.error(e); }
}

run();

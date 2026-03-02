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
        const ids = new Set();
        for (const tid of AFFILIATE_TYPE_IDS) {
            const data = await fetchJson(`${BASE_URL}/api/memberships/all?$top=100`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + API_KEY },
                body: JSON.stringify({ MembershipTypeId: tid })
            });
            (data?.Results || []).forEach(m => { if (m.Status === 'Active') ids.add(m.ContactId); });
        }

        const sampleIds = Array.from(ids).slice(0, 30);
        for (const id of sampleIds) {
            const c = await fetchJson(`${BASE_URL}/api/contacts/${id}`);
            const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${id}`);
            const cats = (orgGen?.Categories || []).map(cat => `${cat.CategoryListName}: ${cat.Name}`).join(' | ');
            console.log(`${c?.Name || id} -> ${cats}`);
        }
    } catch (e) { console.error(e); }
}

run();

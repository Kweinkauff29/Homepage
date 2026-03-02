const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'ApiKey=' + API_KEY);
    if (!res.ok) {
        // Fallback to Header version
        const res2 = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
        if (!res2.ok) return null;
        return res2.json();
    }
    return res.json();
}

async function run() {
    try {
        console.log("Fetching memberships to find Type IDs...");
        // Use POST to memberships/all to get type info
        const res = await fetch(`${BASE_URL}/api/memberships/all?$top=1000`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'ApiKey ' + API_KEY
            },
            body: JSON.stringify({})
        });
        const data = await res.json();
        const results = data.Results || data.Items || [];

        const typeMap = new Map();
        for (const m of results) {
            if (m.Type && !typeMap.has(m.Type)) {
                typeMap.set(m.Type, m.MembershipTypeId);
            }
        }

        console.log("Membership Type IDs found:");
        for (const [name, id] of typeMap.entries()) {
            if (name.toLowerCase().includes('affiliate')) {
                console.log(`${name}: ${id}`);
            }
        }
    } catch (e) { console.error(e); }
}

run();

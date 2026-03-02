const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        const data = await fetchJson(`${BASE_URL}/api/memberships/types`);
        if (!data) return console.log("Failed to fetch types");

        const results = Array.isArray(data) ? data : (data.Results || data.Items || []);

        console.log("=== ALL AFFILIATE TYPES ===");
        results.forEach(t => {
            if (t.Name.toLowerCase().includes('affiliate')) {
                console.log(`ID: ${t.MembershipTypeId} | Name: ${t.Name}`);
            }
        });
    } catch (e) { console.error(e); }
}

run();

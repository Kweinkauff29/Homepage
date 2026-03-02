const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Fetching directory listings for Tracy Barkhausen (listing ID 751531)...");
        // Try various directory listing endpoints
        const endpoints = [
            `${BASE_URL}/api/directorylistings/751531`,
            `${BASE_URL}/api/directorylistings/all?$filter=ContactId eq 4164766`,
            `${BASE_URL}/api/directorylistings/all?$filter=DisplayName contains 'Sunbelt'`,
            `${BASE_URL}/api/directories/all`
        ];

        for (const url of endpoints) {
            console.log(`\n--- Probing: ${url} ---`);
            const data = await fetchJson(url);
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (e) { console.error(e); }
}

run();

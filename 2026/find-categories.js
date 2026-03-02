const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        console.log("Fetching all directories...");
        const dirs = await fetchJson(`${BASE_URL}/api/directories/all`);
        console.log("Directories:", JSON.stringify(dirs, null, 2));

        // Let's also look at all categories
        console.log("\nFetching all categories...");
        const cats = await fetchJson(`${BASE_URL}/api/categories/all`);
        if (cats && (cats.Results || cats.Items)) {
            const list = cats.Results || cats.Items;
            console.log(`Found ${list.length} categories.`);
            console.log("Sample Categories:", JSON.stringify(list.slice(0, 10), null, 2));
        }

    } catch (e) { console.error(e); }
}

run();

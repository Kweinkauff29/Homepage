const API_KEY = process.env.GZ_API_KEY;
if (!API_KEY) {
  throw new Error('Set GZ_API_KEY in the process environment before running this diagnostic.');
}
const BASE_URL = 'https://coconutcoastrealtors.growthzoneapp.com';

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

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
        const id = 4159409; // Sunbelt Title Agency
        console.log("=== Sunbelt Title Agency Categories ===");
        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${id}`);
        console.log(JSON.stringify(orgGen?.Categories, null, 2));
    } catch (e) { console.error(e); }
}

run();

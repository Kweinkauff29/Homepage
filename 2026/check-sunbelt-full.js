const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        const id = 4159409; // Sunbelt Title Agency
        console.log("=== Sunbelt Title Agency Full OrgGeneral ===");
        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${id}`);
        console.log(JSON.stringify(orgGen, null, 2));
    } catch (e) { console.error(e); }
}

run();

const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'ApiKey ' + API_KEY } });
    if (!res.ok) return null;
    return res.json();
}

async function run() {
    try {
        const orgId = 4163688; // Cottrell Title
        const repId = 4164761; // Eric Nagel (found in previous output)

        console.log("=== Cottrell Title OrgGeneral ===");
        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${orgId}`);
        console.log(JSON.stringify(orgGen.Categories, null, 2));

        console.log("\n=== Eric Nagel OrgGeneral ===");
        const repGen = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${repId}`);
        console.log(JSON.stringify(repGen?.Categories, null, 2));

        console.log("\n=== Eric Nagel MoreInfo ===");
        const repMore = await fetchJson(`${BASE_URL}/api/contacts/${repId}/moreinfo`);
        console.log(JSON.stringify(repMore?.Fields?.filter(f => f.Value), null, 2));

    } catch (e) { console.error(e); }
}

run();

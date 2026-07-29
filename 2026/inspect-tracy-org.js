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
        const id = 4164766; // Tracy Barkhausen
        console.log(`Inspecting Tracy Barkhausen (ID: ${id})...`);

        const contact = await fetchJson(`${BASE_URL}/api/contacts/${id}`);
        console.log("Full Contact Object:", JSON.stringify(contact, null, 2));

        const orgId = contact.OrganizationContactId;
        if (orgId) {
            console.log(`\nInspecting Organization (ID: ${orgId})...`);
            const org = await fetchJson(`${BASE_URL}/api/contacts/${orgId}`);
            console.log("Organization Object:", JSON.stringify(org, null, 2));

            const orgCats = await fetchJson(`${BASE_URL}/api/contacts/${orgId}/categories`);
            console.log("Organization Categories:", JSON.stringify(orgCats, null, 2));
        }

        const orgGen = await fetchJson(`${BASE_URL}/api/contacts/${id}/OrgGeneral`);
        console.log("\nTracy OrgGeneral:", JSON.stringify(orgGen, null, 2));

    } catch (e) { console.error(e); }
}

run();

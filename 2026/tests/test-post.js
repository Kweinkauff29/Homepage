const apiKey = process.env.GZ_API_KEY;
if (!apiKey) {
  throw new Error('Set GZ_API_KEY in the process environment before running this diagnostic.');
}
const BASE_URL = 'https://coconutcoastrealtors.growthzoneapp.com';

async function testPost() {
    const res = await fetch(`${BASE_URL}/api/contacts/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + apiKey },
        body: JSON.stringify({ OrganizationContactId: 4163688 })
    });
    if (res.ok) {
        const data = await res.json();
        const results = data.Results || [];
        console.log("Success! Found:", results.length);
        results.forEach(c => console.log(` - ${c.Name} (${c.SystemContactTypeId})`));
    } else {
        console.log(`Failed: ${res.status} ${res.statusText}`);
    }
}
testPost().catch(console.error);

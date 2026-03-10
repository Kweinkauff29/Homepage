const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function testEndpoints() {
    const id = 4163688; // Cottrell
    const endpoints = [
        `/api/contacts/${id}/children`,
        `/api/contacts/${id}/related`,
        `/api/contacts/${id}/individuals`,
        `/api/contacts/${id}/employees`,
        `/api/contacts/?PrimaryOrganizationId=${id}`,
        `/api/contacts/?OrganizationContactId=${id}`
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting ${ep}`);
        const res = await fetch(`${BASE_URL}${ep}`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("Success! Data preview:", JSON.stringify(data).substring(0, 150));
        } else {
            console.log(`Failed: ${res.status} ${res.statusText}`);
        }
    }
}
testEndpoints().catch(console.error);

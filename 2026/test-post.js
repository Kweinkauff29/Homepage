const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

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

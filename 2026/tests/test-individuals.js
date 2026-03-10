
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function testFetchInd() {
    // 4163688 is Cottrell Title
    // Let's try to get all contacts that have OrganizationContactId = 4163688
    // Or try fetching specific endpoints
    const res = await fetch(`${BASE_URL}/api/contacts?$filter=OrganizationContactId eq 4163688`, {
        headers: { 'Authorization': 'ApiKey ' + apiKey }
    });
    const data = await res.json();
    console.log("Individuals for Cottrell Title:", data?.Results?.length);
    if (data?.Results) {
        data.Results.forEach(c => console.log(` - ${c.Name} (${c.ContactType})`));
    }
}
testFetchInd().catch(console.error);

const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function testPost() {
    const ep1 = `${BASE_URL}/api/contacts?$filter=PrimaryOrganizationId eq 4163688`;
    const res1 = await fetch(ep1, { headers: { 'Authorization': 'ApiKey ' + apiKey } });
    if (res1.ok) {
        const data = await res1.json();
        console.log("Filtered by PrimaryOrganizationId eq 4163688:", data.Results?.length, "Total:", data.TotalRecordAvailable);
    }

    // Test the POST search endpoint often used by GZ
    const ep2 = `${BASE_URL}/api/contacts/search`;
    const res2 = await fetch(ep2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + apiKey },
        body: JSON.stringify({
            Criteria: [
                { Field: "OrganizationContactId", Operator: "Equal", Value: "4163688" }
            ]
        })
    });
    if (res2.ok) {
        const data = await res2.json();
        console.log("POST search results:", data.Results?.length);
    } else {
        console.log("POST search failed:", res2.status);
    }
}
testPost().catch(console.error);

const apiKey = process.env.GZ_API_KEY;
const BASE_URL = process.env.GZ_BASE_URL || 'https://coconutcoastrealtors.growthzoneapp.com';

if (!apiKey) {
    throw new Error('Set GZ_API_KEY in your environment before running this test.');
}

async function testFetchIndividuals() {
    // 4163688 is the organization contact ID used by this diagnostic.
    const response = await fetch(`${BASE_URL}/api/contacts?$filter=OrganizationContactId eq 4163688`, {
        headers: { Authorization: `ApiKey ${apiKey}` }
    });
    if (!response.ok) throw new Error(`GrowthZone returned ${response.status}.`);
    const data = await response.json();
    console.log('Individuals for organization:', data?.Results?.length || 0);
    if (data?.Results) {
        data.Results.forEach(contact => console.log(` - ${contact.Name} (${contact.ContactType})`));
    }
}

testFetchIndividuals().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

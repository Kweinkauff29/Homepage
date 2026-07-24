const apiKey = process.env.GZ_API_KEY;
const BASE_URL = process.env.GZ_BASE_URL || 'https://coconutcoastrealtors.growthzoneapp.com';

if (!apiKey) {
    throw new Error('Set GZ_API_KEY in your environment before running this test.');
}

async function testEndpoint(name, url, method = 'GET', body = undefined) {
    try {
        const options = {
            method,
            headers: {
                Authorization: `ApiKey ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(new URL(url, BASE_URL), options);
        if (!response.ok) {
            console.log(`${name} returned ${response.status}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`${name} failed:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('Fetching top 5 active individual contacts to check fields...');
    const contacts = await testEndpoint('Contacts', `/api/contacts?$top=5&$filter=Status eq 'Active' and SystemContactTypeId eq 1`);
    if (!contacts?.Results) {
        console.log('No contacts found.');
        return;
    }

    for (const contact of contacts.Results) {
        const name = contact.Name;
        const contactId = contact.ContactId;
        console.log(`\n--- ${name} (${contactId}) ---`);

        const moreInfo = await testEndpoint(`MoreInfo ${contactId}`, `/api/contacts/${contactId}/moreinfo`);
        if (moreInfo?.Fields) {
            const designation = moreInfo.Fields.find(field => field.DisplayName === 'Designations');
            console.log(designation ? `MoreInfo Designations: ${designation.Value}` : "MoreInfo: No 'Designations' field found.");
        }

        const organization = await testEndpoint(`OrgGeneral ${contactId}`, `/api/contacts/OrgGeneral/${contactId}`);
        if (organization) {
            const groups = organization.Groups || [];
            console.log(groups.length ? `OrgGeneral Groups: ${groups.map(group => group.Name).join(', ')}` : 'OrgGeneral: No Groups.');
            const memberships = organization.Memberships || [];
            console.log(memberships.length ? `OrgGeneral Memberships: ${memberships.map(membership => membership.Name).join(', ')}` : 'OrgGeneral: No Memberships.');
        }
    }
}

runTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

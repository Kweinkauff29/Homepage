const https = require('https');

const API_KEY = process.env.GZ_API_KEY;
const BASE_URL = process.env.GZ_BASE_URL || 'https://coconutcoastrealtors.growthzoneapp.com';

if (!API_KEY) {
    throw new Error('Set GZ_API_KEY in your environment before running this test.');
}

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { Authorization: `ApiKey ${API_KEY}` } }, response => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log('Fetching a few contacts...');
    const response = await fetchJson(`${BASE_URL}/api/contacts?$top=5`);
    const contacts = Array.isArray(response) ? response : (response.Results || response.Items || response.Data || []);
    console.log(`Found ${contacts.length} contacts.`);

    for (const contact of contacts) {
        console.log(`\n\n=== Contact: ${contact.FirstName} ${contact.LastName} (ID: ${contact.ContactId}) ===`);
        console.log('BASE CONTACT FIELDS =>');
        console.log(Object.keys(contact).filter(key => {
            const value = contact[key];
            if (typeof value === 'string' && value.toLowerCase().includes('realtor')) return true;
            if (key.toLowerCase().includes('nrds')) return true;
            if (key.toLowerCase().includes('realtor')) return true;
            return false;
        }).map(key => `${key}: ${contact[key]}`));

        const moreInfo = await fetchJson(`${BASE_URL}/api/contacts/${contact.ContactId}/moreinfo`);
        console.log('MOREINFO =>');
        if (moreInfo?.Fields) console.log(moreInfo.Fields.map(field => `${field.DisplayName}: ${field.Value}`));

        const organization = await fetchJson(`${BASE_URL}/api/contacts/OrgGeneral/${contact.ContactId}`);
        console.log('ORG GENERAL LINKS =>');
        if (organization?.WebPage) console.log('WebPage:', organization.WebPage);
        if (organization?.SocialNetworkLinks) console.log('Social:', organization.SocialNetworkLinks);
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

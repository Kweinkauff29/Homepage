const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function testEndpoint(name, url, method = "GET", body = undefined) {
    try {
        const opts = {
            method,
            headers: {
                'Authorization': `ApiKey ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(new URL(url, BASE_URL), opts);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function runTests() {
    console.log("Fetching top 5 active individual contacts to check fields...");
    const contacts = await testEndpoint('POST Contacts', `/api/contacts?$top=5&$filter=Status eq 'Active' and SystemContactTypeId eq 1`);
    if (!contacts || !contacts.Results) {
        console.log("No contacts found.");
        return;
    }

    for (const c of contacts.Results) {
        const name = c.Name;
        const cid = c.ContactId;
        console.log(`\n--- ${name} (${cid}) ---`);

        // moreinfo
        const more = await testEndpoint(`MoreInfo ${cid}`, `/api/contacts/${cid}/moreinfo`);
        if (more && more.Fields) {
            const desig = more.Fields.find(f => f.DisplayName === 'Designations');
            if (desig) console.log(`MoreInfo Designations: ${desig.Value}`);
            else console.log("MoreInfo: No 'Designations' field found.");
        }

        // OrgGeneral
        const org = await testEndpoint(`OrgGeneral ${cid}`, `/api/contacts/OrgGeneral/${cid}`);
        if (org) {
            const groups = org.Groups || [];
            if (groups.length > 0) {
                console.log(`OrgGeneral Groups: ${groups.map(g => g.Name).join(", ")}`);
            } else {
                console.log("OrgGeneral: No Groups.");
            }
            const mems = org.Memberships || [];
            if (mems.length > 0) {
                console.log(`OrgGeneral Memberships: ${mems.map(m => m.Name).join(", ")}`);
            } else {
                console.log("OrgGeneral: No Memberships.");
            }
        }
    }
}

runTests();

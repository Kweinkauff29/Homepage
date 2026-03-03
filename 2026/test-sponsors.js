
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function test() {
    const AFFILIATE_TYPE_IDS = [10172, 10173, 10503, 23411, 56858, 56859, 56861, 56862, 56863];

    // Get all memberships
    let ids = new Set();
    for (const typeId of AFFILIATE_TYPE_IDS) {
        let skip = 0;
        while (true) {
            const res = await fetch(`${BASE_URL}/api/memberships/all?$skip=${skip}&$top=2000`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + apiKey },
                body: JSON.stringify({ MembershipTypeId: typeId })
            });
            const data = await res.json();
            const results = data.Results || [];
            if (results.length === 0) break;
            results.forEach(m => { if (m.Status === 'Active') ids.add(m.ContactId); });
            skip += results.length;
            if (skip >= (data.TotalRecordAvailable || 0)) break;
        }
    }

    console.log(`Found ${ids.size} affiliate member contact IDs.`);

    // Get contact details for a few
    let all = [];
    let skip = 0;
    while (true) {
        const res = await fetch(`${BASE_URL}/api/contacts?$skip=${skip}&$top=5000`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        const data = await res.json();
        const results = data.Results || [];
        if (results.length === 0) break;

        all = all.concat(results.filter(c => ids.has(c.ContactId) && c.Status === 'Active'));
        skip += results.length;
        if (skip >= data.TotalRecordAvailable) break;
    }

    console.log(`Matched ${all.length} active contacts.`);

    // Check sponsors
    const sponsors = [
        "Sam J. Saad", "State Insurance", "Movement Mortgage", "Chapman Insurance", "Woods", "Weidenmiller",
        "Cottrell", "HouseMaster", "Premium Mortgage", "Lane Insurance", "Hilton Moving", "Lower Mortgage", "Revolution Mortgage",
        "Frame"
    ];

    console.log("\n--- Checking Sponsor Matches ---");
    const matchedSponsors = all.filter(c => sponsors.some(s => (c.Name || '').toLowerCase().includes(s.toLowerCase())));
    matchedSponsors.forEach(c => console.log(`${c.ContactId} | ${c.IsOrganization ? 'ORG' : 'IND'} | ${c.Name} | ${c.PrimaryOrganizationName || 'No Org'}`));

    console.log("\n--- Checking Org/Ind Linking ---");
    const orgs = all.filter(c => c.IsOrganization);
    const inds = all.filter(c => !c.IsOrganization);
    console.log(`Orgs: ${orgs.length}, Inds: ${inds.length}`);

    // Let's grab OrgGeneral for a known Org (e.g., Cottrell)
    const cottrell = all.find(c => c.Name && c.Name.includes("Cottrell"));
    if (cottrell) {
        console.log("\n--- Cottrell Contact Data ---");
        console.log(JSON.stringify(cottrell, null, 2));

        const orgRes = await fetch(`${BASE_URL}/api/contacts/OrgGeneral/${cottrell.ContactId}`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        const orgGeneral = await orgRes.json();
        console.log("\n--- Example OrgGeneral (Cottrell) ---");
        console.log("Employees/Individuals count:", orgGeneral.Individuals?.length);
        if (orgGeneral.Individuals) {
            orgGeneral.Individuals.forEach(ind => console.log(`   - ${ind.FirstName} ${ind.LastName} (ID: ${ind.Id})`));
        }

        const moreRes = await fetch(`${BASE_URL}/api/contacts/${cottrell.ContactId}/moreinfo`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        const moreInfo = await moreRes.json();
        console.log("\n--- MoreInfo ---");
        console.log(JSON.stringify(moreInfo, null, 2));
    }

}
test().catch(console.error);

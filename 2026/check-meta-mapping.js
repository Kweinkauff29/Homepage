const fs = require('fs');

async function check() {
    const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
    const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';
    const CONTACTS_BASE_URL = `${BASE_URL}/api/contacts`;

    const AFFILIATE_TYPE_IDS = [10172, 10173, 10503, 23411, 56858, 56859, 56861, 56862, 56863];

    console.log("Fetching affiliate IDs...");
    const affiliateIds = new Set();
    const promises = AFFILIATE_TYPE_IDS.map(async (typeId) => {
        let skip = 0;
        while (true) {
            const url = `${BASE_URL}/api/memberships/all?$skip=${skip}&$top=2000`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'ApiKey ' + apiKey },
                body: JSON.stringify({ MembershipTypeId: typeId })
            });
            if (!res.ok) break;
            const data = await res.json();
            const results = data.Results || [];
            if (results.length === 0) break;
            results.forEach(m => { if (m.Status === 'Active') affiliateIds.add(m.ContactId); });
            skip += results.length;
            if (skip >= (data.TotalRecordAvailable || 0)) break;
        }
    });
    await Promise.all(promises);

    console.log(`Found ${affiliateIds.size} active affiliate IDs. Fetching details...`);
    let allContacts = [];
    let skip = 0;
    while (true) {
        const res = await fetch(`${CONTACTS_BASE_URL}?$skip=${skip}&$top=5000`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        if (!res.ok) break;
        const data = await res.json();
        const results = data.Results || [];
        if (results.length === 0) break;
        allContacts = allContacts.concat(results.filter(c => affiliateIds.has(c.ContactId) && c.Status === 'Active'));
        skip += data.Results.length;
        if (skip >= data.TotalRecordAvailable) break;
    }

    console.log(`Found ${allContacts.length} active affiliate contacts. Fetching categories...`);

    const META_CATEGORIES = {
        "Title & Escrow": ["Title Company", "Transaction Services", "Association Only"],
        "Mortgage & Finance": ["Mortgage Lender", "Bank", "Accountant", "Wealth Management"],
        "Legal & Insurance": ["Lawyer/Attorney", "Insurance"],
        "Property Inspections": ["Home Inspector", "Appraisers", "Mold/Radon"],
        "Construction & Roofing": ["Construction", "Contractor", "Home Builder", "Renovation", "Roofing", "Windows/Shutters"],
        "Home Maintenance": ["Air Conditioning", "Plumbing", "Painter", "Exterminators", "Disinfecting/Odor Removal"],
        "Moving & Interiors": ["Moving/Packing", "Home Furnishings", "Appliances"],
        "Marketing & Technology": ["Photography/Drone", "Marketing/Advertising", "Internet Solutions", "Wifi", "Coaching", "Real Estate Schools"],
        "Lifestyle & Property": ["Rentals", "Vacation Rentals", "Country Clubs", "Home Watch"]
    };

    const marketingPeople = [];
    const mappingIssues = [];

    // Let's just check the first 50 or so, or batch them.
    for (const c of allContacts) {
        if (!c.IsOrganization) continue; // just organizations for speed
        const orgRes = await fetch(`${BASE_URL}/api/contacts/OrgGeneral/${c.ContactId}`, { headers: { 'Authorization': 'ApiKey ' + apiKey } });
        if (!orgRes.ok) continue;
        const org = await orgRes.json();

        let originalCats = [];
        if (org && org.Categories) {
            org.Categories.forEach(cat => {
                const ln = cat.CategoryListName || '';
                const n = cat.Name || '';
                const filterOut = ['Business Type', 'Business Category', 'Affiliate', 'Board only Affiliate', 'Affiliate Member'];

                if (n) {
                    n.split(';').map(s => s.trim()).forEach(s => {
                        if (s && !filterOut.includes(s)) originalCats.push(s);
                    });
                } else if (ln && !filterOut.includes(ln)) {
                    originalCats.push(ln);
                }
            });
        }
        originalCats = [...new Set(originalCats)];

        const metaCats = new Set();
        originalCats.forEach(cat => {
            let foundMeta = false;
            for (const [meta, specificGroup] of Object.entries(META_CATEGORIES)) {
                if (specificGroup.includes(cat)) {
                    metaCats.add(meta);
                    foundMeta = true;
                    break;
                }
            }
            if (!foundMeta) {
                if (cat.includes('Inspection')) metaCats.add('Property Inspections');
                else {
                    metaCats.add('Lifestyle & Property');
                    mappingIssues.push({ name: c.Name, unmappedCat: cat });
                }
            }
        });

        const metaArray = [...metaCats];
        if (metaArray.includes("Marketing & Technology")) {
            marketingPeople.push({ name: c.Name, originalCats, mappedTo: metaArray });
        }

        // Print progress
        process.stdout.write(".");
    }
    console.log("\nDone!");

    console.log("\n--- People with 'Marketing & Technology' ---");
    console.dir(marketingPeople, { depth: null });

    console.log("\n--- Unmapped Categories assigned to 'Lifestyle & Property' ---");
    const groupedUnmapped = {};
    for (const issue of mappingIssues) {
        groupedUnmapped[issue.unmappedCat] = (groupedUnmapped[issue.unmappedCat] || 0) + 1;
    }
    console.log(groupedUnmapped);
}

check();

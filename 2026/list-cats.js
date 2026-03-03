const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function getCats() {
    const AFFILIATE_TYPE_IDS = [10172, 10173, 10503, 23411, 56858, 56859, 56861, 56862, 56863];
    let ids = new Set();

    // Get all memberships
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

    console.log(`Found ${ids.size} affiliate member contact IDs. Fetching categories...`);
    const cats = new Set();
    const filterOut = ['Business Type', 'Business Category', 'Affiliate', 'Board only Affiliate', 'Affiliate Member'];

    // Process in batches
    const idArray = Array.from(ids);
    for (let i = 0; i < idArray.length; i += 10) {
        const batch = idArray.slice(i, i + 10);
        await Promise.all(batch.map(async id => {
            try {
                const o = await fetch(`${BASE_URL}/api/contacts/OrgGeneral/${id}`, { headers: { 'Authorization': 'ApiKey ' + apiKey } }).then(r => r.json());
                if (o && o.Categories) {
                    o.Categories.forEach(cat => {
                        const ln = cat.CategoryListName || '';
                        const n = cat.Name || '';
                        if (n) {
                            n.split(';').map(s => s.trim()).forEach(s => {
                                if (s && !filterOut.includes(s)) cats.add(s);
                            });
                        } else if (ln && !filterOut.includes(ln)) {
                            cats.add(ln);
                        }
                    });
                }
            } catch (e) { }
        }));
    }

    console.log("Categories:", Array.from(cats).sort());
}
getCats().catch(console.error);

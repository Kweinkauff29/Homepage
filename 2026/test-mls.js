

async function testAgent(name) {
    const API_BASE = 'https://listingsworker.bonitaspringsrealtors.workers.dev/api/v2/OData/bsaor';
    const filter = `contains(MemberFullName, '${name}')`;
    const res = await fetch(`${API_BASE}/Member?$filter=${encodeURIComponent(filter)}&$select=MemberKey,MemberFullName,MemberEmail,MemberStateLicense`);
    const data = await res.json();
    console.log(`Results for ${name}:`);
    console.log(data);
}

testAgent('Renee Malachowski');
testAgent('Dena Wilcoxen');
testAgent('Tyler Butcher');
testAgent('Shawn Simmons');
testAgent('Jack Mancini');

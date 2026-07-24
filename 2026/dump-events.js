const fs = require('fs');

const apiKey = process.env.GZ_API_KEY;
const BASE_URL = 'https://coconutcoastrealtors.growthzoneapp.com';

if (!apiKey) {
    console.error('Set GZ_API_KEY before running this diagnostic.');
    process.exit(1);
}

async function check() {
    try {
        console.log('Fetching /api/events/all?$top=2...');
        const res = await fetch(`${BASE_URL}/api/events/all?$top=2`, {
            headers: { Authorization: 'ApiKey ' + apiKey }
        });
        if (!res.ok) throw new Error(`GrowthZone request failed (${res.status}).`);
        const data = await res.json();
        fs.writeFileSync('events-debug.json', JSON.stringify(data.Results, null, 2));
        console.log('Wrote events payload to events-debug.json');
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}

check();

const fs = require('fs');

const apiKey = process.env.GZ_API_KEY;
const BASE_URL = 'https://coconutcoastrealtors.growthzoneapp.com';
const eventId = process.argv[2];

if (!apiKey) {
    console.error('Set GZ_API_KEY before running this diagnostic.');
    process.exit(1);
}

if (!eventId || !/^\d+$/.test(eventId)) {
    console.error('Pass a numeric event ID, for example: node dump-event-details.js 12345');
    process.exit(1);
}

async function check() {
    try {
        const res = await fetch(`${BASE_URL}/api/events/${eventId}`, {
            headers: { Authorization: 'ApiKey ' + apiKey }
        });
        if (!res.ok) throw new Error(`GrowthZone request failed (${res.status}).`);
        const data = await res.json();
        fs.writeFileSync('event-detail-debug.json', JSON.stringify(data, null, 2));
        console.log('Wrote full event detail to event-detail-debug.json');
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}

check();

const apiKey = process.env.GZ_API_KEY;
const BASE_URL = process.env.GZ_BASE_URL || 'https://coconutcoastrealtors.growthzoneapp.com';

if (!apiKey) {
    throw new Error('Set GZ_API_KEY in your environment before running this test.');
}

async function check() {
    const endpoints = [
        '/api/calendars', '/api/calendar', '/api/calendarevents',
        '/api/eventdetails', '/api/eventgroup/events', '/api/events/all',
        '/api/Events', '/api/event_groups', '/api/v1/events',
        '/api/registration/events', '/api/modules/events',
        '/api/event', '/api/EventGroups', '/api/eventgroups'
    ];
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}?$top=1`, {
                headers: { Authorization: `ApiKey ${apiKey}` }
            });
            if (response.ok) {
                console.log(`SUCCESS! Endpoint found: ${endpoint}`);
                const data = await response.json();
                console.log(JSON.stringify(data, null, 2).slice(0, 500));
                return;
            }
            if (response.status !== 404) console.log(`Endpoint ${endpoint} returned status: ${response.status}`);
        } catch (error) {
            console.error(`Endpoint ${endpoint} failed:`, error.message);
        }
    }
    console.log('None of the tested endpoints worked.');
}

check().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

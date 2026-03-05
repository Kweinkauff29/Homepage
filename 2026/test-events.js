const https = require('https');
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function check() {
    const endpoints = [
        '/api/calendars', '/api/calendar', '/api/calendarevents',
        '/api/eventdetails', '/api/eventgroup/events', '/api/events/all',
        '/api/Events', '/api/event_groups', '/api/v1/events',
        '/api/registration/events', '/api/modules/events',
        '/api/event', '/api/EventGroups', '/api/eventgroups'
    ];
    for (let ep of endpoints) {
        try {
            const res = await fetch(`${BASE_URL}${ep}?$top=1`, {
                headers: { 'Authorization': 'ApiKey ' + apiKey }
            });
            if (res.ok) {
                console.log(`SUCCESS! Endpoint found: ${ep}`);
                const data = await res.json();
                console.log(JSON.stringify(data, null, 2).slice(0, 500));
                return;
            } else if (res.status !== 404) {
                console.log(`Endpoint ${ep} returned status: ${res.status}`);
            }
        } catch (e) { }
    }
    console.log("None of the guessed endpoints worked.");
}
check();

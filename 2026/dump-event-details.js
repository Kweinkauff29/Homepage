const fs = require('fs');
const https = require('https');
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function check() {
    try {
        const res = await fetch(`${BASE_URL}/api/events/128572`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        const data = await res.json();
        fs.writeFileSync('event-detail-debug.json', JSON.stringify(data, null, 2));
        console.log("Wrote full event detail to event-detail-debug.json");
    } catch (e) {
        console.error(e);
    }
}
check();

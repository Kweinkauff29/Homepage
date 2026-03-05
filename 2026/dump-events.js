const fs = require('fs');
const https = require('https');
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function check() {
    try {
        console.log("Fetching /api/events/all?$top=2...");
        const res = await fetch(`${BASE_URL}/api/events/all?$top=2`, {
            headers: { 'Authorization': 'ApiKey ' + apiKey }
        });
        const data = await res.json();
        fs.writeFileSync('events-debug.json', JSON.stringify(data.Results, null, 2));
        console.log("Wrote events payload to events-debug.json");
    } catch (e) {
        console.error(e);
    }
}
check();

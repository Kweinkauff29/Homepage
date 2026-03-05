const fs = require('fs');
const https = require('https');
const apiKey = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
const BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';

async function check() {
    try {
        console.log("Fetching specific event details...");

        let endpoints = [
            `/api/events/128572`,
            `/api/events/all?$filter=EventId eq 128572&$expand=Location`,
            `/api/eventgroups/events/128572`,
            `/api/event/128572`,
            `/api/events/128572/details`
        ];

        for (let ep of endpoints) {
            console.log(`\nTesting: ${ep}`);
            const res = await fetch(`${BASE_URL}${ep}`, {
                headers: { 'Authorization': 'ApiKey ' + apiKey }
            });
            if (res.ok) {
                const data = await res.json();
                console.log(`Success for ${ep}:`);
                console.log(JSON.stringify(data, null, 2).slice(0, 1000));
            } else {
                console.log(`Status: ${res.status}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
check();

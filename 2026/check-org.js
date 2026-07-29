const https = require('https');
const apiKey = process.env.GZ_API_KEY;
if (!apiKey) {
    throw new Error('Set GZ_API_KEY in the process environment before running this diagnostic.');
}
const options = {
    hostname: 'coconutcoastrealtors.growthzoneapp.com',
    port: 443,
    path: '/api/contacts?$top=50&$filter=substringof(%27Bleggi%27,Name)',
    method: 'GET',
    headers: {
        'Authorization': 'ApiKey ' + apiKey
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json.Results.find(c => c.Name.includes('Bleggi')), null, 2));
        } catch (e) { console.log(data); }
    });
});

req.end();

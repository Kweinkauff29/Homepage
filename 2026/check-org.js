const https = require('https');
const options = {
    hostname: 'bonitaspringsesterorealtorsfl.growthzoneapp.com',
    port: 443,
    path: '/api/contacts?$top=50&$filter=substringof(%27Bleggi%27,Name)',
    method: 'GET',
    headers: {
        'Authorization': 'ApiKey cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc'
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

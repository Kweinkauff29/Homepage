const fs = require('fs');
const https = require('https');

const API_USERNAME = 'B9BE9C6F-ABDB-45D6-9DBF-DEFA15DCA76F';
const API_PASSWORD = '';

function fetchBackendData() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.growthzoneapp.com',
            port: 443,
            path: '/api/contacts?tenantId=ecbb0138-08b5-4b0d-b4ef-50d440dbac0e&IsActive=true',
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(API_USERNAME + ':' + API_PASSWORD).toString('base64'),
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    const data = await fetchBackendData();
    const suspectCompanies = ["Leverage 365", "Loan Depot", "Wells Fargo", "David Meiser", "Centennial Mortgage", "Shoppe", "Appraisal"];
    
    // Check their exact Categories array.
    data.forEach(c => {
        let name = c.Name || '';
        let match = suspectCompanies.some(sc => name.toLowerCase().includes(sc.toLowerCase()));
        if (match) {
            console.log("----");
            console.log("Company:", name);
            if (c.ContactCustomDataList && c.ContactCustomDataList[0] && c.ContactCustomDataList[0].ItemValueList) {
                const cats = c.ContactCustomDataList[0].ItemValueList.filter(item => item.ItemId === 64);
                let catNames = cats.map(c => c.Name);
                console.log("Raw Categories:", catNames);
            }
        }
    });
}

run();

const https = require('https');

const terms = [
    "escrow signature pen",
    "mortgage finance money",
    "lawyer gavel courthouse",
    "insurance shield family",
    "home inspection magnifying",
    "construction roofing site",
    "home maintenance hvac",
    "moving boxes furniture",
    "camera drone technology",
    "luxury property golf"
];

const getImages = async () => {
    for (const term of terms) {
        await new Promise((resolve) => {
            const req = https.get(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(term)}&per_page=1`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        console.log(`${term.padEnd(25)}: ${json.results[0].urls.regular}`);
                    } catch (e) {
                        console.log(`${term.padEnd(25)}: Error parsing`);
                    }
                    resolve();
                });
            });
            req.on('error', () => {
                console.log(`${term.padEnd(25)}: HTTP Error`);
                resolve();
            });
        });
    }
}
getImages();

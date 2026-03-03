const https = require('https');

function search(query) {
    https.get(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=3`, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                const results = JSON.parse(data).results;
                console.log(`\n==== ${query} ====`);
                results.forEach(r => console.log(r.urls.raw + '&q=80&w=600&auto=format&fit=crop'));
            } catch(e) {}
        });
    });
}

search('real estate signing keys');
search('scales justice');
search('plumber plumbing repair');

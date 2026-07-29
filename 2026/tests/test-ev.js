const API_KEY = process.env.GZ_API_KEY;
if (!API_KEY) {
  throw new Error('Set GZ_API_KEY in the process environment before running this diagnostic.');
}
fetch('https://coconutcoastrealtors.growthzoneapp.com/api/events/all?$top=50&$orderby=StartDate%20desc', { headers: { 'Authorization': `ApiKey ${API_KEY}` } })
    .then(r => r.json())
    .then(d => {
        const events = d.Results || [];
        const zillow = events.find(e => e.Name && e.Name.includes('Zillow'));
        if (zillow) {
            fetch(`https://coconutcoastrealtors.growthzoneapp.com/api/events/${zillow.EventId}`, { headers: { 'Authorization': `ApiKey ${API_KEY}` } })
            .then(r => r.json())
            .then(det => console.log(JSON.stringify(det, null, 2)));
        }
    })
    .catch(console.error);

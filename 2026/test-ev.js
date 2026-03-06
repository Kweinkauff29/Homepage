const API_KEY = 'cR1djHVMkndNjLbwXyhDyOV7dWPJ6TnufYtcdOHc';
fetch('https://bonitaspringsesterorealtorsfl.growthzoneapp.com/api/events/all?$top=50&$orderby=StartDate%20desc', { headers: { 'Authorization': `ApiKey ${API_KEY}` } })
    .then(r => r.json())
    .then(d => {
        const events = d.Results || [];
        const zillow = events.find(e => e.Name && e.Name.includes('Zillow'));
        if (zillow) {
            fetch(`https://bonitaspringsesterorealtorsfl.growthzoneapp.com/api/events/${zillow.EventId}`, { headers: { 'Authorization': `ApiKey ${API_KEY}` } })
            .then(r => r.json())
            .then(det => console.log(JSON.stringify(det, null, 2)));
        }
    })
    .catch(console.error);

const fs = require('fs');

const eventInfo = { EventId: 1, Name: 'Zillow', Location: 'ONLINE EVENT' };
const detail = {
    Name: 'Zillow Flex Lawsuit',
    Address1: null,
    ZoomConfigured: false,
    GoToWebinarConfigured: false,
    Description: '<p>Test class description.</p>'
};

let locType = "IN-PERSON PHYSICAL";
if (detail.ZoomConfigured || detail.GoToWebinarConfigured) locType = "DIGITAL REMOTE / ZOOM";

let mapEmbedHTML = '';
if (!detail.ZoomConfigured && !detail.GoToWebinarConfigured) {
    const fallbackAddr = '25300 Bernwood Dr, Bonita Springs, FL 34135';
    const fallbackName = 'Bonita Springs Estero Realtors';
    let queryStr = '';
    
    if (detail.Address1) {
        queryStr = `${detail.LocationName ? detail.LocationName + ' ' : ''}${detail.Address1}, ${detail.City}, ${detail.StateProvince} ${detail.PostalCode}`;
    } else if (locType === "IN-PERSON PHYSICAL") {
        queryStr = `${fallbackName} ${fallbackAddr}`;
    }

    if (queryStr) {
        const mapQuery = encodeURIComponent(queryStr);
        mapEmbedHTML = `<iframe src="https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed"></iframe>`;
    }
}

const descHTML = detail.Description ? `<div class="m-description">${mapEmbedHTML}${detail.Description}</div>` : (mapEmbedHTML ? `<div class="m-description">${mapEmbedHTML}</div>` : '');

console.log("Map HTML Result:");
console.log(descHTML);

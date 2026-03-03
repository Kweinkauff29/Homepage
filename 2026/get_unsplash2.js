const https = require('https');

const API_KEY = "Client-ID KEY_NOT_NEEDED_FOR_SOURCE"; // Using unauthenticated image scrape technique
// Wait, `source.unsplash.com` is definitively gone. Let's try to scrape raw web urls from known high-quality images.

/*
To prevent failure, I will hardcode known highly reliable high-quality absolute Unsplash URLs directly instead of relying on fetching. 
These are standard permanent Unsplash IDs.
*/

const goodUrls = {
    "Title & Escrow": "https://images.unsplash.com/photo-1556156653-e5a7c69cc263?auto=format&fit=crop&q=80&w=600",
    "Mortgage & Finance": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600",
    "Legal": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
    "Insurance": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=600",
    "Property Inspections": "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=600",
    "Construction & Roofing": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=600",
    "Home Maintenance": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=600",
    "Moving & Interiors": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600",
    "Marketing & Technology": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
    "Lifestyle & Property": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600"
};
console.log(JSON.stringify(goodUrls, null, 2));

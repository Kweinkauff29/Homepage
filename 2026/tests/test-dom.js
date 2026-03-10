const { JSDOM } = require("jsdom");
const html = `<body><div id="modalBody"></div></body>`;
const dom = new JSDOM(html);
const document = dom.window.document;

const mapQuery = encodeURIComponent('Bonita Springs Estero Realtors 25300 Bernwood Dr, Bonita Springs, FL 34135');
const mapEmbedHTML = `
<div style="border: 2px solid var(--swiss-text); margin-bottom: 24px; background: var(--swiss-grid); padding: 4px;">
    <iframe
        width="100%"
        height="250"
        style="border:0; filter: grayscale(100%) contrast(120%);"
        loading="lazy"
        allowfullscreen
        src="https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed">
    </iframe>
</div>`;

const descHTML = `<div class="m-description">${mapEmbedHTML}</div>`;
document.getElementById('modalBody').innerHTML = descHTML;

console.log(document.getElementById('modalBody').innerHTML);

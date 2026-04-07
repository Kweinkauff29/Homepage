const fs = require('fs');

const htmlB64 = fs.readFileSync('assets_html_b64.txt', 'utf8').trim();
const jsB64 = fs.readFileSync('assets_js_b64.txt', 'utf8').trim();
let wrapJs = fs.readFileSync('2026/Wrap.js', 'utf8');

const htmlStart = 'const EMAIL_BLAST_HTML = decodeB64UTF8("';
const jsStart = 'const EMAIL_BLAST_JS = decodeB64UTF8("';
const endMarker = '");';

let si = wrapJs.indexOf(htmlStart);
if(si !== -1){
  let cs = si + htmlStart.length;
  let ei = wrapJs.indexOf(endMarker, cs);
  if(ei !== -1){ wrapJs = wrapJs.substring(0, cs) + htmlB64 + wrapJs.substring(ei); console.log('Updated HTML'); }
}

si = wrapJs.indexOf(jsStart);
if(si !== -1){
  let cs = si + jsStart.length;
  let ei = wrapJs.indexOf(endMarker, cs);
  if(ei !== -1){ wrapJs = wrapJs.substring(0, cs) + jsB64 + wrapJs.substring(ei); console.log('Updated JS'); }
}

fs.writeFileSync('2026/Wrap.js', wrapJs);
console.log('Done');

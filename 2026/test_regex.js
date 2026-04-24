const fs = require('fs');
let c = fs.readFileSync('AboutPage_test.html', 'utf8');

const regex1 = /[\s\n]*<style>[\s\S]*?ber-global-wave-bg[\s\S]*?aria-hidden="true">[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<\/div>[\s\n]*/i;
const match1 = c.match(regex1);
if (match1) {
    console.log('Match 1 (with aria-hidden="true") found! Length:', match1[0].length);
} else {
    console.log('No match 1');
}

// In case some were generated without aria-hidden="true" (earlier iteration)
const regex2 = /[\s\n]*<style>[\s\S]*?ber-global-wave-bg[\s\S]*?class="ber-global-wave-bg">[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<div class="ber-wave"><\/div>[\s\n]*<\/div>[\s\n]*/i;
const match2 = c.match(regex2);
if (match2) {
    console.log('Match 2 (without aria-hidden) found! Length:', match2[0].length);
} else {
    console.log('No match 2');
}

import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./AFFILIATEDIRECTORY.html', import.meta.url), 'utf8');
const checks = [
  ['uses secured Member Hub directory API', source.includes('ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory') && source.includes("type:'affiliate'")],
  ['contains no embedded GrowthZone API key declaration', !/GROWTHZONE_API_KEY|API_KEY\s*=|apiKey\s*[:=]/i.test(source)],
  ['contains no browser Authorization header', !/Authorization\s*:/i.test(source) && !/ApiKey\s+/i.test(source)],
  ['contains no direct GrowthZone request', !/growthzoneapp\.com\/api\//i.test(source)],
  ['supports secured list and detail routes', source.includes('`${API}?${queryString()}`') && source.includes('`${API}/${encodeURIComponent(contactId)}?type=affiliate`')],
  ['supports search and public filters', source.includes('id="search"') && source.includes('id="category"') && source.includes('id="city"') && source.includes('id="language"')],
  ['supports pagination', source.includes('id="pagination"') && source.includes('data-page')],
  ['supports full public profile media', source.includes('profile.gallery') && source.includes('profile.youtube') && source.includes('profile.documents')],
  ['escapes dynamic HTML', source.includes('const escapeHtml=') && source.includes('safeUrl') && source.includes('safeEmail')],
  ['external links isolate opener', source.includes('rel="noopener"')],
  ['responsive layouts exist', source.includes('@media(max-width:900px)') && source.includes('@media(max-width:620px)')],
  ['error and empty states exist', source.includes('Directory temporarily unavailable') && source.includes('No Affiliate members match these filters')]
];

const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failed.length) throw new Error(`Affiliate directory checks failed: ${failed.join(', ')}`);
console.log(`Validated ${checks.length} secured Affiliate directory, credential-isolation, public-profile, accessibility, and responsive safeguards.`);

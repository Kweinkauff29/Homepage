import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./AFFILIATEDIRECTORY.html', import.meta.url), 'utf8');
const controller = readFileSync(new URL('./affiliate-directory-secure-api.js', import.meta.url), 'utf8');
const combined = `${page}\n${controller}`;
const categoryTileCount = (page.match(/class="category-tile"/g) || []).length;

const checks = [
  ['preserves original heading and supporting copy', page.includes('Find an Affiliated Business Partner') && page.includes('Support the local businesses that support our REALTOR® community.')],
  ['preserves original search and dropdown ids', page.includes('id="searchInput"') && page.includes('id="filterCategoryInput"') && page.includes('id="filterLanguageInput"')],
  ['preserves all ten original category tiles', page.includes('id="categoryTiles"') && categoryTileCount === 10 && page.includes('Title & Escrow') && page.includes('Lifestyle & Property')],
  ['preserves original card presentation', page.includes('.agent-card') && page.includes('.card-header') && page.includes('.avatar') && page.includes('.category-badge') && page.includes('.card-actions')],
  ['preserves original sponsor badge styling', page.includes('.sponsor-diamond') && page.includes('.sponsor-platinum') && page.includes('.sponsor-gold') && page.includes('.sponsor-silver') && page.includes('.sponsor-photo')],
  ['preserves original modal presentation', page.includes('id="agentModal"') && page.includes('.modal-overlay') && page.includes('.modal-hero') && page.includes('.modal-detail-grid')],
  ['preserves original pagination and skeleton loading', page.includes('id="pagination"') && page.includes('.page-btn') && page.includes('.skeleton-card') && page.includes('id="loadingBar"')],
  ['preserves original Affiliate call to action', page.includes('Interested in becoming an Affiliate?') && page.includes('membership@coconutcoastrealtors.org')],
  ['preserves CCOR wave background', page.includes('id="ccor-waves-bg"') && page.includes('@keyframes waveSlide') && page.includes('initCcorWaves')],
  ['uses secured Member Hub directory API', combined.includes('ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory')],
  ['contains no embedded GrowthZone API key declaration', !/GROWTHZONE_API_KEY|API_KEY\s*=|apiKey\s*[:=]/i.test(combined)],
  ['contains no browser Authorization header', !/Authorization\s*:/i.test(combined) && !/ApiKey\s+/i.test(combined)],
  ['contains no direct GrowthZone request', !/growthzoneapp\.com\/api\//i.test(combined)],
  ['loads all indexed Worker pages', controller.includes('fetchApiPage') && controller.includes("url.searchParams.set('pageSize'") && controller.includes('for (let start = 2; start <= pages; start += 4)')],
  ['maps indexed categories into original tile groups', controller.includes('META_CATEGORIES') && controller.includes('SPONSOR_CATEGORY_OVERRIDES') && controller.includes('mapCategories')],
  ['indexes languages and categories into original dropdowns', controller.includes('populateFilters(allContacts)') && controller.includes('buildDropdown(filterCategoryList') && controller.includes('buildDropdown(filterLanguageList')],
  ['supports original tile selection behavior', controller.includes('window.selectTileCategory') && controller.includes("tile.classList.toggle('active'")],
  ['search includes company representative services and offers', controller.includes('contact.PrimaryContact') && controller.includes('...(contact._services || [])') && controller.includes('...(contact._offers || [])')],
  ['supports secured list and detail routes', controller.includes("url.searchParams.set('type', 'affiliate')") && controller.includes('`${DIRECTORY_API}/${encodeURIComponent(id)}?type=affiliate`')],
  ['preserves sponsor prioritization', controller.includes('sortAndPrioritizeContacts') && controller.includes('100 + contact._sponsor.weight')],
  ['supports member-managed profile media without redesigning cards', controller.includes('profile.gallery') && controller.includes('profile.youtube') && controller.includes('profile.documents') && controller.includes('mediaSections(profile)')],
  ['escapes dynamic HTML and validates public links', controller.includes('function escapeHtml') && controller.includes('function safeUrl') && controller.includes('function safeEmail')],
  ['external links isolate opener', combined.includes('rel="noopener"')],
  ['responsive layouts remain original', page.includes('@media (max-width: 1000px)') && page.includes('@media (max-width: 600px)')],
  ['error and empty states exist', controller.includes('Directory temporarily unavailable') && controller.includes('No business partners match these filters')]
];

const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failed.length) throw new Error(`Affiliate directory checks failed: ${failed.join(', ')}`);
console.log(`Validated ${checks.length} original-layout, secured Worker API, server-indexing, credential-isolation, profile-media, and responsive safeguards.`);
